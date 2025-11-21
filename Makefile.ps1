# PowerShell Makefile for Drone Delivery System

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Drone Delivery System - Commands" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\Makefile.ps1 <command>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  build      - Build all Docker containers"
    Write-Host "  up         - Start all services"
    Write-Host "  down       - Stop all services"
    Write-Host "  restart    - Restart all services"
    Write-Host "  logs       - Show logs from all services"
    Write-Host "  clean      - Remove all containers and volumes"
    Write-Host "  test       - Run API tests"
    Write-Host "  ps         - Show running containers"
    Write-Host "  db         - Connect to database"
    Write-Host "  init       - Initialize with sample data"
    Write-Host ""
}

function Build-Services {
    Write-Host "Building all services..." -ForegroundColor Green
    docker-compose build
}

function Start-Services {
    Write-Host "Starting all services..." -ForegroundColor Green
    docker-compose up -d
    Write-Host ""
    Write-Host "Services are starting. Please wait..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Write-Host ""
    Write-Host "Access points:" -ForegroundColor Cyan
    Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
    Write-Host "  User Service:    http://localhost:8001/docs" -ForegroundColor White
    Write-Host "  Product Service: http://localhost:8002/docs" -ForegroundColor White
    Write-Host "  Order Service:   http://localhost:8003/docs" -ForegroundColor White
    Write-Host "  Payment Service: http://localhost:8004/docs" -ForegroundColor White
    Write-Host "  API Gateway:     http://localhost:80" -ForegroundColor White
}

function Stop-Services {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    docker-compose down
}

function Restart-Services {
    Write-Host "Restarting all services..." -ForegroundColor Yellow
    docker-compose restart
}

function Show-Logs {
    Write-Host "Showing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    docker-compose logs -f
}

function Clean-All {
    Write-Host "Cleaning up all containers, volumes, and images..." -ForegroundColor Red
    $confirm = Read-Host "Are you sure? This will delete all data. (y/N)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        docker-compose down -v --rmi all
        Write-Host "Cleanup completed!" -ForegroundColor Green
    } else {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    }
}

function Test-APIs {
    Write-Host "Testing APIs..." -ForegroundColor Cyan
    
    Write-Host "`nTesting User Service..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:8001/" -Method Get
    
    Write-Host "`nTesting Product Service..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:8002/" -Method Get
    
    Write-Host "`nTesting Order Service..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:8003/" -Method Get
    
    Write-Host "`nTesting Payment Service..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:8004/" -Method Get
    
    Write-Host "`nAll services are responding!" -ForegroundColor Green
}

function Show-Status {
    Write-Host "Container Status:" -ForegroundColor Cyan
    docker-compose ps
}

function Connect-Database {
    Write-Host "Connecting to SQL Server..." -ForegroundColor Cyan
    Write-Host "Connection details:" -ForegroundColor Yellow
    Write-Host "  Server: localhost,1433"
    Write-Host "  User: sa"
    Write-Host "  Password: YourStrong@Passw0rd"
    Write-Host "  Database: DroneDeliveryDB"
    Write-Host ""
    Write-Host "Use SQL Server Management Studio or Azure Data Studio to connect."
}

function Initialize-Data {
    Write-Host "Initializing with sample data..." -ForegroundColor Green
    
    # Register customer
    $customerData = @{
        email = "customer@test.com"
        username = "customer1"
        password = "123456"
        full_name = "Nguyen Van A"
        role = "customer"
        address = "123 Nguyen Hue, Q1, TPHCM"
        phone = "0901234567"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:8001/register" -Method Post -Body $customerData -ContentType "application/json"
    Write-Host "Customer registered!" -ForegroundColor Green
    
    # Register restaurant
    $restaurantData = @{
        email = "restaurant@test.com"
        username = "restaurant1"
        password = "123456"
        role = "restaurant"
        restaurant_name = "Nha Hang Ngon"
        restaurant_description = "Chuyen mon an Viet"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:8001/register" -Method Post -Body $restaurantData -ContentType "application/json"
    Write-Host "Restaurant registered!" -ForegroundColor Green
    
    # Create products
    $products = @(
        @{ restaurant_id = 2; name = "Pho Bo"; description = "Pho bo truyen thong"; price = 50000; category = "Pho"; preparation_time = 15 },
        @{ restaurant_id = 2; name = "Bun Cha"; description = "Bun cha Hanoi"; price = 45000; category = "Bun"; preparation_time = 20 },
        @{ restaurant_id = 2; name = "Com Tam"; description = "Com tam suon bi cha"; price = 40000; category = "Com"; preparation_time = 18 }
    )
    
    foreach ($product in $products) {
        $productJson = $product | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8002/products" -Method Post -Body $productJson -ContentType "application/json"
        Write-Host "Product '$($product.name)' created!" -ForegroundColor Green
    }
    
    Write-Host "`nInitialization completed!" -ForegroundColor Cyan
    Write-Host "Login credentials:" -ForegroundColor Yellow
    Write-Host "  Customer - username: customer1, password: 123456"
    Write-Host "  Restaurant - username: restaurant1, password: 123456"
}

# Main command router
switch ($Command.ToLower()) {
    "build" { Build-Services }
    "up" { Start-Services }
    "down" { Stop-Services }
    "restart" { Restart-Services }
    "logs" { Show-Logs }
    "clean" { Clean-All }
    "test" { Test-APIs }
    "ps" { Show-Status }
    "db" { Connect-Database }
    "init" { Initialize-Data }
    "help" { Show-Help }
    default { 
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host ""
        Show-Help 
    }
}