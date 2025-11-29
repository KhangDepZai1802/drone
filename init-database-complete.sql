-- ============================================
-- DRONE FOOD DELIVERY - DATABASE INIT SCRIPT
-- ============================================

-- Kết nối vào SQL Server
-- docker exec -it shared_db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P Khangle18 -C

-- ============================================
-- 1. XÓA DATABASES CŨ (NẾU CẦN RESET)
-- ============================================
USE master;
GO

-- Ngắt kết nối
ALTER DATABASE UserDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
ALTER DATABASE ProductDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
ALTER DATABASE OrderDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
ALTER DATABASE PaymentDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Xóa databases
DROP DATABASE IF EXISTS UserDB;
DROP DATABASE IF EXISTS ProductDB;
DROP DATABASE IF EXISTS OrderDB;
DROP DATABASE IF EXISTS PaymentDB;
GO

-- ============================================
-- 2. TẠO LẠI DATABASES
-- ============================================
CREATE DATABASE UserDB;
CREATE DATABASE ProductDB;
CREATE DATABASE OrderDB;
CREATE DATABASE PaymentDB;
GO

-- ============================================
-- 3. USERDB - USERS & RESTAURANTS
-- ============================================
USE UserDB;
GO

-- Users table
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    address VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    role VARCHAR(20) DEFAULT 'customer',
    is_active INT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    
    -- Restaurant specific fields
    restaurant_name VARCHAR(255),
    restaurant_description VARCHAR(MAX),
    restaurant_image VARCHAR(500),
    city VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- Insert admin account
INSERT INTO users (email, username, hashed_password, full_name, role)
VALUES ('admin@system.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zyPzQnSz6yxu', 'System Admin', 'admin');
-- Password: admin123

-- Insert sample customer
INSERT INTO users (email, username, hashed_password, full_name, phone, address, role, latitude, longitude)
VALUES (
    'khach@gmail.com', 
    'khach1', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zyPzQnSz6yxu',
    'Nguyen Van Khach',
    '0901234567',
    '123 Nguyen Hue, Quan 1, TP.HCM',
    'customer',
    10.774933,
    106.700981
);
-- Password: 123456

-- Insert sample restaurants
INSERT INTO users (email, username, hashed_password, full_name, role, restaurant_name, restaurant_description, city, latitude, longitude)
VALUES 
(
    'res_pho@mail.com',
    'res_pho',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zyPzQnSz6yxu',
    'Manager Pho',
    'restaurant',
    'Pho Ngon 24h',
    'Pho bo truyen thong Ha Noi. Nuoc dung ham xuong ong 12 tieng',
    'Ho Chi Minh',
    10.762622,
    106.660172
),
(
    'res_pizza@mail.com',
    'res_pizza',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zyPzQnSz6yxu',
    'Manager Pizza',
    'restaurant',
    'Pizza Italia',
    'Pizza nuong cui chuan Y. Nguyen lieu nhap khau 100%',
    'Ho Chi Minh',
    10.763420,
    106.682800
),
(
    'res_burger@mail.com',
    'res_burger',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zyPzQnSz6yxu',
    'Manager Burger',
    'restaurant',
    'Burger King VN',
    'Burger bo My cao cap. Combo sieu re chi tu 99k',
    'Ho Chi Minh',
    10.780000,
    106.695000
);
-- Password: 123456 for all

GO

-- ============================================
-- 4. PRODUCTDB - PRODUCTS & HOURS
-- ============================================
USE ProductDB;
GO

-- Products table
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(MAX),
    price FLOAT NOT NULL,
    original_price FLOAT,
    image_url VARCHAR(500),
    category VARCHAR(100),
    is_available INT DEFAULT 1,
    stock_quantity INT DEFAULT 999,
    weight FLOAT DEFAULT 0.5,
    preparation_time INT DEFAULT 15,
    options VARCHAR(MAX), -- JSON format
    created_at DATETIME DEFAULT GETDATE(),
    
    INDEX idx_restaurant_id (restaurant_id),
    INDEX idx_category (category),
    INDEX idx_available (is_available)
);

-- Restaurant Hours table
CREATE TABLE restaurant_hours (
    id INT IDENTITY(1,1) PRIMARY KEY,
    restaurant_id INT UNIQUE NOT NULL,
    monday_open VARCHAR(5),
    monday_close VARCHAR(5),
    tuesday_open VARCHAR(5),
    tuesday_close VARCHAR(5),
    wednesday_open VARCHAR(5),
    wednesday_close VARCHAR(5),
    thursday_open VARCHAR(5),
    thursday_close VARCHAR(5),
    friday_open VARCHAR(5),
    friday_close VARCHAR(5),
    saturday_open VARCHAR(5),
    saturday_close VARCHAR(5),
    sunday_open VARCHAR(5),
    sunday_close VARCHAR(5),
    is_24h INT DEFAULT 0,
    
    INDEX idx_restaurant_id (restaurant_id)
);

-- Insert sample products (restaurant_id từ UserDB)
-- Pho Ngon (ID = 2 từ UserDB)
INSERT INTO products (restaurant_id, name, description, price, category, weight, stock_quantity)
VALUES 
(2, 'Pho Bo Tai', 'Pho bo voi thit tai mem', 55000, 'Pho', 0.8, 50),
(2, 'Pho Ga', 'Pho ga tuoi ngon', 45000, 'Pho', 0.7, 50),
(2, 'Pho Bo Vien', 'Pho bo vien dai ngon', 50000, 'Pho', 0.75, 50);

