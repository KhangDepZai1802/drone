

async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch("http://localhost/api/users/token", {
        method: "POST",
        body: formData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error("Login failed: " + err);
    }

    const data = await response.json();
    return data;
}

async function fetchAPI(url, options = {}) {
    try {
        const headers = { ...options.headers };
        
        if (!(options.body instanceof FormData) && !options.headers?.['Content-Type']) {
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
            const errorText = await response.text();
            let errorMsg;
            try {
                const errorData = JSON.parse(errorText);
                errorMsg = errorData.detail || errorData.message || `HTTP ${response.status}`;
            } catch {
                errorMsg = errorText || `HTTP ${response.status}`;
            }
            
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
// NAVIGATION
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
        
        // Load data khi chuyển trang
        if (pageId === 'orders') loadOrders();
        if (pageId === 'restaurants') loadRestaurants();
        if (pageId === 'adminDashboard') loadAdminData();
        if (pageId === 'restaurantDashboard') loadRestaurantData();
        if (pageId === 'checkoutPage') loadCheckoutPage();
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
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateNavbar();
    
    if (!currentUser || currentUser.role !== 'admin') {
        loadPopularDishes();
    }
    
    // Event listeners cho forms
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
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
        // [FIX] Chỉ hiển thị giỏ hàng cho customer
        let cartHtml = '';
        if (currentUser.role === 'customer') {
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
// AUTHENTICATION
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

window.handleRegister = async function(e) {
    e.preventDefault();
    showLoading(true);

    try {
        const registerData = {
            full_name: document.getElementById('regFullName').value,
            phone: document.getElementById('regPhone').value,
            email: document.getElementById('regEmail').value,
            username: document.getElementById('regUsername').value,
            password: document.getElementById('regPassword').value,
            role: document.getElementById('regRole')?.value || 'customer'
        };

        // Nếu đăng ký làm nhà hàng
        if (registerData.role === 'restaurant') {
            registerData.restaurant_name = document.getElementById('regRestaurantName')?.value || registerData.full_name;
            registerData.restaurant_description = document.getElementById('regRestaurantDesc')?.value || '';
        }

        const response = await fetch(`${API.USER}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Đăng ký thất bại');
        }

        showToast('✅ Đăng ký thành công! Vui lòng đăng nhập.', 'success');
        navigateTo('login');

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
    updateNavbar();
    navigateTo('home');
    showToast('Đã đăng xuất', 'info');
}

// ============================================
// RESTAURANTS & PRODUCTS
// ============================================
async function loadPopularDishes() {
    try {
        const restaurants = await fetchAPI(`${API.USER}/restaurants`);
        const container = document.getElementById('popularRestaurants');
        
        if (!container) return;
        
        const topRestaurants = restaurants.slice(0, 4);
        
        container.innerHTML = topRestaurants.map(r => `
            <div class="restaurant-card" onclick="viewRestaurant(${r.id})">
                <div class="card-image">
                    <img src="${getImageUrl(r.restaurant_image)}" alt="${r.restaurant_name}" onerror="this.src='https://via.placeholder.com/300x200?text=Restaurant'">
                </div>
                <div class="card-body">
                    <h3>${r.restaurant_name || r.username}</h3>
                    <p>${r.restaurant_description || 'Nhà hàng chất lượng'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <span>⭐ ${r.rating || 5.0}</span>
                        <span>📍 ${r.city || 'TP.HCM'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading popular dishes:', error);
    }
}

async function loadRestaurants() {
    showLoading(true);
    try {
        const restaurants = await fetchAPI(`${API.USER}/restaurants`);
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
        <div class="restaurant-row" style="display: flex; gap: 20px; background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; cursor: pointer;" onclick="viewRestaurant(${r.id})">
            <div class="res-img" style="width: 120px; height: 120px; background: #eee; border-radius: 8px; overflow: hidden;">
                <img src="${getImageUrl(r.restaurant_image)}" style="width:100%; height:100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'">
            </div>
            <div class="res-info" style="flex: 1;">
                <h2>${r.restaurant_name || r.username}</h2>
                <p>${r.restaurant_description || 'Không có mô tả'}</p>
                <p>📍 ${r.city || 'Hồ Chí Minh'}</p>
                <button class="btn btn-primary" onclick="event.stopPropagation(); viewRestaurant(${r.id})">Xem thực đơn</button>
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
            if (products.length === 0) {
                list.innerHTML = '<p style="text-align: center; padding: 40px;">Nhà hàng chưa có món ăn nào</p>';
            } else {
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
                                ${currentUser && currentUser.role === 'customer' ? `
                                    <button class="btn btn-sm btn-outline" onclick="addToCart(${p.id}, '${p.name}', ${p.price}, ${restaurantId})">
                                        + Thêm
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        navigateTo('restaurantDetailPage');
    } catch (error) {
        showToast('❌ Không thể tải: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// CART & CHECKOUT
// ============================================
window.addToCart = function(id, name, price, resId) {
    // [FIX] Kiểm tra user phải là customer
    if (!currentUser) {
        showToast('⚠️ Vui lòng đăng nhập để đặt món', 'warning');
        navigateTo('login');
        return;
    }

    if (currentUser.role !== 'customer') {
        showToast('⚠️ Chỉ khách hàng mới có thể đặt món', 'warning');
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
    
    saveCart();
    showToast(`✅ Đã thêm ${name}`, 'success');
}

window.updateQuantity = function(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
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

window.proceedToCheckout = function() {
    if (cart.length === 0) {
        showToast('⚠️ Giỏ hàng trống', 'warning');
        return;
    }
    closeCart();
    navigateTo('checkoutPage');
}

function loadCheckoutPage() {
    if(currentUser) {
        const nameInput = document.getElementById('checkoutName');
        const phoneInput = document.getElementById('checkoutPhone');
        const addrInput = document.getElementById('checkoutAddress');
        if(nameInput) nameInput.value = currentUser.full_name || currentUser.username;
        if(phoneInput) phoneInput.value = currentUser.phone || '';
        if(addrInput) addrInput.value = currentUser.address || '';
    }

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

window.handleConfirmPayment = async function(event) {
    event.preventDefault();
    
    const address = document.getElementById('checkoutAddress').value;
    const phone = document.getElementById('checkoutPhone').value;
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

        showToast('✅ Đặt hàng thành công!', 'success');
        cart = [];
        saveCart();
        navigateTo('orders');

    } catch (error) {
        showToast('❌ Lỗi đặt hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    if (!currentUser) {
        showToast('⚠️ Vui lòng đăng nhập', 'warning');
        navigateTo('login');
        return;
    }

    showLoading(true);
    try {
        const orders = await fetchAPI(`${API.ORDER}/orders`);
        
        const container = document.getElementById('ordersList');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px;">Chưa có đơn hàng nào</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-card" style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <div>
                        <h3>Đơn hàng #${order.id}</h3>
                        <p style="color: #666; font-size: 14px;">${new Date(order.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <span class="badge" style="background: ${getStatusColor(order.status)}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold;">
                        ${getStatusText(order.status)}
                    </span>
                </div>
                <div style="margin-bottom: 15px;">
                    ${(order.items || []).map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                            <span>${item.quantity}x ${item.product_name}</span>
                            <span>${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #eee; padding-top: 10px;">
                    <div>
                        <strong>Tổng:</strong> <span style="color: #FF6B6B; font-size: 20px; font-weight: bold;">${formatCurrency(order.total_amount)}</span>
                    </div>
                    ${order.drone_id ? `<span style="color: #4CAF50;">🚁 Drone #${order.drone_id}</span>` : ''}
                </div>
                <p style="margin-top: 10px; color: #666;">📍 ${order.delivery_address}</p>
            </div>
        `).join('');

    } catch (error) {
        showToast('❌ Lỗi tải đơn hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function getStatusColor(status) {
    const colors = {
        'pending': '#FFA726',
        'confirmed': '#42A5F5',
        'preparing': '#AB47BC',
        'ready': '#66BB6A',
        'in_delivery': '#29B6F6',
        'delivered': '#66BB6A',
        'cancelled': '#EF5350'
    };
    return colors[status] || '#999';
}

function getStatusText(status) {
    const texts = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'preparing': 'Đang chuẩn bị',
        'ready': 'Sẵn sàng',
        'in_delivery': 'Đang giao',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy'
    };
    return texts[status] || status;
}

// ============================================
// RESTAURANT DASHBOARD
// ============================================
async function loadRestaurantData() {
    if (!currentUser || currentUser.role !== 'restaurant') return;
    
    const container = document.getElementById('restaurantProductsList');
    const infoContainer = document.getElementById('restaurantInfoForm');
    
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="card" style="padding:20px; background:white; border-radius: 12px;">
                <h3>${currentUser.restaurant_name || 'Chưa đặt tên nhà hàng'}</h3>
                <p>${currentUser.restaurant_description || ''}</p>
                <button class="btn btn-outline" onclick="showModal('editRestaurantModal')">✏️ Chỉnh sửa thông tin</button>
            </div>
        `;
    }

    try {
        const products = await fetchAPI(`${API.PRODUCT}/products/restaurant/${currentUser.id}`);
        
        if (container) {
            if (products.length === 0) {
                container.innerHTML = '<p>Chưa có món ăn nào. Hãy thêm món mới!</p>';
            } else {
                container.innerHTML = `
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:20px;">
                    ${products.map(p => `
                        <div class="product-card" style="border:1px solid #eee; padding:10px; border-radius:8px; background: white;">
                            <img src="${getImageUrl(p.image_url)}" style="width:100%; height:120px; object-fit:cover; border-radius: 4px; margin-bottom: 10px;">
                            <h4>${p.name}</h4>
                            <p>${formatCurrency(p.price)}</p>
                            <p style="color:${p.is_available ? 'green' : 'red'};">${p.is_available ? '✓ Đang bán' : '✗ Hết hàng'}</p>
                            <div style="display: flex; gap: 5px; margin-top: 10px;">
                                <button class="btn btn-sm btn-outline" onclick="editProduct(${p.id})">✏️</button>
                                <button class="btn btn-sm btn-outline" onclick="toggleProductAvailability(${p.id}, ${!p.is_available})">${p.is_available ? '❌' : '✓'}</button>
                            </div>
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

window.toggleProductAvailability = async function(productId, newStatus) {
    try {
        await fetchAPI(`${API.PRODUCT}/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify({ is_available: newStatus })
        });
        showToast('✅ Đã cập nhật trạng thái', 'success');
        loadRestaurantData();
    } catch (error) {
        showToast('❌ Lỗi: ' + error.message, 'error');
    }
}

window.handleProductSubmit = async function(event) {
    event.preventDefault();

    const name = document.getElementById('prodName').value;
    const desc = document.getElementById('prodDesc').value;
    const price = document.getElementById('prodPrice').value;
    const time = document.getElementById('prodTime').value;
    const category = document.getElementById('prodCategory').value;
    const imageInput = document.getElementById('prodImage');

    if (!currentUser || currentUser.role !== 'restaurant') {
        showToast('❌ Lỗi quyền hạn', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', desc);
    formData.append('price', price);
    formData.append('preparation_time', time);
    formData.append('category', category);
    formData.append('restaurant_id', currentUser.id);

    if (imageInput && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    showLoading(true);
    try {
        const response = await fetch(`${API.PRODUCT}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
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
        loadRestaurantData();

    } catch (error) {
        console.error(error);
        showToast('❌ Lỗi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// ADMIN DASHBOARD
// ============================================
async function loadAdminData() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('⚠️ Không có quyền truy cập', 'warning');
        navigateTo('home');
        return;
    }

    showLoading(true);
    try {
        // Load statistics
        const users = await fetchAPI(`${API.USER}/users`);
        const restaurants = await fetchAPI(`${API.USER}/restaurants`);
        const orders = await fetchAPI(`${API.ORDER}/orders`);
        const drones = await fetchAPI(`${API.ORDER}/drones`);

        // Update stats
        document.getElementById('adminTotalUsers').innerText = users.length;
        document.getElementById('adminTotalRestaurants').innerText = restaurants.length;
        document.getElementById('adminTotalOrders').innerText = orders.length;
        document.getElementById('adminTotalDrones').innerText = drones.length;

        // Load default tab
        await loadAdminRestaurants(restaurants);
        await loadAdminUsers(users);
        await loadAdminOrders(orders);
        await loadAdminDrones(drones);

    } catch (error) {
        showToast('❌ Lỗi tải dữ liệu admin: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadAdminRestaurants(restaurants) {
    const container = document.getElementById('adminRestaurantsList');
    if (!container) return;

    container.innerHTML = `
        <table style="width: 100%; background: white; border-radius: 12px; overflow: hidden;">
            <thead style="background: #f5f5f5;">
                <tr>
                    <th style="padding: 12px; text-align: left;">ID</th>
                    <th style="padding: 12px; text-align: left;">Tên nhà hàng</th>
                    <th style="padding: 12px; text-align: left;">Chủ sở hữu</th>
                    <th style="padding: 12px; text-align: left;">Email</th>
                    <th style="padding: 12px; text-align: left;">Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                ${restaurants.map(r => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">${r.id}</td>
                        <td style="padding: 12px;"><b>${r.restaurant_name || 'N/A'}</b></td>
                        <td style="padding: 12px;">${r.full_name || r.username}</td>
                        <td style="padding: 12px;">${r.email}</td>
                        <td style="padding: 12px;">
                            <span style="background: ${r.is_active ? '#4CAF50' : '#F44336'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                                ${r.is_active ? 'Hoạt động' : 'Tạm ngừng'}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadAdminUsers(users) {
    const container = document.getElementById('adminUsersList');
    if (!container) return;

    container.innerHTML = `
        <table style="width: 100%; background: white; border-radius: 12px; overflow: hidden;">
            <thead style="background: #f5f5f5;">
                <tr>
                    <th style="padding: 12px; text-align: left;">ID</th>
                    <th style="padding: 12px; text-align: left;">Tên</th>
                    <th style="padding: 12px; text-align: left;">Email</th>
                    <th style="padding: 12px; text-align: left;">Vai trò</th>
                    <th style="padding: 12px; text-align: left;">Ngày tạo</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">${u.id}</td>
                        <td style="padding: 12px;">${u.full_name || u.username}</td>
                        <td style="padding: 12px;">${u.email}</td>
                        <td style="padding: 12px;">
                            <span style="background: ${getRoleBadgeColor(u.role)}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                                ${getRoleText(u.role)}
                            </span>
                        </td>
                        <td style="padding: 12px;">${new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadAdminOrders(orders) {
    const container = document.getElementById('adminOrdersList');
    if (!container) return;

    container.innerHTML = `
        <table style="width: 100%; background: white; border-radius: 12px; overflow: hidden;">
            <thead style="background: #f5f5f5;">
                <tr>
                    <th style="padding: 12px; text-align: left;">Mã ĐH</th>
                    <th style="padding: 12px; text-align: left;">Khách hàng</th>
                    <th style="padding: 12px; text-align: left;">Tổng tiền</th>
                    <th style="padding: 12px; text-align: left;">Trạng thái</th>
                    <th style="padding: 12px; text-align: left;">Drone</th>
                    <th style="padding: 12px; text-align: left;">Ngày</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(o => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;"><b>#${o.id}</b></td>
                        <td style="padding: 12px;">User ${o.user_id}</td>
                        <td style="padding: 12px;"><b>${formatCurrency(o.total_amount)}</b></td>
                        <td style="padding: 12px;">
                            <span style="background: ${getStatusColor(o.status)}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                                ${getStatusText(o.status)}
                            </span>
                        </td>
                        <td style="padding: 12px;">${o.drone_id ? `🚁 #${o.drone_id}` : '-'}</td>
                        <td style="padding: 12px;">${new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadAdminDrones(drones) {
    const container = document.getElementById('adminDronesList');
    if (!container) return;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
            ${drones.map(d => `
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 36px;">🚁</span>
                        <span style="background: ${getDroneStatusColor(d.status)}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                            ${getDroneStatusText(d.status)}
                        </span>
                    </div>
                    <h3>${d.name}</h3>
                    <p style="color: #666; font-size: 14px;">${d.model || 'Standard Model'}</p>
                    <div style="margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Pin:</span>
                            <b>${d.battery_level}%</b>
                        </div>
                        <div style="background: #eee; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${d.battery_level}%; height: 100%; background: ${d.battery_level > 50 ? '#4CAF50' : d.battery_level > 20 ? '#FFA726' : '#F44336'};"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                            <span>Tải trọng:</span>
                            <b>${d.max_payload} kg</b>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <button class="btn btn-primary" onclick="showModal('addDroneModal')" style="margin-top: 20px;">+ Thêm Drone mới</button>
    `;
}

window.switchAdminTab = function(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('admin' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
}

window.switchRestaurantTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('restaurant' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');

    if (tabName === 'orders') {
        loadRestaurantOrders();
    }
}

async function loadRestaurantOrders() {
    try {
        const orders = await fetchAPI(`${API.ORDER}/orders`);
        const container = document.getElementById('restaurantOrdersList');
        
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p>Chưa có đơn hàng nào</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-card" style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3>Đơn #${order.id}</h3>
                        <p>${new Date(order.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 8px; border-radius: 8px; border: 1px solid #ddd;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Chờ xác nhận</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Đã xác nhận</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Đang chuẩn bị</option>
                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Sẵn sàng</option>
                        <option value="in_delivery" ${order.status === 'in_delivery' ? 'selected' : ''}>Đang giao</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Đã giao</option>
                    </select>
                </div>
                <div style="margin-top: 15px;">
                    ${(order.items || []).map(item => `
                        <p>${item.quantity}x ${item.product_name} - ${formatCurrency(item.price * item.quantity)}</p>
                    `).join('')}
                </div>
                <p style="margin-top: 10px;"><strong>Tổng: ${formatCurrency(order.total_amount)}</strong></p>
                <p>📍 ${order.delivery_address}</p>
            </div>
        `).join('');
    } catch (error) {
        showToast('❌ Lỗi tải đơn hàng: ' + error.message, 'error');
    }
}

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        await fetchAPI(`${API.ORDER}/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        showToast('✅ Đã cập nhật trạng thái đơn hàng', 'success');
        loadRestaurantOrders();
    } catch (error) {
        showToast('❌ Lỗi: ' + error.message, 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getRoleBadgeColor(role) {
    const colors = {
        'admin': '#F44336',
        'restaurant': '#FF9800',
        'customer': '#4CAF50'
    };
    return colors[role] || '#999';
}

function getRoleText(role) {
    const texts = {
        'admin': 'Quản trị viên',
        'restaurant': 'Nhà hàng',
        'customer': 'Khách hàng'
    };
    return texts[role] || role;
}

function getDroneStatusColor(status) {
    const colors = {
        'idle': '#4CAF50',
        'in_use': '#2196F3',
        'maintenance': '#FFA726',
        'charging': '#FFEB3B'
    };
    return colors[status] || '#999';
}

function getDroneStatusText(status) {
    const texts = {
        'idle': 'Rảnh',
        'in_use': 'Đang giao',
        'maintenance': 'Bảo trì',
        'charging': 'Đang sạc'
    };
    return texts[status] || status;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
        if (show) {
            overlay.innerHTML = `
                <div class="spinner-container">
                    <div class="spinner"></div>
                    <p>Đang xử lý...</p>
                </div>
            `;
        }
    }
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const colors = {
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FFA726',
        info: '#2196F3'
    };
    
    toast.style.background = colors[type] || '#333';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.marginTop = '10px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.innerText = msg;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatCurrency(val) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

window.showModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

window.filterRestaurants = function(type) {
    // Remove active class from all filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // TODO: Implement actual filtering logic
    showToast('Đang phát triển tính năng lọc', 'info');
}

window.filterOrders = function(status) {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // TODO: Implement order filtering
    loadOrders();
}

// ============================================
// [MỚI] REAL-TIME ORDER TRACKING
// ============================================
let orderTrackingInterval = null;

function startOrderTracking() {
    // Clear existing interval
    if (orderTrackingInterval) {
        clearInterval(orderTrackingInterval);
    }
    
    // Update every 10 seconds
    orderTrackingInterval = setInterval(() => {
        const currentPage = document.querySelector('.page.active');
        if (currentPage && currentPage.id === 'ordersPage' && currentUser) {
            loadOrders();
        }
        
        if (currentPage && currentPage.id === 'restaurantDashboard' && currentUser && currentUser.role === 'restaurant') {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'restaurantOrders') {
                loadRestaurantOrders();
            }
        }
    }, 10000); // 10 seconds
}

// Start tracking khi page load
document.addEventListener('DOMContentLoaded', () => {
    startOrderTracking();
});

// ============================================
// [MỚI] RESTAURANT ORDER ACTIONS (Accept/Reject)
// ============================================
window.acceptOrder = async function(orderId) {
    if (!confirm('Xác nhận nhận đơn hàng này?')) return;
    
    showLoading(true);
    try {
        await fetchAPI(`${API.ORDER}/orders/${orderId}/accept`, {
            method: 'POST'
        });
        
        showToast('✅ Đã nhận đơn hàng!', 'success');
        loadRestaurantOrders();
    } catch (error) {
        showToast('❌ Lỗi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.rejectOrder = async function(orderId) {
    const reason = prompt('Lý do từ chối đơn hàng:', 'Hết nguyên liệu');
    if (!reason) return;
    
    showLoading(true);
    try {
        await fetchAPI(`${API.ORDER}/orders/${orderId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        
        showToast('✅ Đã từ chối đơn hàng', 'success');
        loadRestaurantOrders();
    } catch (error) {
        showToast('❌ Lỗi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// [CẬP NHẬT] Load Restaurant Orders với Accept/Reject
// ============================================
async function loadRestaurantOrders() {
    try {
        const orders = await fetchAPI(`${API.ORDER}/orders`);
        const container = document.getElementById('restaurantOrdersList');
        
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p>Chưa có đơn hàng nào</p>';
            return;
        }

        container.innerHTML = orders.map(order => {
            const canAcceptReject = order.status === 'waiting_confirmation';
            
            return `
            <div class="order-card" style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid ${getStatusColor(order.status)};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <h3>Đơn #${order.id}</h3>
                        <p style="color: #666; font-size: 14px;">${new Date(order.created_at).toLocaleString('vi-VN')}</p>
                        ${order.distance_km ? `<p style="color: #666;">📍 Khoảng cách: ${order.distance_km.toFixed(1)}km</p>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
                        <span class="badge" style="background: ${getStatusColor(order.status)}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold;">
                            ${getStatusText(order.status)}
                        </span>
                        ${canAcceptReject ? `
                            <div style="display: flex; gap: 10px;">
                                <button class="btn btn-sm" style="background: #4CAF50; color: white;" onclick="acceptOrder(${order.id})">✓ Nhận đơn</button>
                                <button class="btn btn-sm" style="background: #F44336; color: white;" onclick="rejectOrder(${order.id})">✗ Từ chối</button>
                            </div>
                        ` : ''}
                        ${order.status === 'confirmed' || order.status === 'preparing' ? `
                            <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 8px; border-radius: 8px; border: 1px solid #ddd;">
                                <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Đã xác nhận</option>
                                <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Đang chuẩn bị</option>
                                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Sẵn sàng</option>
                            </select>
                        ` : ''}
                    </div>
                </div>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="margin-bottom: 10px;">Chi tiết đơn hàng:</h4>
                    ${(order.items || []).map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #ddd;">
                            <span>${item.quantity}x ${item.product_name}</span>
                            <span>${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                    <div style="display: flex; justify-content: space-between; padding-top: 10px; margin-top: 10px; border-top: 2px solid #333; font-weight: bold; font-size: 16px;">
                        <span>Tổng cộng:</span>
                        <span style="color: #FF6B6B;">${formatCurrency(order.total_amount)}</span>
                    </div>
                </div>
                
                <p style="color: #666;">📍 ${order.delivery_address}</p>
                ${order.notes ? `<p style="color: #999; font-style: italic;">💬 Ghi chú: ${order.notes}</p>` : ''}
                ${order.rejection_reason ? `<p style="color: #F44336; font-weight: bold;">❌ Lý do từ chối: ${order.rejection_reason}</p>` : ''}
                ${order.drone_id ? `<p style="color: #4CAF50; font-weight: bold;">🚁 Drone #${order.drone_id} đang giao</p>` : ''}
            </div>
        `;
        }).join('');
    } catch (error) {
        showToast('❌ Lỗi tải đơn hàng: ' + error.message, 'error');
    }
}

// ============================================
// [MỚI] DRONE TRACKING MAP (Giả lập)
// ============================================
window.trackOrder = function(orderId) {
    showModal('orderTrackingModal');
    // TODO: Implement real-time drone tracking with Google Maps
    simulateDroneMovement(orderId);
}

function simulateDroneMovement(orderId) {
    const steps = ['Đang bay đến nhà hàng', 'Đang lấy đồ ăn', 'Đang bay đến bạn', 'Đã đến nơi!'];
    let currentStep = 0;
    
    const interval = setInterval(() => {
        if (currentStep >= steps.length) {
            clearInterval(interval);
            return;
        }
        
        showToast(`🚁 ${steps[currentStep]}`, 'info');
        currentStep++;
    }, 5000);
}