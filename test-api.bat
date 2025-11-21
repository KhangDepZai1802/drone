@echo off
echo ========================================
echo   Testing Drone Delivery APIs
echo ========================================
echo.

echo Testing User Service...
curl -s http://localhost:8001/ || echo Failed to connect to User Service
echo.

echo Testing Product Service...
curl -s http://localhost:8002/ || echo Failed to connect to Product Service
echo.

echo Testing Order Service...
curl -s http://localhost:8003/ || echo Failed to connect to Order Service
echo.

echo Testing Payment Service...
curl -s http://localhost:8004/ || echo Failed to connect to Payment Service
echo.

echo.
echo ========================================
echo Creating test data...
echo ========================================
echo.

echo Registering customer...
curl -X POST "http://localhost:8001/register" -H "Content-Type: application/json" -d "{\"email\":\"customer@test.com\",\"username\":\"customer1\",\"password\":\"123456\",\"full_name\":\"Nguyen Van A\",\"role\":\"customer\",\"address\":\"123 Nguyen Hue, Q1, TPHCM\",\"phone\":\"0901234567\"}"
echo.
echo.

echo Registering restaurant...
curl -X POST "http://localhost:8001/register" -H "Content-Type: application/json" -d "{\"email\":\"restaurant@test.com\",\"username\":\"restaurant1\",\"password\":\"123456\",\"role\":\"restaurant\",\"restaurant_name\":\"Nha Hang Ngon\",\"restaurant_description\":\"Chuyen mon an Viet\"}"
echo.
echo.

echo Creating sample products...
curl -X POST "http://localhost:8002/products" -H "Content-Type: application/json" -d "{\"restaurant_id\":2,\"name\":\"Pho Bo\",\"description\":\"Pho bo truyen thong Ha Noi\",\"price\":50000,\"category\":\"Pho\",\"preparation_time\":15}"
echo.
curl -X POST "http://localhost:8002/products" -H "Content-Type: application/json" -d "{\"restaurant_id\":2,\"name\":\"Bun Cha\",\"description\":\"Bun cha Hanoi dac biet\",\"price\":45000,\"category\":\"Bun\",\"preparation_time\":20}"
echo.
curl -X POST "http://localhost:8002/products" -H "Content-Type: application/json" -d "{\"restaurant_id\":2,\"name\":\"Com Tam\",\"description\":\"Com tam suon bi cha\",\"price\":40000,\"category\":\"Com\",\"preparation_time\":18}"
echo.
echo.

echo ========================================
echo Test completed!
echo ========================================
echo.
echo You can now:
echo 1. Open http://localhost:3000 in browser
echo 2. Login with username: customer1, password: 123456
echo 3. Browse restaurants and order food
echo.
pause