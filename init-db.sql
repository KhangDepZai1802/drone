USE master;
GO

-- 1. Tạo Database mới (Nếu chưa có)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'FoodFastDB')
BEGIN
    CREATE DATABASE FoodFastDB;
END
GO

USE FoodFastDB;
GO

-- =============================================
-- 2. XÓA BẢNG CŨ (để làm sạch nếu chạy lại)
-- =============================================
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS drones;
DROP TABLE IF EXISTS restaurants;
DROP TABLE IF EXISTS users;
GO

-- =============================================
-- 3. TẠO BẢNG NGƯỜI DÙNG (USERS)
-- =============================================
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Lưu mật khẩu đã mã hóa
    full_name NVARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address NVARCHAR(255),
    role VARCHAR(20) DEFAULT 'customer', -- 'admin', 'restaurant', 'customer'
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

-- =============================================
-- 4. TẠO BẢNG NHÀ HÀNG (RESTAURANTS)
-- =============================================
CREATE TABLE restaurants (
    id INT IDENTITY(1,1) PRIMARY KEY,
    owner_id INT NOT NULL, -- Liên kết với tài khoản chủ nhà hàng
    restaurant_name NVARCHAR(100) NOT NULL,
    restaurant_description NVARCHAR(500),
    address NVARCHAR(255),
    city NVARCHAR(50),
    phone VARCHAR(20),
    image_url VARCHAR(500), -- Ảnh đại diện nhà hàng
    rating FLOAT DEFAULT 5.0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- =============================================
-- 5. TẠO BẢNG MÓN ĂN (PRODUCTS)
-- =============================================
-- Khớp với Form "Thêm món" trong HTML của bạn
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    price FLOAT NOT NULL,
    original_price FLOAT, -- Giá gốc (để gạch ngang nếu khuyến mãi)
    image_url VARCHAR(500),
    category NVARCHAR(100), -- Phở, Cơm, Bún...
    preparation_time INT DEFAULT 15, -- Thời gian chuẩn bị (phút) - Khớp input prodTime
    is_available BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- =============================================
-- 6. TẠO BẢNG DRONE (DRONES)
-- =============================================
CREATE TABLE drones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(50) NOT NULL,
    model VARCHAR(50),
    battery_level FLOAT DEFAULT 100.0,
    current_location NVARCHAR(100) DEFAULT 'Station',
    status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'delivering', 'charging', 'maintenance'
    max_payload FLOAT DEFAULT 5.0 -- Tải trọng tối đa (kg)
);

-- =============================================
-- 7. TẠO BẢNG ĐƠN HÀNG (ORDERS)
-- =============================================
CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    drone_id INT, -- Drone nào giao đơn này (có thể NULL lúc đầu)
    total_amount FLOAT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'
    delivery_address NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (drone_id) REFERENCES drones(id)
);

-- =============================================
-- 8. TẠO BẢNG CHI TIẾT ĐƠN HÀNG (ORDER_ITEMS)
-- =============================================
CREATE TABLE order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price FLOAT NOT NULL, -- Giá tại thời điểm mua (đề phòng giá món ăn thay đổi sau này)
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- =============================================
-- 9. TẠO BẢNG THANH TOÁN (PAYMENTS)
-- =============================================
CREATE TABLE payments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    amount FLOAT NOT NULL,
    payment_method VARCHAR(50), -- 'credit_card', 'cod', 'momo'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'paid', 'failed'
    transaction_id VARCHAR(100),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

GO

-- =============================================
-- 10. SEED DATA (Dữ liệu mẫu để test Web)
-- =============================================

-- A. Tạo User (Mật khẩu giả định là '123456')
INSERT INTO users (username, password_hash, full_name, role, email) VALUES 
('admin', 'hashed_pass_here', N'Admin Hệ Thống', 'admin', 'admin@foodfast.com'),
('res_comtam', 'hashed_pass_here', N'Chủ Quán Cơm', 'restaurant', 'comtam@foodfast.com'),
('res_pho', 'hashed_pass_here', N'Chủ Quán Phở', 'restaurant', 'pho@foodfast.com'),
('khachhang1', 'hashed_pass_here', N'Nguyễn Văn A', 'customer', 'a@gmail.com');

-- B. Tạo Nhà hàng (Liên kết với User Restaurant)
INSERT INTO restaurants (owner_id, restaurant_name, restaurant_description, city, rating) VALUES 
(2, N'Cơm Tấm Sài Gòn 1990', N'Cơm tấm sườn bì chả nướng than hoa.', N'Hồ Chí Minh', 4.8),
(3, N'Phở Gia Truyền Nam Định', N'Nước dùng hầm xương ống 24h ngọt lịm.', N'Hà Nội', 4.5);

-- C. Tạo Drones
INSERT INTO drones (name, model, status) VALUES 
(N'Drone Alpha 01', 'DJI-X1', 'idle'),
(N'Drone Beta 02', 'DJI-X2', 'charging'),
(N'Drone Gamma 03', 'DJI-Pro', 'maintenance');

-- D. Tạo Món ăn (Khớp logic bảng Product)
INSERT INTO products (restaurant_id, name, price, category, preparation_time, description) VALUES 
(1, N'Cơm Sườn Bì Chả', 55000, N'Cơm', 15, N'Dĩa cơm đầy đủ topping.'),
(1, N'Cơm Gà Xối Mỡ', 45000, N'Cơm', 20, N'Gà chiên giòn rụm.'),
(2, N'Phở Bò Tái Lăn', 60000, N'Phở', 10, N'Thịt bò xào lăn thơm phức.');

GO