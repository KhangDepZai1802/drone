# PowerShell Makefile for Drone Delivery System

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Drone Delivery System - Commands" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "Usage: .\Makefile.ps1 <command>" -ForegroundColor Yellow
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  build      - Build all Docker containers"
    Write-Host "  up         - Start all services"
    Write-Host "  down       - Stop all services"
    Write-Host "  restart    - Restart all services"
    Write-Host "  logs       - Show logs from all services"
    Write-Host "  clean      - Remove all containers and volumes"
    Write-Host "  ps         - Show running containers"
    Write-Host "  init       - Initialize with sample data"
    Write-Host ""
}

function Initialize-Data {
    Write-Host "Initializing with RICH sample data..." -ForegroundColor Green
    
    # 1. Tạo Khách hàng
    $cust = @{ email="khach@gmail.com"; username="khach1"; password="123456"; full_name="Khach Hang Vip"; role="customer"; address="Q1, TP.HCM" }
    try { 
        Invoke-RestMethod -Uri "http://localhost:8001/register" -Method Post -Body ($cust|ConvertTo-Json) -ContentType "application/json" 
        Write-Host "-> Created Customer: khach1" -ForegroundColor Cyan
    } catch { Write-Host "Customer exists." -ForegroundColor Gray }

    # 2. Tạo 3 Nhà hàng & Món ăn
    $restaurants = @(
        @{ u="res_pho"; name="Pho Ngon"; desc="Pho gia truyen"; items=@(@{n="Pho Bo"; p=50000}, @{n="Pho Ga"; p=45000}) },
        @{ u="res_pizza"; name="Pizza Italy"; desc="Pizza nuong cui"; items=@(@{n="Pizza Hai San"; p=120000}, @{n="Pizza Pho Mai"; p=90000}) },
        @{ u="res_burger"; name="Burger King"; desc="Burger bo My"; items=@(@{n="Burger Bo"; p=60000}, @{n="Khoai Tay Chien"; p=25000}) }
    )

    foreach ($r in $restaurants) {
        $resData = @{ email="$($r.u)@mail.com"; username=$r.u; password="123456"; role="restaurant"; restaurant_name=$r.name; restaurant_description=$r.desc; full_name="Manager" }
        try {
            $user = Invoke-RestMethod -Uri "http://localhost:8001/register" -Method Post -Body ($resData|ConvertTo-Json) -ContentType "application/json"
            $resId = $user.id
            
            foreach ($item in $r.items) {
                $prod = @{ restaurant_id=$resId; name=$item.n; price=$item.p; description="Mon ngon"; category="Food"; preparation_time=15 }
                Invoke-RestMethod -Uri "http://localhost:8002/products" -Method Post -Body ($prod|ConvertTo-Json) -ContentType "application/json"
            }
            Write-Host "-> Created Restaurant: $($r.name)" -ForegroundColor Cyan
        } catch { Write-Host "Restaurant $($r.name) exists." -ForegroundColor Gray }
    }
    
    Write-Host "`n--- DONE! LOGIN INFO ---" -ForegroundColor Green
    Write-Host "Customer: khach1 / 123456"
    Write-Host "Restaurants: res_pho, res_pizza, res_burger (Pass: 123456)"
}

# Các hàm hỗ trợ khác
function Build-Services { docker-compose build }
function Start-Services { docker-compose up -d }
function Stop-Services { docker-compose down }
function Restart-Services { docker-compose restart }
function Show-Logs { docker-compose logs -f }
function Show-Status { docker-compose ps }
function Clean-All { docker-compose down -v --rmi all }

# Main Router
switch ($Command.ToLower()) {
    "build" { Build-Services }
    "up" { Start-Services }
    "down" { Stop-Services }
    "restart" { Restart-Services }
    "logs" { Show-Logs }
    "clean" { Clean-All }
    "ps" { Show-Status }
    "init" { Initialize-Data }
    "help" { Show-Help }
    default { Show-Help }
}