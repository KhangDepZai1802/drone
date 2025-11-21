
        // API Configuration
        const API = {
            USER: 'http://localhost:8001',
            PRODUCT: 'http://localhost:8002',
            ORDER: 'http://localhost:8003',
            PAYMENT: 'http://localhost:8004'
        };

        // State
        let currentUser = null;
        let token = null;
        let cart = [];
        let currentRestaurant = null;

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
            loadPopularDishes();
        });

        // Auth Functions
        function checkAuth() {
            token = localStorage.getItem('token');
            const userData = localStorage.getItem('userData');
            
            if (token && userData) {
                currentUser = JSON.parse(userData);
                updateUI();
                
                // Navigate based on role
                if (currentUser.role === 'admin') {
                    navigateTo('admin');
                } else if (currentUser.role === 'restaurant') {
                    navigateTo('restaurant');
                }
            } else {
                updateUI();
            }
        }

        function updateUI() {
            const navUser = document.getElementById('navUser');
            const cartBtn = document.getElementById('cartBtn');
            
            if (currentUser) {
                navUser.innerHTML = `
                    <span style="color: var(--dark);">Xin chào, <strong>${currentUser.full_name || currentUser.username}</strong></span>
                    <button class="btn btn-outline" onclick="logout()">Đăng xuất</button>
                `;
                
                if (currentUser.role === 'customer') {
                    cartBtn.style.display = 'block';
                }
            } else {
                navUser.innerHTML = `
                    <button class="btn btn-outline" onclick="navigateTo('login')">Đăng nhập</button>
                    <button class="btn btn-primary" onclick="navigateTo('register')">Đăng ký</button>
                `;
                cartBtn.style.display = 'none';
            }
        }

        async function handleLogin(e) {
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
                    body: formData
                });
                
                if (!response.ok) throw new Error('Đăng nhập thất bại');
                
                const data = await response.json();
                token = data.access_token;
                currentUser = data.user;
                
                localStorage.setItem('token', token);
                localStorage.setItem('userData', JSON.stringify(currentUser));
                
                updateUI();
                showAlert('Đăng nhập thành công!', 'success');
                
                // Navigate based on role
                if (currentUser.role === 'admin') {
                    navigateTo('admin');
                    loadAdminData();
                } else if (currentUser.role === 'restaurant') {
                    navigateTo('restaurant');
                    loadRestaurantData();
                } else {
                    navigateTo('home');
                }
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        async function handleRegister(e) {
            e.preventDefault();
            showLoading(true);
            
            const userData = {
                email: document.getElementById('regEmail').value,
                username: document.getElementById('regUsername').value,
                password: document.getElementById('regPassword').value,
                full_name: document.getElementById('regFullName').value,
                phone: document.getElementById('regPhone').value,
                address: document.getElementById('regAddress').value,
                role: 'customer'
            };
            
            try {
                const response = await fetch(`${API.USER}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Đăng ký thất bại');
                }
                
                showAlert('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
                navigateTo('login');
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        function logout() {
            token = null;
            currentUser = null;
            cart = [];
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            updateUI();
            navigateTo('home');
            showAlert('Đã đăng xuất', 'success');
        }

        // Navigation
        function navigateTo(page) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            
            // Show selected page
            const pageElement = document.getElementById(`${page}Page`);
            if (pageElement) {
                pageElement.classList.add('active');
                
                // Update URL without reload
                window.history.pushState({page}, '', `#${page}`);
                
                // Load page data
                if (page === 'restaurants') loadRestaurants();
                else if (page === 'orders') loadOrders();
                else if (page === 'admin') loadAdminData();
                else if (page === 'restaurant') loadRestaurantData();
            }
        }

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                navigateTo(e.state.page);
            }
        });

        // Popular Dishes
        async function loadPopularDishes() {
            showLoading(true);
            try {
                const response = await fetch(`${API.PRODUCT}/products?limit=6`);
                const products = await response.json();
                
                const container = document.getElementById('popularDishes');
                container.innerHTML = products.map(product => `
                    <div class="card" onclick="viewRestaurantMenu(${product.restaurant_id})">
                        <div class="card-image"></div>
                        <div class="card-body">
                            <h3 class="card-title">${product.name}</h3>
                            <p class="card-text">${product.description || 'Món ăn ngon'}</p>
                            <p class="card-price">${formatCurrency(product.price)}</p>
                            <p style="color: #666; font-size: 0.9rem;">⏱️ ${product.preparation_time} phút</p>
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading popular dishes:', error);
            } finally {
                showLoading(false);
            }
        }

        // Restaurants
        async function loadRestaurants() {
            showLoading(true);
            try {
                const response = await fetch(`${API.USER}/restaurants`);
                const restaurants = await response.json();
                
                const container = document.getElementById('restaurantsList');
                container.innerHTML = restaurants.map(restaurant => `
                    <div class="card" onclick="viewRestaurantMenu(${restaurant.id})">
                        <div class="card-image"></div>
                        <div class="card-body">
                            <h3 class="card-title">${restaurant.restaurant_name || restaurant.username}</h3>
                            <p class="card-text">${restaurant.restaurant_description || 'Nhà hàng chất lượng'}</p>
                            <button class="btn btn-primary btn-block" onclick="event.stopPropagation(); viewRestaurantMenu(${restaurant.id})">
                                Xem thực đơn
                            </button>
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading restaurants:', error);
            } finally {
                showLoading(false);
            }
        }

        async function viewRestaurantMenu(restaurantId) {
            showLoading(true);
            try {
                // Get restaurant info
                const resResponse = await fetch(`${API.USER}/users/${restaurantId}`);
                const restaurant = await resResponse.json();
                currentRestaurant = restaurant;
                
                document.getElementById('restaurantTitle').textContent = restaurant.restaurant_name || restaurant.username;
                
                // Get products
                const prodResponse = await fetch(`${API.PRODUCT}/products?restaurant_id=${restaurantId}`);
                const products = await prodResponse.json();
                
                const container = document.getElementById('menuList');
                container.innerHTML = products.map(product => `
                    <div class="card">
                        <div class="card-image"></div>
                        <div class="card-body">
                            <h3 class="card-title">${product.name}</h3>
                            <p class="card-text">${product.description || 'Món ăn ngon'}</p>
                            <p class="card-price">${formatCurrency(product.price)}</p>
                            <p style="color: #666; font-size: 0.9rem;">⏱️ ${product.preparation_time} phút</p>
                            <button onclick="addToCart(${product.id}, '${product.name}', ${product.price})" 
                                    class="btn btn-primary btn-block"
                                    ${!product.is_available ? 'disabled' : ''}>
                                ${product.is_available ? '+ Thêm vào giỏ' : 'Hết hàng'}
                            </button>
                        </div>
                    </div>
                `).join('');
                
                navigateTo('menu');
            } catch (error) {
                showAlert('Không thể tải thực đơn', 'error');
            } finally {
                showLoading(false);
            }
        }

        // Cart Functions
        function addToCart(productId, productName, price) {
            if (!currentUser) {
                showAlert('Vui lòng đăng nhập để đặt hàng', 'error');
                navigateTo('login');
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

        function updateCart() {
            const cartItems = document.getElementById('cartItems');
            const cartTotal = document.getElementById('cartTotal');
            const cartCount = document.getElementById('cartCount');
            
            if (cart.length === 0) {
                cartItems.innerHTML = '<p style="text-align: center; color: #666;">Giỏ hàng trống</p>';
                cartTotal.textContent = '0đ';
                cartCount.textContent = '0';
                return;
            }
            
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div>
                        <strong>${item.product_name}</strong><br>
                        <small>${formatCurrency(item.price)} x ${item.quantity}</small>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button onclick="updateCartQuantity(${item.product_id}, -1)" class="btn btn-outline" style="padding: 0.25rem 0.5rem;">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartQuantity(${item.product_id}, 1)" class="btn btn-outline" style="padding: 0.25rem 0.5rem;">+</button>
                        <button onclick="removeFromCart(${item.product_id})" class="btn" style="background: var(--danger); color: white; padding: 0.25rem 0.5rem;">×</button>
                    </div>
                </div>
            `).join('');
            
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cartTotal.textContent = formatCurrency(total);
            cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
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

        function removeFromCart(productId) {
            cart = cart.filter(item => item.product_id !== productId);
            updateCart();
        }

        function toggleCart() {
            const cartSidebar = document.getElementById('cartSidebar');
            cartSidebar.classList.toggle('active');
        }

        async function checkout() {
            if (cart.length === 0) {
                showAlert('Giỏ hàng trống', 'error');
                return;
            }
            
            if (!currentRestaurant) {
                showAlert('Vui lòng chọn nhà hàng', 'error');
                return;
            }
            
            const deliveryAddress = prompt('Nhập địa chỉ giao hàng:', currentUser.address || '');
            if (!deliveryAddress) return;
            
            showLoading(true);
            
            try {
                // Create order
                const orderData = {
                    restaurant_id: currentRestaurant.id,
                    delivery_address: deliveryAddress,
                    items: cart
                };
                
                const orderResponse = await fetch(`${API.ORDER}/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(orderData)
                });
                
                if (!orderResponse.ok) throw new Error('Không thể tạo đơn hàng');
                
                const order = await orderResponse.json();
                
                // Create payment
                const paymentData = {
                    order_id: order.id,
                    amount: order.total_amount,
                    payment_method: 'credit_card'
                };
                
                const paymentResponse = await fetch(`${API.PAYMENT}/payments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(paymentData)
                });
                
                if (!paymentResponse.ok) throw new Error('Thanh toán thất bại');
                
                // Clear cart
                cart = [];
                updateCart();
                toggleCart();
                
                showAlert('Đặt hàng thành công! Drone đang trên đường đến bạn 🚁', 'success');
                navigateTo('orders');
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        // Orders
        async function loadOrders() {
            if (!currentUser) {
                showAlert('Vui lòng đăng nhập', 'error');
                navigateTo('login');
                return;
            }
            
            showLoading(true);
            try {
                const response = await fetch(`${API.ORDER}/orders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) throw new Error('Không thể tải đơn hàng');
                
                const orders = await response.json();
                
                const container = document.getElementById('ordersList');
                
                if (orders.length === 0) {
                    container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 15px; text-align: center;">Chưa có đơn hàng nào</div>';
                    return;
                }
                
                container.innerHTML = orders.map(order => `
                    <div style="background: white; padding: 1.5rem; border-radius: 15px; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 2px solid #f0f0f0;">
                            <div>
                                <strong>Đơn hàng #${order.id}</strong><br>
                                <small>${new Date(order.created_at).toLocaleString('vi-VN')}</small>
                            </div>
                            <span style="padding: 0.5rem 1rem; border-radius: 20px; background: ${getStatusColor(order.status)}; color: white; font-weight: 600;">
                                ${getStatusText(order.status)}
                            </span>
                        </div>
                        <div>
                            ${order.items.map(item => `
                                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                                    <span>${item.product_name} x${item.quantity}</span>
                                    <span>${formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #f0f0f0;">
                            <strong>Địa chỉ:</strong> ${order.delivery_address}<br>
                            <strong>Tổng tiền:</strong> ${formatCurrency(order.total_amount)}<br>
                            ${order.drone_id ? `<strong>Drone:</strong> #${order.drone_id} 🚁` : ''}
                            ${order.estimated_delivery_time ? `<br><strong>Thời gian giao:</strong> ~${order.estimated_delivery_time} phút` : ''}
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        // Admin Functions
        async function loadAdminData() {
            showLoading(true);
            try {
                // Load stats
                const [usersRes, restaurantsRes, ordersRes, dronesRes] = await Promise.all([
                    fetch(`${API.USER}/users/me`, { headers: { 'Authorization': `Bearer ${token}` }}),
                    fetch(`${API.USER}/restaurants`),
                    fetch(`${API.ORDER}/orders`, { headers: { 'Authorization': `Bearer ${token}` }}),
                    fetch(`${API.ORDER}/drones`)
                ]);
                
                const restaurants = await restaurantsRes.json();
                const orders = await ordersRes.json();
                const drones = await dronesRes.json();
                
                document.getElementById('totalUsers').textContent = '10+';
                document.getElementById('totalRestaurants').textContent = restaurants.length;
                document.getElementById('totalOrders').textContent = orders.length;
                document.getElementById('totalDrones').textContent = drones.length;
                
                // Load restaurants table
                const resTable = document.getElementById('adminRestaurantsList');
                resTable.innerHTML = restaurants.map(r => `
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.restaurant_name || 'N/A'}</td>
                        <td>${r.email}</td>
                        <td>${r.username}</td>
                        <td>
                            <button class="btn btn-outline" style="padding: 0.25rem 0.75rem;" onclick="viewRestaurantProducts(${r.id})">Xem món</button>
                            <button class="btn" style="background: var(--danger); color: white; padding: 0.25rem 0.75rem;" onclick="deleteUser(${r.id})">Xóa</button>
                        </td>
                    </tr>
                `).join('');
                
                // Load drones
                const dronesContainer = document.getElementById('adminDronesList');
                dronesContainer.innerHTML = drones.map(drone => `
                    <div class="card">
                        <div class="card-image" style="background: linear-gradient(135deg, #667eea, #764ba2);"></div>
                        <div class="card-body">
                            <h3 class="card-title">${drone.name}</h3>
                            <p class="card-text">Model: ${drone.model || 'N/A'}</p>
                            <p class="card-text">🔋 Pin: ${drone.battery_level.toFixed(1)}%</p>
                            <p class="card-text">📦 Tải trọng: ${drone.max_payload} kg</p>
                            <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; background: ${getDroneStatusColor(drone.status)}; color: white; font-size: 0.85rem;">
                                ${getDroneStatusText(drone.status)}
                            </span>
                        </div>
                    </div>
                `).join('');
                
                // Load users (mock data since we don't have endpoint)
                const usersTable = document.getElementById('adminUsersList');
                usersTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">Đang tải...</td></tr>';
                
            } catch (error) {
                console.error('Error loading admin data:', error);
            } finally {
                showLoading(false);
            }
        }

        async function viewRestaurantProducts(restaurantId) {
            showLoading(true);
            try {
                const response = await fetch(`${API.PRODUCT}/products?restaurant_id=${restaurantId}`);
                const products = await response.json();
                
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>Danh sách món ăn</h3>
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${products.map(p => `
                                <div style="padding: 1rem; border-bottom: 1px solid #e0e0e0;">
                                    <strong>${p.name}</strong><br>
                                    <small>${p.description || ''}</small><br>
                                    <strong style="color: var(--success);">${formatCurrency(p.price)}</strong>
                                </div>
                            `).join('') || '<p>Chưa có món ăn nào</p>'}
                        </div>
                        <button class="btn btn-outline btn-block" onclick="this.parentElement.parentElement.remove()">Đóng</button>
                    </div>
                `;
                document.body.appendChild(modal);
            } catch (error) {
                showAlert('Không thể tải danh sách món', 'error');
            } finally {
                showLoading(false);
            }
        }

        // Restaurant Functions
        async function loadRestaurantData() {
            showLoading(true);
            try {
                // Load products
                const prodResponse = await fetch(`${API.PRODUCT}/products?restaurant_id=${currentUser.id}`);
                const products = await prodResponse.json();
                
                const container = document.getElementById('restaurantProducts');
                container.innerHTML = products.map(product => `
                    <div class="card">
                        <div class="card-image"></div>
                        <div class="card-body">
                            <h3 class="card-title">${product.name}</h3>
                            <p class="card-text">${product.description || ''}</p>
                            <p class="card-price">${formatCurrency(product.price)}</p>
                            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                                <button class="btn btn-outline" style="flex: 1;" onclick="editProduct(${product.id})">Sửa</button>
                                <button class="btn" style="flex: 1; background: var(--danger); color: white;" onclick="deleteProduct(${product.id})">Xóa</button>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                if (products.length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: white;">Chưa có món ăn nào. Hãy thêm món mới!</p>';
                }
                
                // Load orders
                const ordersResponse = await fetch(`${API.ORDER}/orders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const orders = await ordersResponse.json();
                
                const ordersContainer = document.getElementById('restaurantOrders');
                ordersContainer.innerHTML = orders.map(order => `
                    <div style="background: white; padding: 1.5rem; border-radius: 15px; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                            <div>
                                <strong>Đơn hàng #${order.id}</strong><br>
                                <small>${new Date(order.created_at).toLocaleString('vi-VN')}</small>
                            </div>
                            <span style="padding: 0.5rem 1rem; border-radius: 20px; background: ${getStatusColor(order.status)}; color: white;">
                                ${getStatusText(order.status)}
                            </span>
                        </div>
                        <div>
                            ${order.items.map(item => `<div>${item.product_name} x${item.quantity}</div>`).join('')}
                        </div>
                        <div style="margin-top: 1rem; font-weight: bold;">
                            Tổng: ${formatCurrency(order.total_amount)}
                        </div>
                        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="updateOrderStatus(${order.id}, '${getNextStatus(order.status)}')">
                            Cập nhật trạng thái
                        </button>
                    </div>
                `).join('') || '<p style="text-align: center;">Chưa có đơn hàng nào</p>';
                
            } catch (error) {
                console.error('Error loading restaurant data:', error);
            } finally {
                showLoading(false);
            }
        }

        async function updateOrderStatus(orderId, newStatus) {
            showLoading(true);
            try {
                const response = await fetch(`${API.ORDER}/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (!response.ok) throw new Error('Không thể cập nhật');
                
                showAlert('Đã cập nhật trạng thái đơn hàng', 'success');
                loadRestaurantData();
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        // Modal Functions
        function showAddRestaurantModal() {
            document.getElementById('addRestaurantModal').classList.add('active');
        }

        function showAddProductModal() {
            document.getElementById('addProductModal').classList.add('active');
        }

        function showAddDroneModal() {
            document.getElementById('addDroneModal').classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        async function handleAddRestaurant(e) {
            e.preventDefault();
            showLoading(true);
            
            const data = {
                email: document.getElementById('resEmail').value,
                username: document.getElementById('resUsername').value,
                password: document.getElementById('resPassword').value,
                restaurant_name: document.getElementById('resName').value,
                restaurant_description: document.getElementById('resDesc').value,
                role: 'restaurant'
            };
            
            try {
                const response = await fetch(`${API.USER}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Không thể thêm nhà hàng');
                
                showAlert('Đã thêm nhà hàng thành công', 'success');
                closeModal('addRestaurantModal');
                loadAdminData();
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        async function handleAddProduct(e) {
            e.preventDefault();
            showLoading(true);
            
            const data = {
                restaurant_id: currentUser.id,
                name: document.getElementById('prodName').value,
                description: document.getElementById('prodDesc').value,
                price: parseFloat(document.getElementById('prodPrice').value),
                category: document.getElementById('prodCategory').value,
                preparation_time: parseInt(document.getElementById('prodTime').value)
            };
            
            try {
                const response = await fetch(`${API.PRODUCT}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Không thể thêm món');
                
                showAlert('Đã thêm món ăn thành công', 'success');
                closeModal('addProductModal');
                loadRestaurantData();
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        async function handleAddDrone(e) {
            e.preventDefault();
            showLoading(true);
            
            const data = {
                name: document.getElementById('droneName').value,
                model: document.getElementById('droneModel').value,
                max_payload: parseFloat(document.getElementById('dronePayload').value)
            };
            
            try {
                const response = await fetch(`${API.ORDER}/drones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Không thể thêm drone');
                
                showAlert('Đã thêm drone thành công', 'success');
                closeModal('addDroneModal');
                loadAdminData();
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        async function deleteProduct(productId) {
            if (!confirm('Bạn có chắc muốn xóa món này?')) return;
            
            showLoading(true);
            try {
                const response = await fetch(`${API.PRODUCT}/products/${productId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Không thể xóa');
                
                showAlert('Đã xóa món ăn', 'success');
                loadRestaurantData();
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        // Utility Functions
        function showLoading(show) {
            document.getElementById('loadingOverlay').classList.toggle('active', show);
        }

        function showAlert(message, type) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.textContent = message;
            document.body.appendChild(alert);
            
            setTimeout(() => alert.remove(), 3000);
        }

        function formatCurrency(amount) {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        }

        function getStatusText(status) {
            const map = {
                'pending': 'Chờ xác nhận',
                'confirmed': 'Đã xác nhận',
                'preparing': 'Đang chuẩn bị',
                'ready': 'Sẵn sàng',
                'in_delivery': 'Đang giao',
                'delivered': 'Đã giao',
                'cancelled': 'Đã hủy'
            };
            return map[status] || status;
        }

        function getStatusColor(status) {
            const map = {
                'pending': '#ffc107',
                'confirmed': '#2196f3',
                'preparing': '#ff5722',
                'ready': '#4caf50',
                'in_delivery': '#9c27b0',
                'delivered': '#4caf50',
                'cancelled': '#f44336'
            };
            return map[status] || '#666';
        }

        function getNextStatus(currentStatus) {
            const sequence = ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'];
            const currentIndex = sequence.indexOf(currentStatus);
            return sequence[currentIndex + 1] || currentStatus;
        }

        function getDroneStatusText(status) {
            const map = {
                'idle': 'Sẵn sàng',
                'in_use': 'Đang giao hàng',
                'maintenance': 'Bảo trì'
            };
            return map[status] || status;
        }

        function getDroneStatusColor(status) {
            const map = {
                'idle': '#4caf50',
                'in_use': '#ff9800',
                'maintenance': '#f44336'
            };
            return map[status] || '#666';
        }
