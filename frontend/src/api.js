import axios from 'axios';

// ==========================================
// CẤU HÌNH API - DÙNG API GATEWAY
// ==========================================
const API_GATEWAY = 'http://localhost:8000'; // ← API Gateway làm điểm vào duy nhất

// Định nghĩa các route path cho từng service
const SERVICE_PATHS = {
    USER: '/api/users',      // Route đến user_service
    PRODUCT: '/api/products', // Route đến product_service  
    ORDER: '/api/orders',     // Route đến order_service
    PAYMENT: '/api/payments'  // Route đến payment_service
};

// Helper lấy URL ảnh từ Product Service
export const getImageUrl = (path) => {
    if (!path) return 'https://placehold.co/400x300?text=No+Image';
    if (path.startsWith('http')) return path;
    
    // Ảnh được serve từ Product Service qua Gateway
    return `${API_GATEWAY}/api/products${path}`;
};

// ==========================================
// TẠO AXIOS CLIENTS
// ==========================================
const createClient = (servicePath) => {
    const client = axios.create({ 
        baseURL: `${API_GATEWAY}${servicePath}`,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    // Interceptor tự động thêm token vào mọi request
    client.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }, (error) => {
        return Promise.reject(error);
    });
    
    // Interceptor xử lý lỗi response
    client.interceptors.response.use(
        (response) => response,
        (error) => {
            // Auto logout nếu token hết hạn
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );
    
    return client;
};

// Export các API clients
export const userApi = createClient(SERVICE_PATHS.USER);
export const productApi = createClient(SERVICE_PATHS.PRODUCT);
export const orderApi = createClient(SERVICE_PATHS.ORDER);
export const paymentApi = createClient(SERVICE_PATHS.PAYMENT);

// ==========================================
// SPECIAL ENDPOINTS (Không theo pattern /api/xxx)
// ==========================================

// Các endpoint đặc biệt không qua service path
export const authApi = {
    login: (credentials) => 
        axios.post(`${API_GATEWAY}/token`, credentials),
    
    register: (userData) => 
        axios.post(`${API_GATEWAY}/register`, userData),
    
    verifyToken: (token) =>
        axios.get(`${API_GATEWAY}/verify-token`, {
            headers: { Authorization: `Bearer ${token}` }
        })
};

// Export API Gateway URL cho các trường hợp đặc biệt
export const API_BASE = API_GATEWAY;