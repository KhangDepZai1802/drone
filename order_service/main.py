from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import enum
import os
import httpx
import math

# ==========================================
# CONFIG
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")
CART_SERVICE_URL = os.getenv("CART_SERVICE_URL", "http://cart_service:8000")
PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://product_service:8000")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment_service:8000")
DELIVERY_SERVICE_URL = os.getenv("DELIVERY_SERVICE_URL", "http://delivery_service:8000")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user_service:8000")

# Database
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# ENUMS
# ==========================================
class OrderStatus(str, enum.Enum):
    WAITING_CONFIRMATION = "waiting_confirmation"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    IN_DELIVERY = "in_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

# ==========================================
# DATABASE MODELS
# ==========================================
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    restaurant_id = Column(Integer, nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    total_weight = Column(Float, default=0)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.WAITING_CONFIRMATION)
    delivery_address = Column(String(500), nullable=False)
    delivery_lat = Column(Float, nullable=True)
    delivery_lng = Column(Float, nullable=True)
    restaurant_lat = Column(Float, nullable=True)
    restaurant_lng = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    drone_id = Column(Integer, nullable=True)
    estimated_delivery_time = Column(Integer, default=30)
    rejection_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=False, index=True)
    product_id = Column(Integer, nullable=False)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    weight = Column(Float, default=0.5)

class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=False, index=True)
    status = Column(String(50), nullable=False)
    changed_by = Column(Integer, nullable=True)
    role = Column(String(50), nullable=True)
    note = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)

# ==========================================
# PYDANTIC MODELS
# ==========================================
class OrderItemCreate(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    price: float
    weight: float = 0.5

class OrderItemResponse(OrderItemCreate):
    id: int
    order_id: int
    class Config:
        from_attributes = True

class OrderStatusHistoryResponse(BaseModel):
    id: int
    status: str
    changed_by: Optional[int]
    role: Optional[str]
    note: Optional[str]
    changed_at: datetime
    class Config:
        from_attributes = True

class CheckoutRequest(BaseModel):
    """Request checkout từ Cart"""
    restaurant_id: int
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    total_amount: float
    status: OrderStatus
    delivery_address: str
    distance_km: Optional[float]
    drone_id: Optional[int]
    estimated_delivery_time: Optional[int]
    created_at: datetime
    items: List[OrderItemResponse] = []
    history: List[OrderStatusHistoryResponse] = []
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderReject(BaseModel):
    reason: str

# ==========================================
# APP SETUP
# ==========================================
app = FastAPI(title="Order Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def verify_token(authorization: str = Header(None)):
    """Verify JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{USER_SERVICE_URL}/verify-token",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5.0
            )
            if response.status_code == 200:
                return response.json()
            raise HTTPException(status_code=401, detail="Invalid token")
        except:
            raise HTTPException(status_code=401, detail="Auth failed")

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine formula"""
    R = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Order Service Started")

# ==========================================
# ROUTES
# ==========================================

@app.get("/")
async def root():
    return {"service": "Order Service", "status": "running"}

# Checkout - TỪ GIỎHÀNG → TẠO ĐƠN
@app.post("/orders/checkout", response_model=OrderResponse, status_code=201)
async def checkout(
    request: CheckoutRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Tạo đơn từ giỏ hàng:
    1. Gọi CART SERVICE lấy items
    2. Gọi PRODUCT SERVICE trừ tồn kho
    3. Gọi PAYMENT SERVICE tạo payment
    4. Tạo ORDER
    5. Gọi DELIVERY SERVICE gán drone (nếu ready)
    """
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    # 1. Lấy giỏ hàng
    async with httpx.AsyncClient() as client:
        cart_res = await client.get(
            f"{CART_SERVICE_URL}/cart",
            headers={"Authorization": authorization},
            timeout=10.0
        )
        if cart_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Cart is empty")
        
        cart_items = cart_res.json()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")
    
    # 2. Trừ tồn kho (PRODUCT SERVICE)
    async with httpx.AsyncClient() as client:
        for item in cart_items:
            res = await client.post(
                f"{PRODUCT_SERVICE_URL}/products/{item['product_id']}/decrease-stock",
                params={"quantity": item['quantity']},
                headers={"Authorization": authorization},
                timeout=10.0
            )
            if res.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Product {item['product_id']} out of stock")
    
    # 3. Tính tổng & weight
    total = sum(item['quantity'] * item['price'] for item in cart_items)
    total_weight = sum(item['quantity'] * item['weight'] for item in cart_items)
    
    # 4. Lấy vị trí nhà hàng (từ User Service)
    restaurant_lat = request.delivery_lat or 10.762622
    restaurant_lng = request.delivery_lng or 106.660172
    
    # Tính khoảng cách
    dist_km = calculate_distance(
        restaurant_lat, restaurant_lng,
        request.delivery_lat or 10.762622,
        request.delivery_lng or 106.660172
    )
    
    # 5. Tạo order
    db_order = Order(
        user_id=user_id,
        restaurant_id=request.restaurant_id,
        total_amount=total,
        total_weight=total_weight,
        delivery_address=request.delivery_address,
        delivery_lat=request.delivery_lat,
        delivery_lng=request.delivery_lng,
        restaurant_lat=restaurant_lat,
        restaurant_lng=restaurant_lng,
        distance_km=dist_km,
        estimated_delivery_time=int(dist_km * 2 + 20),
        notes=request.notes,
        status=OrderStatus.WAITING_CONFIRMATION
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Thêm items
    for item in cart_items:
        db_item = OrderItem(
            order_id=db_order.id,
            product_id=item['product_id'],
            product_name=item.get('product_name', 'Unknown'),
            quantity=item['quantity'],
            price=item['price'],
            weight=item.get('weight', 0.5)
        )
        db.add(db_item)
    
    # Thêm history
    history = OrderStatusHistory(
        order_id=db_order.id,
        status=OrderStatus.WAITING_CONFIRMATION.value,
        changed_by=user_id,
        role=user.get('role'),
        note='Order created'
    )
    db.add(history)
    db.commit()
    
    # 6. Tạo payment (PAYMENT SERVICE)
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{PAYMENT_SERVICE_URL}/payments",
            json={
                "order_id": db_order.id,
                "user_id": user_id,
                "amount": total,
                "payment_method": "cod"  # Default: cash on delivery
            },
            headers={"Authorization": authorization},
            timeout=10.0
        )
    
    # Lấy items + history
    items = db.query(OrderItem).filter(OrderItem.order_id == db_order.id).all()
    hist = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == db_order.id).all()
    
    result = OrderResponse.from_orm(db_order)
    result.items = [OrderItemResponse.from_orm(i) for i in items]
    result.history = [OrderStatusHistoryResponse.from_orm(h) for h in hist]
    
    # 7. Xóa giỏ hàng
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{CART_SERVICE_URL}/cart",
            headers={"Authorization": authorization},
            timeout=10.0
        )
    
    return result

# List orders
@app.get("/orders", response_model=List[OrderResponse])
async def list_orders(
    status: Optional[OrderStatus] = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Danh sách đơn của user"""
    user = await verify_token(authorization)
    
    query = db.query(Order)
    
    if user['role'] == 'customer':
        query = query.filter(Order.user_id == user['user_id'])
    elif user['role'] == 'restaurant':
        query = query.filter(Order.restaurant_id == user['user_id'])
    
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.id.desc()).all()
    
    result = []
    for order in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        hist = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == order.id).all()
        
        r = OrderResponse.from_orm(order)
        r.items = [OrderItemResponse.from_orm(i) for i in items]
        r.history = [OrderStatusHistoryResponse.from_orm(h) for h in hist]
        result.append(r)
    
    return result

# Get order detail
@app.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Chi tiết đơn"""
    user = await verify_token(authorization)
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check permission
    if user['role'] == 'customer' and order.user_id != user['user_id']:
        raise HTTPException(status_code=403, detail="Permission denied")
    if user['role'] == 'restaurant' and order.restaurant_id != user['user_id']:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    hist = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == order.id).all()
    
    result = OrderResponse.from_orm(order)
    result.items = [OrderItemResponse.from_orm(i) for i in items]
    result.history = [OrderStatusHistoryResponse.from_orm(h) for h in hist]
    return result

# Accept order (Restaurant)
@app.post("/orders/{order_id}/accept", response_model=OrderResponse)
async def accept_order(
    order_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Nhà hàng chấp nhận đơn"""
    user = await verify_token(authorization)
    if user['role'] != 'restaurant':
        raise HTTPException(status_code=403, detail="Only restaurant can accept")
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.restaurant_id != user['user_id']:
        raise HTTPException(status_code=403, detail="Not your order")
    
    order.status = OrderStatus.CONFIRMED
    order.updated_at = datetime.utcnow()
    
    # Thêm history
    hist = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.CONFIRMED.value,
        changed_by=user['user_id'],
        role='restaurant',
        note='Restaurant accepted order'
    )
    db.add(hist)
    db.commit()
    db.refresh(order)
    
    # Response
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    hist_list = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == order.id).all()
    
    result = OrderResponse.from_orm(order)
    result.items = [OrderItemResponse.from_orm(i) for i in items]
    result.history = [OrderStatusHistoryResponse.from_orm(h) for h in hist_list]
    return result

