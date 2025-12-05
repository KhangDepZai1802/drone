/* ============================================
   FOODFAST DRONE DELIVERY - DATABASE INIT
   Realistic Data for Demo
   Password: 123456 (hashed)
   ============================================ */

USE master;
GO

-- Create Databases
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'UserServiceDB')
    CREATE DATABASE UserServiceDB;
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'ProductServiceDB')
    CREATE DATABASE ProductServiceDB;
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'OrderServiceDB')
    CREATE DATABASE OrderServiceDB;
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'PaymentServiceDB')
    CREATE DATABASE PaymentServiceDB;
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'DroneServiceDB')
    CREATE DATABASE DroneServiceDB;
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'CartServiceDB')
    CREATE DATABASE CartServiceDB;
GO

-- ==========================================
-- USER SERVICE DB
-- ==========================================
USE UserServiceDB;
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
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    restaurant_name NVARCHAR(255),
    restaurant_description NVARCHAR(MAX),
    restaurant_image VARCHAR(500),
    restaurant_lat FLOAT,
    restaurant_lng FLOAT,
    city NVARCHAR(100),
    status VARCHAR(20) DEFAULT 'active'
);

-- Admin (Password: 123456)
INSERT INTO users VALUES 
('admin', 'admin@foodfast.vn', '$2b$12$PxVVMg.DNaTcjj4XMk4Dd.Av5AMIAYs5R17mkOYNou/AuMLY2c87W', 
 N'Administrator', '0909000000', N'Foodfast HQ', 'admin', 1, GETDATE(), 
 NULL, NULL, NULL, NULL, NULL, NULL, 'active');

-- Restaurants (Saigon locations)
INSERT INTO users VALUES 
('kfc_benthanhmarket', 'kfc@foodfast.vn', '$2b$12$PxVVMg.DNaTcjj4XMk4Dd.Av5AMIAYs5R17mkOYNou/AuMLY2c87W',
 N'KFC Manager', '19006886', N'Chợ Bến Thành, Quận 1', 'restaurant', 1, GETDATE(),
 N'KFC Bến Thành', N'Gà rán Kentucky chuẩn vị Mỹ', 'https://static.kfcvietnam.com.vn/images/content/home/carousel/3.jpg',
 10.772928, 106.698242, N'Hồ Chí Minh', 'active');

INSERT INTO users VALUES 
('phuclong_nguyenhue', 'phuclong@foodfast.vn', '$2b$12$PxVVMg.DNaTcjj4XMk4Dd.Av5AMIAYs5R17mkOYNou/AuMLY2c87W',
 N'Phúc Long Manager', '02862630377', N'Đường Nguyễn Huệ, Quận 1', 'restaurant', 1, GETDATE(),
 N'Phúc Long Nguyễn Huệ', N'Trà sữa và cà phê thượng hạng', 'https://phuclong.com.vn/uploads/store/0530467772637255d642b58872658a2d.jpg',
 10.774670, 106.701100, N'Hồ Chí Minh', 'active');

INSERT INTO users VALUES 
('pizza4ps_lethitho', 'pizza4ps@foodfast.vn', '$2b$12$PxVVMg.DNaTcjj4XMk4Dd.Av5AMIAYs5R17mkOYNou/AuMLY2c87W',
 N'Pizza 4Ps Manager', '19006043', N'Lê Thánh Tôn, Quận 1', 'restaurant', 1, GETDATE(),
 N'Pizza 4P''s Signature', N'Pizza phô mai tươi kiểu Nhật', 'https://pizza4ps.com/wp-content/uploads/2021/08/Pizza-4Ps-Ben-Thanh-1.jpg',
 10.775245, 106.699563, N'Hồ Chí Minh', 'active');

-- Customers
INSERT INTO users VALUES 
('khang_customer', 'khang@gmail.com', '$2b$12$PxVVMg.DNaTcjj4XMk4Dd.Av5AMIAYs5R17mkOYNou/AuMLY2c87W',
 N'Lê Duy Khang', '0987654321', N'Đại học Sài Gòn, Quận 5', 'customer', 1, GETDATE(),
 NULL, NULL, NULL, NULL, NULL, N'Hồ Chí Minh', NULL);

INSERT INTO users VALUES 
('doanh_customer', 'doanh@gmail.com', '$2b$12$PxVVMg.DNaTcjj4XMk4Dd.Av5AMIAYs5R17mkOYNou/AuMLY2c87W',
 N'Quách Khả Doanh', '0912345678', N'Landmark 81, Bình Thạnh', 'customer', 1, GETDATE(),
 NULL, NULL, NULL, NULL, NULL, N'Hồ Chí Minh', NULL);
GO

-- ==========================================
-- PRODUCT SERVICE DB
-- ==========================================
USE ProductServiceDB;
GO

IF OBJECT_ID('products', 'U') IS NOT NULL DROP TABLE products;
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    price FLOAT NOT NULL,
    image_url VARCHAR(500),
    category NVARCHAR(100),
    is_available BIT DEFAULT 1,
    stock_quantity INT DEFAULT 100,
    weight FLOAT DEFAULT 0.5,
    preparation_time INT DEFAULT 15,
    created_at DATETIME DEFAULT GETDATE()
);

-- KFC Products (restaurant_id: 2)
INSERT INTO products VALUES 
(2, N'Combo Gà Rán 2 Miếng', N'2 miếng gà giòn cay + 1 khoai tây chiên vừa + Pepsi', 89000, 
 'https://static.kfcvietnam.com.vn/images/items/lg/Combo-Ga-Ran-A.jpg', N'Combo', 1, 50, 0.8, 15, GETDATE()),
