from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import time
import httpx
import uuid
import random

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user_service:8000")

# Database setup
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, unique=True, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)
    status = Column(String(50), default="pending")
    transaction_id = Column(String(255), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Models
class PaymentCreate(BaseModel):
    order_id: int
    amount: float
    payment_method: str

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    amount: float
    payment_method: str
    status: str
    transaction_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PaymentStatusUpdate(BaseModel):
    status: str

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
            print("✓ Payment database tables created successfully")
            break
        except Exception as e:
            retry_count += 1
            print(f"Database connection failed (attempt {retry_count}/{max_retries}): {e}")
            time.sleep(2)

# Auth helper
async def verify_token(authorization: str = Header(None)):
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
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# Payment processing simulation
def process_payment(payment_method: str, amount: float) -> dict:
    """Simulate payment processing"""
    time.sleep(0.5)
    
    # 95% success rate
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
            "message": "Payment failed"
        }

# Routes
@app.get("/")
async def root():
    return {"service": "Payment Service", "status": "running", "version": "1.0.0"}

@app.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: PaymentCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Create and process payment"""
    user = await verify_token(authorization)
    
    # Check if payment already exists
    existing = db.query(Payment).filter(Payment.order_id == payment.order_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment already exists for this order")
    
    # Create payment record
    db_payment = Payment(
        order_id=payment.order_id,
        user_id=user["user_id"],
        amount=payment.amount,
        payment_method=payment.payment_method,
        status="processing"
    )
    
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    # Process payment
    result = process_payment(payment.payment_method, payment.amount)
    
    if result["success"]:
        db_payment.status = "completed"
        db_payment.transaction_id = result["transaction_id"]
    else:
        db_payment.status = "failed"
    
    db_payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@app.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    authorization: str = Header(None),
    order_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List all payments"""
    user = await verify_token(authorization)
    
    query = db.query(Payment)
    
    # Filter by user (unless admin)
    if user["role"] != "admin":
        query = query.filter(Payment.user_id == user["user_id"])
    
    if order_id:
        query = query.filter(Payment.order_id == order_id)
    
    payments = query.order_by(Payment.created_at.desc()).all()
    return payments

@app.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get payment by ID"""
    await verify_token(authorization)
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payment

@app.get("/payments/order/{order_id}", response_model=PaymentResponse)
async def get_payment_by_order(
    order_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get payment by order ID"""
    await verify_token(authorization)
    
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this order")
    
    return payment

@app.put("/payments/{payment_id}/status", response_model=PaymentResponse)
async def update_payment_status(
    payment_id: int,
    status_update: PaymentStatusUpdate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Update payment status"""
    await verify_token(authorization)
    
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
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Refund payment"""
    await verify_token(authorization)
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status != "completed":
        raise HTTPException(status_code=400, detail="Only completed payments can be refunded")
    
    payment.status = "refunded"
    payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)
    
    return payment

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)