# Reject order
@app.post("/orders/{order_id}/reject", response_model=OrderResponse)
async def reject_order(
    order_id: int,
    reject_data: OrderReject,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Nhà hàng từ chối đơn"""
    user = await verify_token(authorization)
    if user['role'] != 'restaurant':
        raise HTTPException(status_code=403, detail="Only restaurant can reject")
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.restaurant_id != user['user_id']:
        raise HTTPException(status_code=403, detail="Not your order")
    
    order.status = OrderStatus.REJECTED
    order.rejection_reason = reject_data.reason
    order.updated_at = datetime.utcnow()
    
    hist = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.REJECTED.value,
        changed_by=user['user_id'],
        role='restaurant',
        note=f"Rejected: {reject_data.reason}"
    )
    db.add(hist)
    db.commit()
    db.refresh(order)
    
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    hist_list = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == order.id).all()
    
    result = OrderResponse.from_orm(order)
    result.items = [OrderItemResponse.from_orm(i) for i in items]
    result.history = [OrderStatusHistoryResponse.from_orm(h) for h in hist_list]
    return result

# Update status (Restaurant)
@app.put("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    update: OrderStatusUpdate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Cập nhật trạng thái đơn"""
    user = await verify_token(authorization)
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Permission: Restaurant hoặc Customer (hủy)
    if user['role'] == 'restaurant' and order.restaurant_id != user['user_id']:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    if user['role'] == 'customer' and order.user_id != user['user_id']:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order.status = update.status
    order.updated_at = datetime.utcnow()
    
    hist = OrderStatusHistory(
        order_id=order.id,
        status=update.status.value,
        changed_by=user['user_id'],
        role=user['role'],
        note=f'Status updated to {update.status.value}'
    )
    db.add(hist)
    db.commit()
    db.refresh(order)
    
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    hist_list = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == order.id).all()
    
    result = OrderResponse.from_orm(order)
    result.items = [OrderItemResponse.from_orm(i) for i in items]
    result.history = [OrderStatusHistoryResponse.from_orm(h) for h in hist_list]
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)