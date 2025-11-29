from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
import time

# ==========================================
# 1. CONFIGURATION
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Database setup
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================================
# 2. DATABASE MODELS
# ==========================================
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(20))
    address = Column(String(500))
    role = Column(String(20), default="customer") # 'admin', 'restaurant', 'customer'
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Restaurant-specific fields
    restaurant_name = Column(String(255))
    restaurant_description = Column(Text)
    restaurant_image = Column(String(500))
    city = Column(String(100))
    status = Column(String(20), default="active")

# ==========================================
# 3. PYDANTIC MODELS
# ==========================================
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    # Role mặc định là customer, không cho user tự set

class RestaurantCreate(UserRegister):
    restaurant_name: str
    restaurant_description: Optional[str] = None
    city: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    role: str
    is_active: bool
    restaurant_name: Optional[str] = None
    restaurant_description: Optional[str] = None
    restaurant_image: Optional[str] = None
    city: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class RestaurantUpdateRequest(BaseModel):
    restaurant_name: Optional[str] = None
    restaurant_description: Optional[str] = None
    restaurant_image: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

# ==========================================
# 4. APP SETUP
# ==========================================
app = FastAPI(title="User Service", version="1.0.0")

# Cho phép chính xác địa chỉ Frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # <--- ĐÚNG: Chỉ định rõ nguồn
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

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Startup event
@app.on_event("startup")
async def startup_event():
    max_retries = 30
    retry_count = 0
    while retry_count < max_retries:
        try:
            Base.metadata.create_all(bind=engine)
            print("✓ Database tables created successfully")
            
            # Create default admin
            db = SessionLocal()
            admin = db.query(User).filter(User.username == "admin").first()
            if not admin:
                admin = User(
                    email="admin@system.com",
                    username="admin",
                    hashed_password=get_password_hash("123456"), # [FIX] Dùng hàm hash chuẩn
                    full_name="System Administrator",
                    role="admin",
                    is_active=1
                )
                db.add(admin)
                db.commit()
                print("✓ Admin user created")
            db.close()
            break
        except Exception as e:
            retry_count += 1
            print(f"Database connection failed (attempt {retry_count}/{max_retries}): {e}")
            time.sleep(2)

# ==========================================
# 5. ROUTES
# ==========================================

@app.get("/")
async def root():
    return {"service": "User Service", "status": "running"}

# --- AUTH ---

@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Đăng ký tài khoản KHÁCH HÀNG mới"""
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        address=user_data.address,
        role="customer", # Cứng role customer
        is_active=1
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Đăng nhập lấy Token"""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is inactive")
    
    access_token = create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "role": user.role
        }
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/verify-token")
async def verify_user_token(token_data: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """API nội bộ để các service khác verify token"""
    user_id = token_data.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }

# --- ADMIN ---

@app.post("/admin/create-restaurant", response_model=UserResponse)
async def create_restaurant_account(
    user_data: RestaurantCreate, 
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Admin tạo tài khoản Nhà hàng"""
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    new_restaurant = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="restaurant", # Role Restaurant
        restaurant_name=user_data.restaurant_name,
        restaurant_description=user_data.restaurant_description,
        city=user_data.city,
        is_active=1
    )
    db.add(new_restaurant)
    db.commit()
    db.refresh(new_restaurant)
    return new_restaurant

@app.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Admin xem danh sách User"""
    if token_data.get("role") != "admin":
         raise HTTPException(status_code=403, detail="Admin access required")
         
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()

# --- PUBLIC ---

@app.get("/restaurants", response_model=List[UserResponse])
async def list_restaurants(db: Session = Depends(get_db)):
    """Xem danh sách nhà hàng (Public)"""
    return db.query(User).filter(User.role == "restaurant", User.is_active == 1).all()

@app.get("/restaurants/{restaurant_id}", response_model=UserResponse)
async def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Xem chi tiết nhà hàng"""
    restaurant = db.query(User).filter(User.id == restaurant_id, User.role == "restaurant").first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant

# --- PROFILE ---

@app.get("/users/me", response_model=UserResponse)
async def get_my_profile(token_data: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/me", response_model=UserResponse)
async def update_profile(
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if full_name: user.full_name = full_name
    if phone: user.phone = phone
    if address: user.address = address
    db.commit()
    db.refresh(user)
    return user

@app.put("/restaurants/me", response_model=UserResponse)
async def update_restaurant_info(
    data: RestaurantUpdateRequest,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    
    if user.role != "restaurant":
        raise HTTPException(status_code=403, detail="Only restaurants can use this endpoint")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)