/* SCRIPT KHỞI TẠO DATABASES CHO DRONE DELIVERY MICROSERVICES
   - Pass mặc định cho tất cả user: 123456
*/

USE master;
GO

-- ====================================================
-- 1. USER SERVICE (Database: UserDB)
-- ====================================================
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'UserDB') BEGIN CREATE DATABASE UserDB; END
GO
USE UserDB;
GO

IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name NVARCHAR(255),
    phone VARCHAR(20),
    address NVARCHAR(500),
    role VARCHAR(20) DEFAULT 'customer',
    is_active INT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    restaurant_name NVARCHAR(255),
    restaurant_description NVARCHAR(MAX),
    restaurant_image VARCHAR(500),
    city NVARCHAR(100),
    status VARCHAR(20) DEFAULT 'active'
);

-- Seed Data Users (Pass: 123456)
-- Hash này đã được kiểm tra kỹ: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4h/j.8h9.e
INSERT INTO users (username, email, hashed_password, full_name, role, restaurant_name, restaurant_description, restaurant_image, city) VALUES 
('admin', 'admin@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4h/j.8h9.e', 'System Admin', 'admin', NULL, NULL, NULL, NULL),
('comtam_cali', 'comtam@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4h/j.8h9.e', 'Chu Quan Com', 'restaurant', N'Cơm Tấm Cali', N'Cơm tấm sườn bì chả nướng than hoa trứ danh.', '/static/images/res1.jpg', N'Hồ Chí Minh'),
('pizza_hut', 'pizza@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4h/j.8h9.e', 'Quan Ly Pizza', 'restaurant', N'Pizza Hut', N'Hương vị Ý đích thực.', '/static/images/res2.jpg', N'Hà Nội'),
('khachhang1', 'khach1@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4h/j.8h9.e', N'Nguyễn Văn A', 'customer', NULL, NULL, NULL, N'Hồ Chí Minh');
GO

-- ====================================================
-- 2. PRODUCT SERVICE (Database: ProductDB)
-- ====================================================
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'ProductDB') BEGIN CREATE DATABASE ProductDB; END
GO
USE ProductDB;
GO

IF OBJECT_ID('products', 'U') IS NOT NULL DROP TABLE products;
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    restaurant_id INT NOT NULL, 
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    price FLOAT NOT NULL,
    original_price FLOAT,
    image_url VARCHAR(500),
    category NVARCHAR(100),
    is_available INT DEFAULT 1,
    stock_quantity INT DEFAULT 999,
    weight FLOAT DEFAULT 0.5,
    preparation_time INT DEFAULT 15,
    options NVARCHAR(MAX), 
    created_at DATETIME DEFAULT GETDATE()
);

IF OBJECT_ID('restaurant_hours', 'U') IS NOT NULL DROP TABLE restaurant_hours;
CREATE TABLE restaurant_hours (
    id INT IDENTITY(1,1) PRIMARY KEY,
    restaurant_id INT NOT NULL,
    monday_open VARCHAR(5), monday_close VARCHAR(5),
    tuesday_open VARCHAR(5), tuesday_close VARCHAR(5),
    wednesday_open VARCHAR(5), wednesday_close VARCHAR(5),
    thursday_open VARCHAR(5), thursday_close VARCHAR(5),
    friday_open VARCHAR(5), friday_close VARCHAR(5),
    saturday_open VARCHAR(5), saturday_close VARCHAR(5),
    sunday_open VARCHAR(5), sunday_close VARCHAR(5),
    is_24h INT DEFAULT 0
);

INSERT INTO products (restaurant_id, name, price, description, image_url, category, stock_quantity) VALUES 
(2, N'Cơm Sườn Bì Chả', 65000, N'Dĩa cơm đầy đủ topping sườn nướng, bì thính, chả trứng.', '', N'Cơm', 100),
(2, N'Cơm Gà Xối Mỡ', 55000, N'Đùi gà góc tư chiên giòn tan.', '', N'Cơm', 50),
(3, N'Pizza Hải Sản Pesto', 189000, N'Tôm, mực, nghêu và sốt Pesto xanh.', '', N'Pizza', 20),
(3, N'Mỳ Ý Bò Bằm', 89000, N'Sốt Bolognese bò bằm cà chua.', '', N'Mỳ Ý', 30);
GO

-- ====================================================
-- 3. ORDER SERVICE (Database: OrderDB)
-- ====================================================
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'OrderDB') BEGIN CREATE DATABASE OrderDB; END
GO
USE OrderDB;
GO

IF OBJECT_ID('order_items', 'U') IS NOT NULL DROP TABLE order_items;
IF OBJECT_ID('orders', 'U') IS NOT NULL DROP TABLE orders;
IF OBJECT_ID('drones', 'U') IS NOT NULL DROP TABLE drones;

CREATE TABLE drones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    model VARCHAR(100),
    status VARCHAR(20) DEFAULT 'idle',
    battery_level FLOAT DEFAULT 100.0,
    max_payload FLOAT DEFAULT 5.0,
    max_distance_km FLOAT DEFAULT 15.0,
    current_lat FLOAT,
    current_lng FLOAT,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    total_amount FLOAT NOT NULL,
    total_weight FLOAT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'waiting_confirmation',
    delivery_address NVARCHAR(500) NOT NULL,
    delivery_lat FLOAT,
    delivery_lng FLOAT,
    restaurant_lat FLOAT,
    restaurant_lng FLOAT,
    distance_km FLOAT,
    drone_id INT, 
    estimated_delivery_time INT DEFAULT 30,
    rejection_reason NVARCHAR(MAX),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name NVARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price FLOAT NOT NULL,
    weight FLOAT DEFAULT 0.5,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO drones (name, model, status, battery_level, current_lat, current_lng) VALUES 
(N'Drone Alpha 01', 'DJI-Pro', 'idle', 100.0, 10.762622, 106.660172),
(N'Drone Beta 02', 'DJI-Air', 'idle', 95.0, 10.762622, 106.660172),
(N'Drone Gamma 03', 'DJI-Mini', 'maintenance', 10.0, 10.762622, 106.660172);
GO

-- ====================================================
-- 4. PAYMENT SERVICE (Database: PaymentDB)
-- ====================================================
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'PaymentDB') BEGIN CREATE DATABASE PaymentDB; END
GO
USE PaymentDB;
GO

IF OBJECT_ID('payments', 'U') IS NOT NULL DROP TABLE payments;
CREATE TABLE payments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    amount FLOAT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    transaction_id VARCHAR(255) UNIQUE,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO