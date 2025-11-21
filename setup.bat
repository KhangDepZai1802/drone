@echo off
chcp 65001 >nul
cls

echo ========================================
echo   DRONE DELIVERY SYSTEM - SETUP
echo ========================================
echo.

echo [1/5] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)
echo ✓ Docker is installed

echo.
echo [2/5] Checking Docker is running...
docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✓ Docker is running

echo.
echo [3/5] Checking project structure...
if not exist "user_service\main.py" (
    echo ❌ ERROR: user_service\main.py not found!
    echo Please ensure all files are in the correct directories.
    pause
    exit /b 1
)
if not exist "product_service\main.py" (
    echo ❌ ERROR: product_service\main.py not found!
    pause
    exit /b 1
)
if not exist "order_service\main.py" (
    echo ❌ ERROR: order_service\main.py not found!
    pause
    exit /b 1
)
if not exist "payment_service\main.py" (
    echo ❌ ERROR: payment_service\main.py not found!
    pause
    exit /b 1
)
if not exist "frontend\index.html" (
    echo ❌ ERROR: frontend\index.html not found!
    pause
    exit /b 1
)
if not exist "docker-compose.yml" (
    echo ❌ ERROR: docker-compose.yml not found!
    pause
    exit /b 1
)
echo ✓ All files are present

echo.
echo [4/5] Building Docker images...
echo This may take 5-10 minutes on first run...
docker-compose build
if errorlevel 1 (
    echo ❌ ERROR: Build failed!
    pause
    exit /b 1
)
echo ✓ Build completed

echo.
echo [5/5] Starting services...
docker-compose up -d
if errorlevel 1 (
    echo ❌ ERROR: Failed to start services!
    pause
    exit /b 1
)
echo ✓ Services started

echo.
echo ========================================
echo   SETUP COMPLETED SUCCESSFULLY! ✓
echo ========================================
echo.
echo Services are starting up...
echo Please wait 1-2 minutes for all services to be ready.
echo.
echo 📍 Access Points:
echo   Frontend:        http://localhost:3000
echo   User API:        http://localhost:8001/docs
echo   Product API:     http://localhost:8002/docs
echo   Order API:       http://localhost:8003/docs
echo   Payment API:     http://localhost:8004/docs
echo   API Gateway:     http://localhost:80
echo.
echo 🔧 Management Commands:
echo   View logs:       docker-compose logs -f
echo   Stop services:   docker-compose down
echo   Restart:         docker-compose restart
echo.
echo 📝 Next Steps:
echo   1. Wait 1-2 minutes for services to start
echo   2. Run 'test-api.bat' to create sample data
echo   3. Open http://localhost:3000 in your browser
echo   4. Login with: customer1 / 123456
echo.
echo Press any key to view logs (Ctrl+C to exit logs)...
pause >nul
docker-compose logs -f