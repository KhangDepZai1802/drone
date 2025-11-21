// API Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost' 
    : '';

const API_ENDPOINTS = {
    USER: `${API_BASE}:8001`,
    PRODUCT: `${API_BASE}:8002`,
    ORDER: `${API_BASE}:8003`,
    PAYMENT: `${API_BASE}:8004`
};

// State Management
let currentUser = null;
let token = null;
let cart = [];
let currentRestaurant = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadRestaurants();
});

// Auth Functions
function checkAuth() {
    token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        currentUser = JSON.parse(userData);
        updateAuthUI();
    }
}

function updateAuthUI() {
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        navAuth.style.display = 'none';
        navUser.style.display = 'flex';
        userName.textContent = `Xin chào, ${currentUser.full_name || currentUser.username}`;
    } else {
        navAuth.style.display = 'flex';
        navUser.style.display = 'none';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(`${API_ENDPOINTS.USER}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Đăng nhập thất bại');
        }
        
        const data = await response.json();
        token = data.access_token;
        currentUser = data.user;
        
        localStorage.setItem('token', token);
        localStorage.setItem('userData', JSON.stringify(currentUser));
        
        updateAuthUI();
        showPage('home');
        showAlert('Đăng nhập thành công!', 'success');
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const userData = {
        email: document.getElementById('registerEmail').value,
        username: document.getElementById('registerUsername').value,
        password: document.getElementById('registerPassword').value,
        full_name: document.getElementById('registerFullName').value,
        phone: document.getElementById('registerPhone').value,
        address: document.getElementById('registerAddress').value,
        role: document.getElementById('registerRole').value
    };
    
    if (userData.role === 'restaurant') {
        userData.restaurant_name = document.getElementById('registerRestaurantName').value;
        userData.restaurant_description = document.getElementById('registerRestaurantDesc').value;
    }
    
    try {
        const response = await fetch(`${API_ENDPOINTS.USER}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Đăng ký thất bại');
        }
        
        showAlert('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
        showPage('login');
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function logout() {
    token = null;
    currentUser = null;
    cart = [];
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    updateAuthUI();
    showPage('home');
    showAlert('Đã đăng xuất', 'success');
}

function toggleRestaurantFields() {
    const role = document.getElementById('registerRole').value;
    const restaurantFields = document.getElementById('restaurantFields');
    restaurantFields.style.display = role === 'restaurant' ? 'block' : 'none';
}

// Navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const page = document.getElementById(`${pageName}Page`);
    if (page) {
        page.classList.add('active');
    }
    
    // Load page-specific data
    if (pageName === 'restaurants') {
        loadRestaurants();
    } else if (pageName === 'orders') {
        if (!currentUser) {
            showAlert('Vui lòng đăng nhập để xem đơn hàng', 'error');
            showPage('login');
            return;
        }
        loadOrders();
    } else if (pageName === 'drones') {
        loadDrones();
    }
}

// Restaurants
async function loadRestaurants() {
    try {
        const response = await fetch(`${API_ENDPOINTS.USER}/restaurants`);
        const restaurants = await response.json();
        
        const restaurantsList = document.getElementById('restaurantsList');
        restaurantsList.innerHTML = restaurants.map(restaurant => `
            <div class="card">
                <div class="card-img"></div>
                <div class="card-body">
                    <h3 class="card-title">${restaurant.restaurant_name || restaurant.username}</h3>
                    <p class="card-text">${restaurant.restaurant_description || 'Nhà hàng chất lượng'}</p>
                    <button onclick="viewRestaurantProducts(${restaurant.id}, '${restaurant.restaurant_name || restaurant.username}')" class="btn btn-primary btn-block">
                        Xem thực đơn
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading restaurants:', error);
    }
}

async function viewRestaurantProducts(restaurantId, restaurantName) {
    currentRestaurant = { id: restaurantId, name: restaurantName };
    document.getElementById('restaurantName').textContent = restaurantName;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.PRODUCT}/products?restaurant_id=${restaurantId}`);
        const products = await response.json();
        
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = products.map(product => `
            <div class="card">
                <div class="card-img"></div>
                <div class="card-body">
                    <h3 class="card-title">${product.name}</h3>
                    <p class="card-text">${product.description || 'Món ăn ngon'}</p>
                    <p class="card-price">${formatCurrency(product.price)}</p>
                    <p class="card-text"><small>⏱️ ${product.preparation_time} phút</small></p>
                    <button onclick="addToCart(${product.id}, '${product.name}', ${product.price})" 
                            class="btn btn-success btn-block"
                            ${!product.is_available ? 'disabled' : ''}>
                        ${product.is_available ? 'Thêm vào giỏ' : 'Hết hàng'}
                    </button>
                </div>
            </div>
        `).join('');
        
        updateCart();
        showPage('products');
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Cart Functions
function addToCart(productId, productName, price) {
    if (!currentUser) {
        showAlert('Vui lòng đăng nhập để đặt hàng', 'error');
        showPage('login');
        return;
    }
    
    const existingItem = cart.find(item => item.product_id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            product_id: productId,
            product_name: productName,
            price: price,
            quantity: 1
        });
    }
    
    updateCart();
    showAlert(`Đã thêm ${productName} vào giỏ hàng`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product_id !== productId);
    updateCart();
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.product_id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCart();
        }
    }
}

