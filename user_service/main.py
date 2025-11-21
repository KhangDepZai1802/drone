from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime
from pydantic import BaseModel
import enum, os

# Cấu hình
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = "secret_key_demo_123"
JWT_ALGORITHM = "HS256"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    RESTAURANT = "restaurant"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True)
    username = Column(String(100), unique=True)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    address = Column(String(500))
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER)
    restaurant_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserAuth(BaseModel):
    username: str
    password: str

class UserCreate(UserAuth):
    email: str
    full_name: str
    address: str = None
    role: str = "customer"
    restaurant_name: str = None

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(username="admin", email="admin@sys.com", hashed_password=pwd_context.hash("admin123"), full_name="Admin", role=UserRole.ADMIN)
            db.add(admin)
            db.commit()
        db.close()
    except: pass

@app.get("/")
def root(): return {"status": "healthy"}

# --- API ĐĂNG KÝ (JSON) ---
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(400, "Username đã tồn tại")
    new_user = User(
        username=user.username, email=user.email, hashed_password=pwd_context.hash(user.password),
        full_name=user.full_name, address=user.address, role=user.role, restaurant_name=user.restaurant_name
    )
    db.add(new_user)
    db.commit()
    return {"message": "Thành công"}

# --- API ĐĂNG NHẬP (JSON - Dành cho giao diện mới) ---
@app.post("/login")
def login(user_in: UserAuth, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_in.username).first()
    if not user or not pwd_context.verify(user_in.password, user.hashed_password):
        raise HTTPException(401, "Sai tài khoản hoặc mật khẩu")
    
    token = jwt.encode({
        "sub": user.username, 
        "role": user.role.value, 
        "uid": user.id
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "id": user.id, "username": user.username, 
            "role": user.role.value, "full_name": user.full_name,
            "address": user.address, "restaurant_name": user.restaurant_name
        }
    }

@app.get("/users")
def get_users(role: str = None, db: Session = Depends(get_db)):
    q = db.query(User)
    if role: q = q.filter(User.role == role)
    return q.all()

@app.get("/restaurants")
def get_restaurants(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.RESTAURANT).all()

# API cũ để tương thích ngược (nếu cần)
from fastapi.security import OAuth2PasswordRequestForm
@app.post("/token")
def login_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return login(UserAuth(username=form.username, password=form.password), db)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)