// ============================================
// CONFIGURATION
// ============================================
let token = null;
let currentUser = null;

const API = {
    USER: 'http://localhost/api/users',
    PRODUCT: 'http://localhost/api/products',
    ORDER: 'http://localhost/api/orders',
    PAYMENT: 'http://localhost/api/payments'
};

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof updateNavbar === 'function') {
        updateNavbar();
    }
}

function getImageUrl(imagePath) {
    if (!imagePath || imagePath === 'null' || imagePath === 'undefined' || imagePath === '' || imagePath === 'None') {
        return 'https://via.placeholder.com/300x200?text=No+Image';
    }
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    let cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    if (cleanPath.startsWith('static/')) {
        return `http://localhost/api/products/${cleanPath}`;
    }
    
    return `http://localhost/api/products/static/images/${cleanPath}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value);
}

console.log('✅ Config loaded');
console.log('API:', API);