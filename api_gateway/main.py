from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import os

# ==========================================
# CONFIGURATION
# ==========================================
SERVICE_URLS = {
    "user": os.getenv("USER_SERVICE_URL", "http://user_service:8000"),
    "product": os.getenv("PRODUCT_SERVICE_URL", "http://product_service:8000"),
    "order": os.getenv("ORDER_SERVICE_URL", "http://order_service:8000"),
    "payment": os.getenv("PAYMENT_SERVICE_URL", "http://payment_service:8000"),
}

# ==========================================
# APP SETUP
# ==========================================
app = FastAPI(
    title="API Gateway",
    description="Central gateway for DroneFood microservices",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ROUTING LOGIC
# ==========================================

def get_service_url(path: str) -> str:
    """Xác định service dựa trên path"""
    if path.startswith("/api/users") or path in ["/token", "/register", "/verify-token"]:
        return SERVICE_URLS["user"]
    elif path.startswith("/api/products") or path.startswith("/static"):
        return SERVICE_URLS["product"]
    elif path.startswith("/api/orders"):
        return SERVICE_URLS["order"]
    elif path.startswith("/api/payments"):
        return SERVICE_URLS["payment"]
    else:
        raise HTTPException(status_code=404, detail="Service not found")

def strip_api_prefix(path: str) -> str:
    """Loại bỏ /api/service_name để gửi đúng path cho service"""
    # Mapping: /api/users/xxx -> /xxx
    # Mapping: /api/orders/drones -> /drones
    if path.startswith("/api/users"):
        return path.replace("/api/users", "", 1)
    elif path.startswith("/api/products"):
        return path.replace("/api/products", "", 1)
    elif path.startswith("/api/orders"):
        return path.replace("/api/orders", "", 1)
    elif path.startswith("/api/payments"):
        return path.replace("/api/payments", "", 1)
    return path

# ==========================================
# PROXY ENDPOINT
# ==========================================

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy(path: str, request: Request):
    """Forward tất cả requests đến service tương ứng"""
    
    # 1. Xác định service
    try:
        service_url = get_service_url(f"/{path}")
    except HTTPException as e:
        return {"error": str(e.detail)}, e.status_code
    
    # 2. Chuẩn bị request
    target_path = strip_api_prefix(f"/{path}")
    target_url = f"{service_url}{target_path}"
    
    # Copy headers (trừ host)
    headers = {
        key: value for key, value in request.headers.items() 
        if key.lower() not in ["host", "content-length"]
    }
    
    # Copy query params
    query_params = dict(request.query_params)
    
    # Get body
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
    
    # 3. Forward request
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                params=query_params,
                content=body,
            )
            
            # 4. Return response
            return StreamingResponse(
                response.iter_bytes(),
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
            
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Service unavailable: {str(e)}"
            )

# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/")
async def root():
    return {
        "service": "API Gateway",
        "status": "running",
        "routes": {
            "/api/users/*": "User Service",
            "/api/products/*": "Product Service",
            "/api/orders/*": "Order Service",
            "/api/payments/*": "Payment Service",
        }
    }

@app.get("/health")
async def health_check():
    """Kiểm tra sức khỏe của các services"""
    status = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in SERVICE_URLS.items():
            try:
                response = await client.get(f"{url}/")
                status[name] = "healthy" if response.status_code == 200 else "unhealthy"
            except:
                status[name] = "unreachable"
    
    return {
        "gateway": "healthy",
        "services": status
    }
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy(path: str, request: Request):
    """Forward tất cả requests đến service tương ứng"""
    
    # DEBUG: In ra thông tin
    print(f"🔍 Gateway received: {request.method} /{path}")
    
    # 1. Xác định service
    try:
        service_url = get_service_url(f"/{path}")
        print(f"✅ Service URL: {service_url}")
    except HTTPException as e:
        print(f"❌ Service not found for path: /{path}")
        return {"error": str(e.detail)}, e.status_code
    
    # 2. Chuẩn bị request
    target_path = strip_api_prefix(f"/{path}")
    target_url = f"{service_url}{target_path}"
    print(f"🎯 Forwarding to: {target_url}")
    
    # ... rest of code
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)