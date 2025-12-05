from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os

# ==========================================
# CONFIG
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user_service:8000")

# Database
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# DATABASE MODEL
# ==========================================
class CartItem(Base):
    """Chỉ lưu: user_id, product_id, restaurant_id, quantity"""
    __tablename__ = "cart_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    product_id = Column(Integer, nullable=False)
    restaurant_id = Column(Integer, nullable=False)
    quantity = Column(Integer, default=1)
    added_at = Column(DateTime, default=datetime.utcnow)

# ==========================================
# PYDANTIC MODELS
# ==========================================
class CartItemCreate(BaseModel):
    product_id: int
    restaurant_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    restaurant_id: int
    quantity: int
    added_at: datetime
    
    class Config:
        from_attributes = True

# ==========================================
# APP SETUP
# ==========================================
app = FastAPI(title="Cart Service", version="1.0.0")

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
    """Verify JWT token từ User Service"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    import httpx
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

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Cart Service Started")

# ==========================================
# ROUTES - CHỈCÓ GIỎHÀNG
# ==========================================

@app.get("/")
async def root():
    return {"service": "Cart Service", "status": "running"}

# Get cart
@app.get("/cart", response_model=List[CartItemResponse])
async def get_cart(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Lấy giỏ hàng của user hiện tại"""
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    return items

# Add to cart
@app.post("/cart/items", response_model=CartItemResponse, status_code=201)
async def add_to_cart(
    item: CartItemCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Thêm món vào giỏ hàng"""
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    # Kiểm tra: Giỏ chỉ chứa 1 nhà hàng
    existing = db.query(CartItem).filter(CartItem.user_id == user_id).first()
    if existing and existing.restaurant_id != item.restaurant_id:
        raise HTTPException(
            status_code=400, 
            detail="Cart can only contain items from 1 restaurant. Clear cart first."
        )
    
    # Kiểm tra duplicate
    existing_item = db.query(CartItem).filter(
        CartItem.user_id == user_id,
        CartItem.product_id == item.product_id
    ).first()
    
    if existing_item:
        # Cộng số lượng
        existing_item.quantity += item.quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
    
    # Thêm mới
    db_item = CartItem(
        user_id=user_id,
        product_id=item.product_id,
        restaurant_id=item.restaurant_id,
        quantity=item.quantity
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# Update quantity
@app.put("/cart/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: int,
    update: CartItemUpdate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Cập nhật số lượng"""
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == user_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if update.quantity <= 0:
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=200, detail="Item removed")
    
    item.quantity = update.quantity
    db.commit()
    db.refresh(item)
    return item

# Remove item
@app.delete("/cart/items/{item_id}", status_code=204)
async def remove_from_cart(
    item_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Xóa món khỏi giỏ"""
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == user_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return None

# Clear cart
@app.delete("/cart", status_code=204)
async def clear_cart(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Làm trống giỏ hàng"""
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    db.query(CartItem).filter(CartItem.user_id == user_id).delete()
    db.commit()
    return None

# Count items
@app.get("/cart/count")
async def get_cart_count(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Số lượng items trong giỏ"""
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    count = db.query(CartItem).filter(CartItem.user_id == user_id).count()
    return {"count": count}

# Get restaurant (cho biết giỏ của nhà hàng nào)
@app.get("/cart/restaurant")
async def get_cart_restaurant(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Lấy restaurant_id của items trong giỏ"""
    user = await verify_token(authorization)
    user_id = user["user_id"]
    
    item = db.query(CartItem).filter(CartItem.user_id == user_id).first()
    if not item:
        return {"restaurant_id": None}
    
    return {"restaurant_id": item.restaurant_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 