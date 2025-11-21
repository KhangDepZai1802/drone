from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Enum as SQLEnum
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
ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL")

# Database setup
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums
class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentMethod(str, enum.Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    E_WALLET = "e_wallet"
    CASH = "cash"

# Database Models
class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, unique=True, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_id = Column(String(255), unique=True)
    payment_details = Column(String(500))  # Encrypted card info, wallet ID, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Models
class PaymentCreate(BaseModel):
    order_id: int
    amount: float
    payment_method: PaymentMethod
    payment_details: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    amount: float
    payment_method: PaymentMethod
    status: PaymentStatus
    transaction_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus

# FastAPI app
app = FastAPI(title="Payment Service", version="1.0.0")

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

# Payment processing simulation
def process_payment(payment_method: PaymentMethod, amount: float, payment_details: str = None) -> dict:
    """
    Simulate payment processing
    In production, integrate with real payment gateways like Stripe, PayPal, etc.
    """
    import uuid
    import random
    
    # Simulate processing delay
    time.sleep(0.5)
    
    # Simulate success/failure (95% success rate)
    success = random.random() < 0.95
    
    if success:
        return {
            "success": True,
            "transaction_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "message": "Payment processed successfully"
        }
    else:
        return {
            "success": False,
            "transaction_id": None,
            "message": "Payment failed - insufficient funds or invalid details"
        }

# Routes
@app.get("/")
async def root():
    return {"service": "Payment Service", "status": "running"}

@app.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: PaymentCreate,
    authorization: str = None,
    db: Session = Depends(get_db)
):
    user = await get_current_user(authorization)
    
    # Check if payment already exists for this order
    existing_payment = db.query(Payment).filter(Payment.order_id == payment.order_id).first()
    if existing_payment:
        raise HTTPException(status_code=400, detail="Payment already exists for this order")
    
    # Create payment record
    db_payment = Payment(
        order_id=payment.order_id,
        user_id=user["user_id"],
        amount=payment.amount,
        payment_method=payment.payment_method,
        payment_details=payment.payment_details,
        status=PaymentStatus.PROCESSING
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    # Process payment
    result = process_payment(payment.payment_method, payment.amount, payment.payment_details)
    
    if result["success"]:
        db_payment.status = PaymentStatus.COMPLETED
        db_payment.transaction_id = result["transaction_id"]
    else:
        db_payment.status = PaymentStatus.FAILED
    
    db_payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@app.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    authorization: str = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    user = await get_current_user(authorization)
    
    query = db.query(Payment)
    
    # Filter by user (customers see their own, admins see all)
    if user["role"] != "admin":
        query = query.filter(Payment.user_id == user["user_id"])
    
    if order_id:
        query = query.filter(Payment.order_id == order_id)
    
    payments = query.order_by(Payment.created_at.desc()).all()
    return payments

@app.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@app.get("/payments/order/{order_id}", response_model=PaymentResponse)
async def get_payment_by_order(order_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this order")
    return payment

@app.put("/payments/{payment_id}/status", response_model=PaymentResponse)
async def update_payment_status(
    payment_id: int,
    status_update: PaymentStatusUpdate,
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    payment.status = status_update.status
    payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)
    return payment

@app.post("/payments/{payment_id}/refund", response_model=PaymentResponse)
async def refund_payment(
    payment_id: int,
    authorization: str = None,
    db: Session = Depends(get_db)
):
    user = await get_current_user(authorization)
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status != PaymentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Only completed payments can be refunded")
    
    # Process refund (simulation)
    payment.status = PaymentStatus.REFUNDED
    payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)
    
    return payment

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)