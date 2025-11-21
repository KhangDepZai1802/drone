from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Enum as SQLEnum, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import enum
import os
import time
import httpx

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL")
PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL")

# Database setup
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums
class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    IN_DELIVERY = "in_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class DroneStatus(str, enum.Enum):
    IDLE = "idle"
    IN_USE = "in_use"
    MAINTENANCE = "maintenance"

# Database Models
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=False, index=True)
    restaurant_id = Column(Integer, nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    delivery_address = Column(String(500), nullable=False)
    delivery_lat = Column(Float)
    delivery_lng = Column(Float)
    drone_id = Column(Integer)
    estimated_delivery_time = Column(Integer)  # minutes
    notes = Column(Text)
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

class Drone(Base):
    __tablename__ = "drones"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    model = Column(String(100))
    status = Column(SQLEnum(DroneStatus), default=DroneStatus.IDLE)
    battery_level = Column(Float, default=100.0)
    max_payload = Column(Float, default=5.0)  # kg
    current_lat = Column(Float)
    current_lng = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models
class OrderItemCreate(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    price: float

class OrderItemResponse(OrderItemCreate):
    id: int
    order_id: int
    
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    restaurant_id: int
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    notes: Optional[str] = None
    items: List[OrderItemCreate]

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    restaurant_id: int
    total_amount: float
    status: OrderStatus
    delivery_address: str
    delivery_lat: Optional[float]
    delivery_lng: Optional[float]
    drone_id: Optional[int]
    estimated_delivery_time: Optional[int]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []
    
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class DroneCreate(BaseModel):
    name: str
    model: Optional[str] = None
    max_payload: float = 5.0

class DroneResponse(BaseModel):
    id: int
    name: str
    model: Optional[str]
    status: DroneStatus
    battery_level: float
    max_payload: float
    current_lat: Optional[float]
    current_lng: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

# FastAPI app
app = FastAPI(title="Order Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Startup
@app.on_event("startup")
async def startup_event():
    max_retries = 30
    retry_count = 0
    while retry_count < max_retries:
        try:
            Base.metadata.create_all(bind=engine)
            print("Database tables created successfully")
            
            # Create sample drones
            db = SessionLocal()
            if db.query(Drone).count() == 0:
                sample_drones = [
                    Drone(name="Drone Alpha", model="DX-100", status=DroneStatus.IDLE, battery_level=100.0),
                    Drone(name="Drone Beta", model="DX-100", status=DroneStatus.IDLE, battery_level=95.0),
                    Drone(name="Drone Gamma", model="DX-200", status=DroneStatus.IDLE, battery_level=88.0),
                ]
                db.add_all(sample_drones)
                db.commit()
                print("Sample drones created")
            db.close()
            break
        except Exception as e:
            retry_count += 1
            print(f"Database connection failed (attempt {retry_count}/{max_retries}): {e}")
            time.sleep(2)

# Auth helper
async def verify_token(token: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{USER_SERVICE_URL}/verify-token",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json()
            return None
        except:
            return None

async def get_current_user(authorization: str = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    user_data = await verify_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_data

# Routes
@app.get("/")
async def root():
    return {"service": "Order Service", "status": "running"}

@app.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(order: OrderCreate, authorization: str = None, db: Session = Depends(get_db)):
    user = await get_current_user(authorization)
    
    # Calculate total
    total = sum(item.price * item.quantity for item in order.items)
    
    # Create order
    db_order = Order(
        customer_id=user["user_id"],
        restaurant_id=order.restaurant_id,
        total_amount=total,
        delivery_address=order.delivery_address,
        delivery_lat=order.delivery_lat,
        delivery_lng=order.delivery_lng,
        notes=order.notes,
        estimated_delivery_time=30
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Create order items
    for item in order.items:
        db_item = OrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            price=item.price
        )
        db.add(db_item)
    db.commit()
    
    # Fetch items
    items = db.query(OrderItem).filter(OrderItem.order_id == db_order.id).all()
    
    response = OrderResponse.from_orm(db_order)
    response.items = [OrderItemResponse.from_orm(item) for item in items]
    return response

@app.get("/orders", response_model=List[OrderResponse])
async def list_orders(
    authorization: str = None,
    status: Optional[OrderStatus] = None,
    db: Session = Depends(get_db)
):
    user = await get_current_user(authorization)
    
    query = db.query(Order)
    
    # Filter by user role
    if user["role"] == "customer":
        query = query.filter(Order.customer_id == user["user_id"])
    elif user["role"] == "restaurant":
        query = query.filter(Order.restaurant_id == user["user_id"])
    
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.created_at.desc()).all()
    
    result = []
    for order in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        order_response = OrderResponse.from_orm(order)
        order_response.items = [OrderItemResponse.from_orm(item) for item in items]
        result.append(order_response)
    
    return result

@app.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    order_response = OrderResponse.from_orm(order)
    order_response.items = [OrderItemResponse.from_orm(item) for item in items]
    return order_response

@app.put("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status_update.status
    order.updated_at = datetime.utcnow()
    
    # Assign drone if ready for delivery
    if status_update.status == OrderStatus.READY and not order.drone_id:
        available_drone = db.query(Drone).filter(Drone.status == DroneStatus.IDLE).first()
        if available_drone:
            order.drone_id = available_drone.id
            available_drone.status = DroneStatus.IN_USE
            order.status = OrderStatus.IN_DELIVERY
    
    # Release drone if delivered
    if status_update.status == OrderStatus.DELIVERED and order.drone_id:
        drone = db.query(Drone).filter(Drone.id == order.drone_id).first()
        if drone:
            drone.status = DroneStatus.IDLE
    
    db.commit()
    db.refresh(order)
    
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    order_response = OrderResponse.from_orm(order)
    order_response.items = [OrderItemResponse.from_orm(item) for item in items]
    return order_response

@app.get("/drones", response_model=List[DroneResponse])
async def list_drones(db: Session = Depends(get_db)):
    drones = db.query(Drone).all()
    return drones

@app.post("/drones", response_model=DroneResponse, status_code=status.HTTP_201_CREATED)
async def create_drone(drone: DroneCreate, db: Session = Depends(get_db)):
    db_drone = Drone(**drone.dict())
    db.add(db_drone)
    db.commit()
    db.refresh(db_drone)
    return db_drone

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)