-- Pizza Italia (ID = 3)
INSERT INTO products (restaurant_id, name, description, price, category, weight, stock_quantity)
VALUES 
(3, 'Pizza Hai San', 'Pizza tom muc ca hoi', 120000, 'Pizza', 1.2, 30),
(3, 'Pizza Pho Mai', 'Pizza 4 loai pho mai', 90000, 'Pizza', 1.0, 30),
(3, 'Pizza Thap Cam', 'Pizza thit bo, ga, xuc xich', 110000, 'Pizza', 1.3, 30);

-- Burger King (ID = 4)
INSERT INTO products (restaurant_id, name, description, price, category, weight, stock_quantity)
VALUES 
(4, 'Burger Bo Phomage', 'Burger bo pho mai cheddar', 65000, 'Burger', 0.4, 100),
(4, 'Burger Ga Sot Mayonnaise', 'Burger ga ran gion', 55000, 'Burger', 0.35, 100),
(4, 'Khoai Tay Chien Lon', 'Khoai tay chien gion rum', 30000, 'Snack', 0.3, 200);

-- Insert restaurant hours (Tất cả mở 08:00-22:00)
INSERT INTO restaurant_hours (restaurant_id, monday_open, monday_close, tuesday_open, tuesday_close, wednesday_open, wednesday_close, thursday_open, thursday_close, friday_open, friday_close, saturday_open, saturday_close, sunday_open, sunday_close)
VALUES 
(2, '08:00', '22:00', '08:00', '22:00', '08:00', '22:00', '08:00', '22:00', '08:00', '22:00', '08:00', '22:00', '08:00', '22:00'),
(3, '10:00', '23:00', '10:00', '23:00', '10:00', '23:00', '10:00', '23:00', '10:00', '23:00', '10:00', '23:00', '10:00', '23:00'),
(4, '09:00', '22:00', '09:00', '22:00', '09:00', '22:00', '09:00', '22:00', '09:00', '22:00', '09:00', '22:00', '09:00', '22:00');

GO

-- ============================================
-- 5. ORDERDB - ORDERS, ITEMS & DRONES
-- ============================================
USE OrderDB;
GO

-- Orders table
CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    total_amount FLOAT NOT NULL,
    total_weight FLOAT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'waiting_confirmation',
    delivery_address VARCHAR(500) NOT NULL,
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    restaurant_lat DECIMAL(10, 8),
    restaurant_lng DECIMAL(11, 8),
    distance_km FLOAT,
    drone_id INT,
    estimated_delivery_time INT DEFAULT 30,
    rejection_reason VARCHAR(MAX),
    notes VARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_restaurant_id (restaurant_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Order Items table
CREATE TABLE order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price FLOAT NOT NULL,
    weight FLOAT DEFAULT 0.5,
    
    INDEX idx_order_id (order_id)
);

-- Drones table
CREATE TABLE drones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    status VARCHAR(20) DEFAULT 'idle',
    battery_level FLOAT DEFAULT 100.0,
    max_payload FLOAT DEFAULT 5.0,
    max_distance_km FLOAT DEFAULT 15.0,
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    created_at DATETIME DEFAULT GETDATE(),
    
    INDEX idx_status (status),
    INDEX idx_battery (battery_level)
);

-- Insert sample drones
INSERT INTO drones (name, model, status, battery_level, max_payload, max_distance_km, current_lat, current_lng)
VALUES 
('Drone Alpha', 'DX-100', 'idle', 100.0, 5.0, 15.0, 10.762622, 106.660172),
('Drone Beta', 'DX-200', 'idle', 95.0, 7.0, 20.0, 10.762622, 106.660172),
('Drone Gamma', 'DX-300', 'idle', 88.0, 10.0, 25.0, 10.762622, 106.660172),
('Drone Delta', 'DX-100', 'idle', 75.0, 5.0, 15.0, 10.762622, 106.660172),
('Drone Echo', 'DX-400', 'charging', 15.0, 12.0, 30.0, 10.762622, 106.660172);

GO

-- ============================================
-- 6. PAYMENTDB - PAYMENTS
-- ============================================
USE PaymentDB;
GO

-- Payments table
CREATE TABLE payments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT UNIQUE NOT NULL,
    user_id INT NOT NULL,
    amount FLOAT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    transaction_id VARCHAR(255) UNIQUE,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    INDEX idx_order_id (order_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

GO

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Check UserDB
USE UserDB;
SELECT 'UserDB - Users' AS Info, COUNT(*) AS Count FROM users;
GO

-- Check ProductDB
USE ProductDB;
SELECT 'ProductDB - Products' AS Info, COUNT(*) AS Count FROM products;
SELECT 'ProductDB - Hours' AS Info, COUNT(*) AS Count FROM restaurant_hours;
GO

-- Check OrderDB
USE OrderDB;
SELECT 'OrderDB - Orders' AS Info, COUNT(*) AS Count FROM orders;
SELECT 'OrderDB - Drones' AS Info, COUNT(*) AS Count FROM drones;
GO

-- Check PaymentDB
USE PaymentDB;
SELECT 'PaymentDB - Payments' AS Info, COUNT(*) AS Count FROM payments;
GO

PRINT '============================================';
PRINT 'DATABASE INITIALIZATION COMPLETE!';
PRINT '============================================';
PRINT 'Login Credentials:';
PRINT '  Admin: admin / admin123';
PRINT '  Customer: khach1 / 123456';
PRINT '  Restaurant: res_pho / 123456';
PRINT '============================================';
GO