(2, N'Gà Popcorn Vừa', N'Gà viên chiên giòn rụm lắc phô mai', 45000, 
 'https://static.kfcvietnam.com.vn/images/items/lg/Popcorn-Vua.jpg', N'Gà Rán', 1, 100, 0.3, 10, GETDATE()),
(2, N'Burger Zinger', N'Bánh mì kẹp phi lê gà giòn cay', 59000, 
 'https://static.kfcvietnam.com.vn/images/items/lg/Burger-Zinger.jpg', N'Burger', 1, 30, 0.4, 12, GETDATE());

-- Phúc Long Products (restaurant_id: 3)
INSERT INTO products VALUES 
(3, N'Trà Sữa Phúc Long', N'Trà đen đậm đà pha sữa béo ngậy', 55000, 
 'https://phuclong.com.vn/uploads/dish/062d989359a686-trasuaphuclong.png', N'Trà Sữa', 1, 200, 0.5, 5, GETDATE()),
(3, N'Trà Đào Cam Sả', N'Trà đen ủ lạnh với đào tươi', 60000, 
 'https://phuclong.com.vn/uploads/dish/64a6c406981881-tradaocamsa.png', N'Trà Trái Cây', 1, 150, 0.5, 8, GETDATE()),
(3, N'Cà Phê Sữa Đá', N'Cà phê phin truyền thống', 45000, 
 'https://phuclong.com.vn/uploads/dish/d56545129995fd-caphesuada.png', N'Cà Phê', 1, 300, 0.4, 5, GETDATE());

-- Pizza 4Ps Products (restaurant_id: 4)
INSERT INTO products VALUES 
(4, N'Pizza 4 Cheese Honey', N'Pizza 4 loại phô mai + mật ong rừng', 280000, 
 'https://delivery.pizza4ps.com/wp-content/uploads/2021/08/4-Cheese-Honey.jpg', N'Pizza', 1, 20, 0.9, 25, GETDATE()),
(4, N'Mỳ Cua Sốt Kem', N'Mỳ Ý sốt kem cà chua với thịt cua', 195000, 
 'https://delivery.pizza4ps.com/wp-content/uploads/2021/08/Crab-Tomato-Cream.jpg', N'Pasta', 1, 30, 0.6, 20, GETDATE());
GO

-- ==========================================
-- DRONE SERVICE DB ⭐
-- ==========================================
USE DroneServiceDB;
GO

IF OBJECT_ID('drones', 'U') IS NOT NULL DROP TABLE drones;
CREATE TABLE drones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    model VARCHAR(100),
    status VARCHAR(20) DEFAULT 'idle',
    battery_level FLOAT DEFAULT 100.0,
    max_payload FLOAT DEFAULT 5.0,
    max_distance_km FLOAT DEFAULT 30.0,
    current_lat FLOAT DEFAULT 10.762622,
    current_lng FLOAT DEFAULT 106.660172,
    base_lat FLOAT DEFAULT 10.762622,
    base_lng FLOAT DEFAULT 106.660172,
    created_at DATETIME DEFAULT GETDATE()
);

-- Sample Drones
INSERT INTO drones VALUES 
(N'FoodFast Drone Alpha', 'DJI Matrice 300', 'idle', 100.0, 5.0, 30.0, 
 10.762622, 106.660172, 10.762622, 106.660172, GETDATE()),
(N'FoodFast Drone Beta', 'DJI Mavic 3 Pro', 'idle', 95.0, 3.0, 25.0, 
 10.762622, 106.660172, 10.762622, 106.660172, GETDATE()),
(N'FoodFast Drone Gamma', 'Custom FPV', 'charging', 15.0, 2.0, 20.0, 
 10.762622, 106.660172, 10.762622, 106.660172, GETDATE());

-- Drone Tracking History
IF OBJECT_ID('drone_tracking', 'U') IS NOT NULL DROP TABLE drone_tracking;
CREATE TABLE drone_tracking (
    id INT IDENTITY(1,1) PRIMARY KEY,
    drone_id INT NOT NULL,
    order_id INT,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    altitude FLOAT DEFAULT 0,
    speed FLOAT DEFAULT 0,
    battery_level FLOAT,
    status VARCHAR(50),
    timestamp DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================
-- ORDER SERVICE DB
-- ==========================================
USE OrderServiceDB;
GO

IF OBJECT_ID('order_items', 'U') IS NOT NULL DROP TABLE order_items;
IF OBJECT_ID('order_status_history', 'U') IS NOT NULL DROP TABLE order_status_history;
IF OBJECT_ID('orders', 'U') IS NOT NULL DROP TABLE orders;

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

CREATE TABLE order_status_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_by INT,
    role VARCHAR(50),
    note NVARCHAR(MAX),
    changed_at DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================
-- PAYMENT SERVICE DB
-- ==========================================
USE PaymentServiceDB;
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

-- ==========================================
-- CART SERVICE DB
-- ==========================================
USE CartServiceDB;
GO

IF OBJECT_ID('cart_items', 'U') IS NOT NULL DROP TABLE cart_items;
CREATE TABLE cart_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    added_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT UK_Cart UNIQUE (user_id, product_id)
);
GO

PRINT '✅ All databases initialized successfully!'
PRINT '📊 Default accounts:'
PRINT '   Admin: admin / 123456'
PRINT '   Customer: khang_customer / 123456'
PRINT '   Restaurant: kfc_benthanhmarket / 123456'
PRINT '🚁 3 Drones ready for deployment!'
GO