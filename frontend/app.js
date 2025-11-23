// ============================================
// 1. CONFIGURATION & STATE
// ============================================
const API = {
    USER: 'http://localhost/api/users',
    PRODUCT: 'http://localhost/api/products',
    ORDER: 'http://localhost/api/orders',
    PAYMENT: 'http://localhost/api/payments',
    // URL gốc để load ảnh từ Product Service (Port 8002)
    IMAGE_BASE: 'http://localhost:8002' 
};

let currentUser = null;
let token = null;
let allRestaurants = [];

// [FIX] 1. Load giỏ hàng từ LocalStorage để không bị mất khi F5
let cart = JSON.parse(localStorage.getItem('drone_cart')) || [];

// Hàm lưu giỏ hàng
function saveCart() {
    localStorage.setItem('drone_cart', JSON.stringify(cart));
    updateNavbar();
}

// Helper lấy ảnh chuẩn
function getImageUrl(path) {
    if (!path) return 'https://via.placeholder.com/150?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${API.IMAGE_BASE}${path}`;
}

// ============================================
// 2. FETCH WITH ERROR HANDLING
// ============================================

async function fetchAPI(url, options = {}) {
    try {
        const headers = {
            ...options.headers
        };

        // Nếu không phải gửi File (FormData) thì mặc định là JSON
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
            mode: 'cors',
            credentials: 'same-origin'
        });

        console.log(`📡 [${options.method || 'GET'}] ${url} -> ${response.status}`);

        if (!response.ok) {
            let errorMsg;
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                errorMsg = errorData.detail || errorData.message || `HTTP ${response.status}`;
            } catch {
                errorMsg = errorText || `HTTP ${response.status}`;
            }
            console.error(`🔥 Server Error:`, errorMsg);
            
            // Nếu lỗi 401 (Hết hạn token) -> Logout
            if (response.status === 401) {
                handleLogout();
            }
            throw new Error(errorMsg);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ API Error: ${url}`, error);
        throw error;
    }
}

// ============================================
// 3. NAVIGATION & UI
// ============================================

window.navigateTo = function(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    let targetId = pageId;
    if (!pageId.endsWith('Page') && !pageId.endsWith('Dashboard')) {
        targetId = pageId.includes('Dashboard') ? pageId : pageId + 'Page';
    }

    const targetPage = document.getElementById(targetId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
        
        if (pageId === 'orders') loadOrders();
        if (pageId === 'restaurants') loadRestaurants();
        if (pageId === 'adminDashboard') loadAdminData();
        // [FIX] Gọi đúng hàm load dữ liệu quản lý nhà hàng
        if (pageId === 'restaurantDashboard') loadRestaurantData();
        if (pageId === 'checkoutPage') loadCheckoutPage(); // Load data cho trang thanh toán
    } else {
        console.error(`Page not found: ${targetId}`);
    }
}

window.openCart = function() {
    document.getElementById('cartModal').classList.add('active');
    renderCart();
}

window.closeCart = function() {
    document.getElementById('cartModal').classList.remove('active');
}

// ============================================
// 4. INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateNavbar(); // Update số lượng giỏ hàng ngay khi load
    
    // Nếu đang ở trang chủ
    if (!currentUser || currentUser.role !== 'admin') {
        loadPopularDishes();
    }
    setupEventListeners();
});

function checkAuth() {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('userData');
    
    if (storedToken && storedUser) {
        token = storedToken;
        currentUser = JSON.parse(storedUser);
    }
    updateNavbar();
}

function updateNavbar() {
    const menuContainer = document.getElementById('navbarMenu');
    const actionsContainer = document.getElementById('navbarActions');
    
    if (!menuContainer || !actionsContainer) return;

    let menuHtml = '';

    if (currentUser && currentUser.role === 'admin') {
        menuHtml = `<a href="#" onclick="navigateTo('adminDashboard'); return false;" class="nav-link">Quản trị hệ thống</a>`;
    } else {
        menuHtml = `
            <a href="#" onclick="navigateTo('home'); return false;" class="nav-link">Trang chủ</a>
            <a href="#" onclick="navigateTo('restaurants'); return false;" class="nav-link">Nhà hàng</a>
        `;

        if (currentUser) {
            menuHtml += `<a href="#" onclick="navigateTo('orders'); return false;" class="nav-link">Đơn hàng</a>`;
            
            if (currentUser.role === 'restaurant') {
                menuHtml += `<a href="#" onclick="navigateTo('restaurantDashboard'); return false;" class="nav-link">Quản lý</a>`;
            }
        }
    }

    menuContainer.innerHTML = menuHtml;

    if (currentUser) {
        let cartHtml = '';
        if (currentUser.role !== 'admin') {
            cartHtml = `
            <div class="cart-btn-wrapper" onclick="openCart()" style="cursor: pointer; margin-right: 15px; position: relative;">
                <span style="font-size: 24px;">🛒</span>
                <span class="badge" id="cartCount" style="background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 12px; position: absolute; top: -5px; right: -10px;">
                    ${cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
            </div>`;
        }

        actionsContainer.innerHTML = `
            ${cartHtml}
            <div class="user-dropdown">
                <span>Xin chào, <b>${currentUser.full_name || currentUser.username}</b></span>
                <button class="btn btn-sm btn-outline" onclick="handleLogout()">Đăng xuất</button>
            </div>
        `;
    } else {
        actionsContainer.innerHTML = `
            <button class="btn btn-text" onclick="navigateTo('login')">Đăng nhập</button>
            <button class="btn btn-primary" onclick="navigateTo('register')">Đăng ký</button>
        `;
    }
}

// ============================================
// 5. AUTHENTICATION
// ============================================

window.handleLogin = async function(e) {
    e.preventDefault();
    showLoading(true);

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API.USER}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
            mode: 'cors'
        });

        if (!response.ok) throw new Error('Sai tài khoản hoặc mật khẩu');

        const data = await response.json();
        
        token = data.access_token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('userData', JSON.stringify(currentUser));

        showToast('✅ Đăng nhập thành công!', 'success');
        updateNavbar();
        
        if (currentUser.role === 'admin') {
            navigateTo('adminDashboard');
        } else if (currentUser.role === 'restaurant') {
            navigateTo('restaurantDashboard');
        } else {
            navigateTo('home');
        }

    } catch (error) {
        showToast('❌ ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.handleLogout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    token = null;
    currentUser = null;
    // [FIX] Không xóa cart khi logout để trải nghiệm tốt hơn, hoặc tùy bạn
    // cart = []; 
    updateNavbar();
    navigateTo('home');
    showToast('Đã đăng xuất', 'info');
}

// ... (Code Register giữ nguyên) ...

// ============================================
// 6. RESTAURANTS & PRODUCTS
// ============================================

// ... (Code loadPopularDishes giữ nguyên) ...

async function loadRestaurants() {
    showLoading(true);
    try {
        const restaurants = await fetchAPI(`${API.USER}/restaurants`);
        allRestaurants = restaurants; // Lưu lại để filter

        // [IMAGE] Cập nhật render ảnh nhà hàng
        renderRestaurantsList(restaurants);
    } catch (error) {
        showToast('❌ Lỗi tải nhà hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function renderRestaurantsList(data) {
    const container = document.getElementById('restaurantsList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px;">Chưa có nhà hàng nào</p>';
        return;
    }

    container.innerHTML = data.map(r => `
        <div class="restaurant-row" style="display: flex; gap: 20px; background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <div class="res-img" style="width: 120px; height: 120px; background: #eee; border-radius: 8px; overflow: hidden;">
                <img src="${getImageUrl(r.restaurant_image)}" style="width:100%; height:100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'">
            </div>
            <div class="res-info" style="flex: 1;">
                <h2>${r.restaurant_name || r.username}</h2>
                <p>${r.restaurant_description || 'Không có mô tả'}</p>
                <p>📍 ${r.city || 'Hồ Chí Minh'}</p>
                <button class="btn btn-primary" onclick="viewRestaurant(${r.id})">Xem thực đơn</button>
            </div>
        </div>
    `).join('');
}

window.viewRestaurant = async function(restaurantId) {
    showLoading(true);
    try {
        const restaurant = await fetchAPI(`${API.USER}/restaurants/${restaurantId}`);
        const products = await fetchAPI(`${API.PRODUCT}/products/restaurant/${restaurantId}`);

        const header = document.getElementById('restaurantHeader');
        if (header) {
            header.innerHTML = `
                <h1>${restaurant.restaurant_name || 'Restaurant'}</h1>
                <p>${restaurant.restaurant_description || 'Welcome!'}</p>
            `;
        }

        const list = document.getElementById('productsList');
        if (list) {
            list.innerHTML = products.map(p => `
                <div class="product-card" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="height: 150px; background: #f8f9fa; overflow: hidden;">
                        <img src="${getImageUrl(p.image_url)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <div style="padding: 15px;">
                        <h3>${p.name}</h3>
                        <p style="color: #666; font-size: 13px;">${p.description || ''}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <span style="font-weight: bold; color: #FF6B6B;">${formatCurrency(p.price)}</span>
                            <button class="btn btn-sm btn-outline" onclick="addToCart(${p.id}, '${p.name}', ${p.price}, ${restaurantId})">
                                + Thêm
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        navigateTo('restaurantDetailPage');
    } catch (error) {
        showToast('❌ Không thể tải: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// 7. CART & CHECKOUT (ĐÃ SỬA)
// ============================================

window.addToCart = function(id, name, price, resId) {
    if (!currentUser) {
        showToast('⚠️ Vui lòng đăng nhập để đặt món', 'warning');
        navigateTo('login');
        return;
    }

    // Check nhà hàng
    if(cart.length > 0 && cart[0].restaurant_id !== resId) {
        if(!confirm("Bạn đang chọn món của nhà hàng khác. Tạo giỏ hàng mới?")) return;
        cart = [];
    }

    const existing = cart.find(item => item.product_id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            product_id: id,
            product_name: name,
            price: price,
            quantity: 1,
            restaurant_id: resId
        });
    }
    
    saveCart(); // [FIX] Lưu ngay
    showToast(`✅ Đã thêm ${name}`, 'success');
}

