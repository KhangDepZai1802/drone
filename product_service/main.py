from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import time
import httpx
import shutil
import uuid

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL")

# --- [QUAN TRỌNG] CẤU HÌNH THƯ MỤC ẢNH ---
UPLOAD_DIR = "static/images"
# Tạo thư mục nếu chưa có
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Database setup
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    original_price = Column(Float) # Giữ nguyên cột này từ code cũ của bạn
    image_url = Column(String(500))
    category = Column(String(100))
    is_available = Column(Integer, default=1) # SQLite/MySQL đôi khi dùng Int cho bool
    preparation_time = Column(Integer, default=15)  # minutes
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models (Giữ lại để dùng cho Response model và Swagger UI)
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_available: bool = True
    preparation_time: int = 15

class ProductCreate(ProductBase):
    restaurant_id: int

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None
    preparation_time: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    restaurant_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# FastAPI app
app = FastAPI(title="Product Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- [MỚI] MOUNT THƯ MỤC STATIC ĐỂ XEM ẢNH ---
# Truy cập ảnh qua: http://localhost:8002/static/images/ten_anh.jpg
app.mount("/static", StaticFiles(directory="static"), name="static")

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

# Auth dependency
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
    return {"service": "Product Service", "status": "running"}

# --- [CẬP NHẬT QUAN TRỌNG] API TẠO MỚI CÓ UPLOAD ẢNH ---
@app.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    name: str = Form(...),
    price: float = Form(...),
    restaurant_id: int = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    preparation_time: int = Form(15),
    is_available: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    image_path_db = None
    if image:
        try:
            file_extension = image.filename.split(".")[-1]
            file_name = f"{uuid.uuid4()}.{file_extension}"
            file_location = f"{UPLOAD_DIR}/{file_name}"
            
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            # Lưu đường dẫn tương đối
            image_path_db = f"/static/images/{file_name}" 
        except Exception as e:
            print(f"Error saving image: {e}")

    new_product = Product(
        name=name,
        price=price,
        restaurant_id=restaurant_id,
        description=description,
        category=category,
        preparation_time=preparation_time,
        is_available=1 if is_available else 0,
        image_url=image_path_db 
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product  

@app.get("/products", response_model=List[ProductResponse])
async def list_products(
    restaurant_id: Optional[int] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    if restaurant_id:
        query = query.filter(Product.restaurant_id == restaurant_id)
    if category:
        query = query.filter(Product.category == category)
    
    products = query.order_by(Product.id).offset(skip).limit(limit).all()
    return products

@app.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product_update.dict(exclude_unset=True).items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product

@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return None

@app.get("/products/restaurant/{restaurant_id}", response_model=List[ProductResponse])
async def get_restaurant_products(restaurant_id: int, db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.restaurant_id == restaurant_id).all()
    return products

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)