function updateCart() {
    const cartElement = document.getElementById('cart');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartElement.style.display = 'none';
        return;
    }
    
    cartElement.style.display = 'block';
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.product_name}</strong><br>
                <small>${formatCurrency(item.price)} x ${item.quantity}</small>
            </div>
            <div>
                <button onclick="updateCartQuantity(${item.product_id}, -1)" class="btn btn-outline" style="padding: 0.25rem 0.5rem;">-</button>
                <span style="margin: 0 0.5rem;">${item.quantity}</span>
                <button onclick="updateCartQuantity(${item.product_id}, 1)" class="btn btn-outline" style="padding: 0.25rem 0.5rem;">+</button>
                <button onclick="removeFromCart(${item.product_id})" class="btn btn-danger" style="padding: 0.25rem 0.5rem; margin-left: 0.5rem;">×</button>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = formatCurrency(total);
}

// Checkout
function showCheckout() {
    if (cart.length === 0) {
        showAlert('Giỏ hàng trống', 'error');
        return;
    }
    
    const checkoutItems = document.getElementById('checkoutItems');
    const checkoutTotal = document.getElementById('checkoutTotal');
    
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <div>
                <strong>${item.product_name}</strong><br>
                <small>${formatCurrency(item.price)} x ${item.quantity}</small>
            </div>
            <div>${formatCurrency(item.price * item.quantity)}</div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    checkoutTotal.textContent = formatCurrency(total);
    
    // Pre-fill delivery address
    if (currentUser.address) {
        document.getElementById('deliveryAddress').value = currentUser.address;
    }
    
    showPage('checkout');
}

async function handleCheckout(event) {
    event.preventDefault();
    
    if (cart.length === 0) {
        showAlert('Giỏ hàng trống', 'error');
        return;
    }
    
    const deliveryAddress = document.getElementById('deliveryAddress').value;
    const orderNotes = document.getElementById('orderNotes').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    try {
        // Create order
        const orderData = {
            restaurant_id: currentRestaurant.id,
            delivery_address: deliveryAddress,
            notes: orderNotes,
            items: cart
        };
        
        const orderResponse = await fetch(`${API_ENDPOINTS.ORDER}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (!orderResponse.ok) {
            throw new Error('Không thể tạo đơn hàng');
        }
        
        const order = await orderResponse.json();
        
        // Create payment
        const paymentData = {
            order_id: order.id,
            amount: order.total_amount,
            payment_method: paymentMethod
        };
        
        const paymentResponse = await fetch(`${API_ENDPOINTS.PAYMENT}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        
        if (!paymentResponse.ok) {
            throw new Error('Thanh toán thất bại');
        }
        
        // Clear cart
        cart = [];
        updateCart();
        
        showAlert('Đặt hàng thành công! Drone sẽ giao hàng trong 30 phút.', 'success');
        showPage('orders');
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_ENDPOINTS.ORDER}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Không thể tải đơn hàng');
        }
        
        const orders = await response.json();
        
        const ordersList = document.getElementById('ordersList');
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<p class="text-center">Chưa có đơn hàng nào</p>';
            return;
        }
        
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <strong>Đơn hàng #${order.id}</strong><br>
                        <small>${new Date(order.created_at).toLocaleString('vi-VN')}</small>
                    </div>
                    <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span>${item.product_name} x${item.quantity}</span>
                            <span>${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--border);">
                    <strong>Địa chỉ giao hàng:</strong> ${order.delivery_address}<br>
                    <strong>Tổng tiền:</strong> ${formatCurrency(order.total_amount)}<br>
                    ${order.drone_id ? `<strong>Drone:</strong> #${order.drone_id}` : ''}
                    ${order.estimated_delivery_time ? `<br><strong>Thời gian giao:</strong> ~${order.estimated_delivery_time} phút` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Drones
async function loadDrones() {
    try {
        const response = await fetch(`${API_ENDPOINTS.ORDER}/drones`);
        const drones = await response.json();
        
        const dronesList = document.getElementById('dronesList');
        dronesList.innerHTML = drones.map(drone => `
            <div class="card">
                <div class="card-img"></div>
                <div class="card-body">
                    <h3 class="card-title">${drone.name}</h3>
                    <p class="card-text">Model: ${drone.model || 'N/A'}</p>
                    <p class="card-text">🔋 Pin: ${drone.battery_level.toFixed(1)}%</p>
                    <p class="card-text">📦 Tải trọng: ${drone.max_payload} kg</p>
                    <span class="drone-status ${drone.status}">${getDroneStatusText(drone.status)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading drones:', error);
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'preparing': 'Đang chuẩn bị',
        'ready': 'Sẵn sàng',
        'in_delivery': 'Đang giao',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

function getDroneStatusText(status) {
    const statusMap = {
        'idle': 'Sẵn sàng',
        'in_use': 'Đang giao hàng',
        'maintenance': 'Bảo trì'
    };
    return statusMap[status] || status;
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const main = document.querySelector('main');
    main.insertBefore(alertDiv, main.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}