window.updateQuantity = function(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    saveCart(); // [FIX] Lưu ngay
    renderCart();
}

function renderCart() {
    const body = document.getElementById('cartBody');
    const totalEl = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        body.innerHTML = '<p class="text-center">Giỏ hàng trống</p>';
        totalEl.innerText = '0đ';
        return;
    }

    let total = 0;
    body.innerHTML = cart.map((item, index) => {
        total += item.price * item.quantity;
        return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div>
                    <b>${item.product_name}</b><br>
                    <small>${formatCurrency(item.price)} x ${item.quantity}</small>
                </div>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="btn btn-sm" onclick="updateQuantity(${index}, -1)">−</button>
                    <span>${item.quantity}</span>
                    <button class="btn btn-sm" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
            </div>
        `;
    }).join('');
    
    totalEl.innerText = formatCurrency(total);
}

// [FIX] Hàm chuyển sang trang thanh toán (Thay vì prompt)
window.proceedToCheckout = function() {
    if (cart.length === 0) {
        showToast('⚠️ Giỏ hàng trống', 'warning');
        return;
    }
    closeCart();
    navigateTo('checkoutPage');
}

// [FIX] Hàm load dữ liệu vào trang Checkout
function loadCheckoutPage() {
    // Fill User info
    if(currentUser) {
        const nameInput = document.getElementById('checkoutName');
        const phoneInput = document.getElementById('checkoutPhone');
        const addrInput = document.getElementById('checkoutAddress');
        if(nameInput) nameInput.value = currentUser.full_name || currentUser.username;
        if(phoneInput) phoneInput.value = currentUser.phone || '';
        if(addrInput) addrInput.value = currentUser.address || '';
    }

    // Render Items
    const itemsContainer = document.getElementById('checkoutItems');
    const totalEl = document.getElementById('checkoutTotal');
    
    if(itemsContainer) {
        let total = 0;
        itemsContainer.innerHTML = cart.map(item => {
            total += item.price * item.quantity;
            return `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span>${item.quantity}x ${item.product_name}</span>
                    <span>${formatCurrency(item.price * item.quantity)}</span>
                </div>
            `;
        }).join('');
        if(totalEl) totalEl.innerText = formatCurrency(total);
    }
}

// [FIX] Hàm Xử lý thanh toán mới (Gửi sang Order và Payment)
window.handleConfirmPayment = async function(event) {
    event.preventDefault();
    
    const address = document.getElementById('checkoutAddress').value;
    const phone = document.getElementById('checkoutPhone').value;
    // Radio input
    const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'cod';

    if (!address || !phone) {
        showToast('⚠️ Vui lòng nhập địa chỉ và SĐT', 'warning');
        return;
    }

    showLoading(true);
    try {
        const restaurantId = cart[0].restaurant_id;
        const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // 1. Tạo Order
        const orderData = {
            restaurant_id: restaurantId,
            delivery_address: address,
            items: cart.map(i => ({
                product_id: i.product_id,
                product_name: i.product_name,
                quantity: i.quantity,
                price: i.price
            }))
        };

        const orderResponse = await fetchAPI(`${API.ORDER}/orders`, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        // 2. Tạo Payment
        await fetchAPI(`${API.PAYMENT}/payments`, {
            method: 'POST',
            body: JSON.stringify({
                order_id: orderResponse.id,
                amount: totalAmount,
                payment_method: paymentMethod
            })
        });

        // 3. Thành công
        showToast('✅ Đặt hàng thành công!', 'success');
        cart = [];
        saveCart(); // Xóa trong storage
        navigateTo('orders');

    } catch (error) {
        showToast('❌ Lỗi đặt hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// 8. ORDERS & DASHBOARD
// ============================================

// ... (loadOrders giữ nguyên) ...

// [FIX] Hàm load Dashboard cho Nhà hàng (Hiển thị món ăn)
async function loadRestaurantData() {
    if (!currentUser || currentUser.role !== 'restaurant') return;
    
    console.log('Loading restaurant dashboard...');
    const container = document.getElementById('restaurantProductsList');
    const infoContainer = document.getElementById('restaurantInfoForm');
    
    // 1. Hiển thị thông tin nhà hàng
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="card" style="padding:20px; background:white;">
                <h3>${currentUser.restaurant_name || 'Chưa đặt tên nhà hàng'}</h3>
                <p>${currentUser.restaurant_description || ''}</p>
            </div>
        `;
    }

    // 2. Load danh sách món ăn của chính nhà hàng này
    try {
        // Giả sử API Product hỗ trợ lấy theo restaurant_id. 
        // Vì User ID chính là Restaurant ID trong logic của bạn
        const products = await fetchAPI(`${API.PRODUCT}/products/restaurant/${currentUser.id}`);
        
        if (container) {
            if (products.length === 0) {
                container.innerHTML = '<p>Chưa có món ăn nào. Hãy thêm món mới!</p>';
            } else {
                container.innerHTML = `
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:20px;">
                    ${products.map(p => `
                        <div class="product-card" style="border:1px solid #eee; padding:10px; border-radius:8px;">
                            <img src="${getImageUrl(p.image_url)}" style="width:100%; height:120px; object-fit:cover;">
                            <h4>${p.name}</h4>
                            <p>${formatCurrency(p.price)}</p>
                            <p style="color:green;">${p.is_available ? 'Đang bán' : 'Hết hàng'}</p>
                        </div>
                    `).join('')}
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error(e);
        if(container) container.innerHTML = '<p>Lỗi tải món ăn</p>';
    }
}

// [FIX] Hàm submit thêm món ăn (Có upload ảnh)
async function handleProductSubmit(event) {
    event.preventDefault();

    // Lấy dữ liệu
    const name = document.getElementById('prodName').value;
    const desc = document.getElementById('prodDesc').value;
    const price = document.getElementById('prodPrice').value;
    const time = document.getElementById('prodTime').value;
    const category = document.getElementById('prodCategory').value;
    // [FIX] Lấy file ảnh (cần thêm input id="prodImage" vào HTML modal nếu chưa có)
    const imageInput = document.getElementById('prodImage'); 

    if (!currentUser || currentUser.role !== 'restaurant') {
        showToast('❌ Lỗi quyền hạn', 'error');
        return;
    }

    // Tạo FormData
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', desc);
    formData.append('price', price);
    formData.append('preparation_time', time);
    formData.append('category', category);
    formData.append('restaurant_id', currentUser.id); // ID user là ID nhà hàng

    if (imageInput && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    showLoading(true);
    try {
        const response = await fetch(`${API.PRODUCT}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Không set Content-Type, để browser tự set boundary
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }

        showToast('✅ Thêm món thành công!', 'success');
        closeModal('addProductModal');
        document.getElementById('productForm').reset();
        
        loadRestaurantData(); // Reload lại list

    } catch (error) {
        console.error(error);
        showToast('❌ Lỗi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Utility Functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.background = type === 'success' ? '#4caf50' : '#f44336';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.marginTop = '10px';
    toast.style.borderRadius = '5px';
    toast.innerText = msg;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatCurrency(val) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

window.showModal = (id) => document.getElementById(id).style.display = 'block';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}