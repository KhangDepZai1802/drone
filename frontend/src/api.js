import axios from 'axios';

// URL backend (Hardcode cho Docker local)
const API_URLS = {
    USER: 'http://localhost:8001',
    PRODUCT: 'http://localhost:8002',
    ORDER: 'http://localhost:8003',
    PAYMENT: 'http://localhost:8004'
};

export const getImageUrl = (path) => {
    if (!path) return 'https://placehold.co/400x300?text=No+Image';
    if (path.startsWith('http')) return path;
    return `http://localhost:8002${path}`;
};

// Helper tạo request có kèm token
const createClient = (baseUrl) => {
    const client = axios.create({ baseURL: baseUrl });
    client.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
    return client;
};

export const userApi = createClient(API_URLS.USER);
export const productApi = createClient(API_URLS.PRODUCT);
export const orderApi = createClient(API_URLS.ORDER);
export const paymentApi = createClient(API_URLS.PAYMENT);