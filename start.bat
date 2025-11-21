@echo off
echo ========================================
echo   Drone Delivery System - Startup
echo ========================================
echo.

echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not running
    echo Please install Docker Desktop and start it
    pause
    exit /b 1
)

echo Docker is running!
echo.

echo Starting all services...
echo This may take 2-3 minutes on first run
echo.

docker-compose up --build

pause