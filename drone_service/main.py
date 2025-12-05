from fastapi import FastAPI, Depends, HTTPException, Header, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import json
import asyncio
import math
import os
import time
import httpx
import redis
import threading
from enum import Enum

# ==========================================
# CONFIGURATION
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")
ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://order_service:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

# Drone config
DRONE_GPS_UPDATE_INTERVAL = int(os.getenv("DRONE_GPS_UPDATE_INTERVAL", "5"))  # 5 giây
DRONE_MAX_SPEED = float(os.getenv("DRONE_MAX_SPEED", "50"))  # km/h
DRONE_BATTERY_DRAIN_RATE = float(os.getenv("DRONE_BATTERY_DRAIN_RATE", "0.5"))  # % per km
DRONE_DEFAULT_LAT = float(os.getenv("DRONE_DEFAULT_LAT", "10.762622"))
DRONE_DEFAULT_LNG = float(os.getenv("DRONE_DEFAULT_LNG", "106.660172"))

# Database & Cache
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# ==========================================
# DATABASE MODELS
# ==========================================
class Drone(Base):
    __tablename__ = "drones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    model = Column(String(100))
    status = Column(String(20), default="idle")  # idle, in_delivery, returning, charging, maintenance
    battery_level = Column(Float, default=100.0)
    max_payload = Column(Float, default=5.0)
    max_distance_km = Column(Float, default=20.0)
    current_lat = Column(Float, default=DRONE_DEFAULT_LAT)
    current_lng = Column(Float, default=DRONE_DEFAULT_LNG)
    destination_lat = Column(Float, nullable=True)
    destination_lng = Column(Float, nullable=True)
    base_lat = Column(Float, default=DRONE_DEFAULT_LAT)
    base_lng = Column(Float, default=DRONE_DEFAULT_LNG)
    assigned_order_id = Column(Integer, nullable=True)
    total_distance_traveled = Column(Float, default=0.0)
    flight_hours = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_update = Column(DateTime, default=datetime.utcnow)

class DroneTracking(Base):
    __tablename__ = "drone_tracking"
    id = Column(Integer, primary_key=True, index=True)
    drone_id = Column(Integer, nullable=False)
    order_id = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, default=30.0)  # meters
    speed = Column(Float, default=0.0)  # km/h
    battery_level = Column(Float)
    status = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)

# ==========================================
# PYDANTIC MODELS
# ==========================================
class DroneStatus(str, Enum):
    IDLE = "idle"
    IN_DELIVERY = "in_delivery"
    RETURNING = "returning"
    CHARGING = "charging"
    MAINTENANCE = "maintenance"

class DroneCreate(BaseModel):
    name: str
    model: Optional[str] = None
    max_payload: float = 5.0
    max_distance_km: float = 20.0
    base_lat: Optional[float] = None
    base_lng: Optional[float] = None

class DroneResponse(BaseModel):
    id: int
    name: str
    model: Optional[str]
    status: str
    battery_level: float
    max_payload: float
    max_distance_km: float
    current_lat: float
    current_lng: float
    assigned_order_id: Optional[int]
    total_distance_traveled: float
    flight_hours: float
    created_at: datetime
    class Config:
        from_attributes = True

class DroneTrackingResponse(BaseModel):
    id: int
    drone_id: int
    order_id: Optional[int]
    latitude: float
    longitude: float
    altitude: float
    speed: float
    battery_level: float
    status: str
    timestamp: datetime
    class Config:
        from_attributes = True

class DroneAssignmentRequest(BaseModel):
    drone_id: int
    order_id: int
    destination_lat: float
    destination_lng: float

class DroneChargingRequest(BaseModel):
    drone_id: int

# ==========================================
# APP SETUP
# ==========================================
app = FastAPI(title="Drone Service", version="2.0.0")

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

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Drone Service Started")
    
    # Create sample drones if none exist
    db = SessionLocal()
    if db.query(Drone).count() == 0:
        sample_drones = [
            Drone(
                name="Falcon Alpha", 
                model="DJI Matrice 300", 
                status="idle",
                battery_level=100.0,
                max_payload=6.0,
                max_distance_km=20.0,
                current_lat=10.762622,
                current_lng=106.660172,
                base_lat=10.762622,
                base_lng=106.660172
            ),
            Drone(
                name="Falcon Beta", 
                model="DJI Mavic 3", 
                status="idle",
                battery_level=95.0,
                max_payload=3.0,
                max_distance_km=15.0,
                current_lat=10.762622,
                current_lng=106.660172,
                base_lat=10.762622,
                base_lng=106.660172
            ),
            Drone(
                name="Falcon Gamma", 
                model="Custom FPV", 
                status="charging",
                battery_level=20.0,
                max_payload=2.0,
                max_distance_km=10.0,
                current_lat=10.762622,
                current_lng=106.660172,
                base_lat=10.762622,
                base_lng=106.660172
            ),
        ]
        db.add_all(sample_drones)
        db.commit()
        print("✅ Sample drones created")
    db.close()
    
    # Start background tracking thread
    threading.Thread(target=background_drone_tracking, daemon=True).start()

# ==========================================
# HELPER FUNCTIONS
# ==========================================
def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine formula - tính khoảng cách giữa 2 điểm GPS"""
    R = 6371  # Earth radius in km
    lat1_rad, lat2_rad = math.radians(lat1), math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def calculate_bearing(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate bearing (hướng) từ điểm A đến B"""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lng = math.radians(lng2 - lng1)
    
    y = math.sin(delta_lng) * math.cos(lat2_rad)
    x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lng)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360

def move_towards_target(
    current_lat: float, current_lng: float, 
    target_lat: float, target_lng: float,
    speed_kmh: float, time_interval_sec: float
) -> tuple:
    """Tính vị trí mới sau khi bay với tốc độ nhất định trong khoảng thời gian"""
    distance = calculate_distance(current_lat, current_lng, target_lat, target_lng)
    bearing = calculate_bearing(current_lat, current_lng, target_lat, target_lng)
    
    # km đã bay = tốc độ (km/h) * thời gian (h)
    distance_traveled = (speed_kmh / 3600) * time_interval_sec  # convert to km
    
    if distance_traveled >= distance:
        # Đã tới đích
        return target_lat, target_lng, distance, 0.0
    
    # Tính vị trí mới dựa trên bearing
    bearing_rad = math.radians(bearing)
    lat_change = distance_traveled * 111  # 1 degree ≈ 111 km
    lng_change = distance_traveled * 111 / math.cos(math.radians(current_lat))
    
    new_lat = current_lat + (lat_change * math.cos(bearing_rad) / 111)
    new_lng = current_lng + (lng_change * math.sin(bearing_rad) / 111)
    
    remaining_distance = calculate_distance(new_lat, new_lng, target_lat, target_lng)
    actual_speed = (distance_traveled / (time_interval_sec / 3600)) if time_interval_sec > 0 else 0
    
    return new_lat, new_lng, remaining_distance, actual_speed

def background_drone_tracking():
    """Background thread - simulate drone movement every 5 seconds"""
    while True:
        try:
            db = SessionLocal()
            drones = db.query(Drone).filter(Drone.status.in_(["in_delivery", "returning"])).all()
            
            for drone in drones:
                if not drone.destination_lat or not drone.destination_lng:
                    continue
                
                # Move drone towards destination
                new_lat, new_lng, remaining_dist, speed = move_towards_target(
                    drone.current_lat, drone.current_lng,
                    drone.destination_lat, drone.destination_lng,
                    DRONE_MAX_SPEED,
                    DRONE_GPS_UPDATE_INTERVAL
                )
                
                # Update position
                drone.current_lat = new_lat
                drone.current_lng = new_lng
                
                # Update battery
                distance_traveled = calculate_distance(
                    new_lat, new_lng, 
                    drone.current_lat - 0.001, drone.current_lng - 0.001  # Approximation
                )
                battery_drain = distance_traveled * DRONE_BATTERY_DRAIN_RATE
                drone.battery_level = max(0, drone.battery_level - battery_drain)
                
                # Update distance & flight hours
                drone.total_distance_traveled += distance_traveled
                drone.flight_hours += (DRONE_GPS_UPDATE_INTERVAL / 3600)
                
                # Check if reached destination
                if remaining_dist < 0.05:  # Within 50 meters
                    if drone.status == "in_delivery":
                        drone.status = "returning"
                        drone.destination_lat = drone.base_lat
                        drone.destination_lng = drone.base_lng
                    elif drone.status == "returning":
                        drone.status = "idle"
                        drone.destination_lat = None
                        drone.destination_lng = None
                        drone.assigned_order_id = None
                
                # Auto-charge if battery low
                if drone.battery_level < 15 and drone.status == "idle":
                    drone.status = "charging"
                
                # Update last_update
                drone.last_update = datetime.utcnow()
                
                # Save to DB
                db.commit()
                
                # Save to Redis for real-time
                tracking_data = {
                    "drone_id": drone.id,
                    "lat": drone.current_lat,
                    "lng": drone.current_lng,
                    "status": drone.status,
                    "battery": drone.battery_level,
                    "timestamp": datetime.utcnow().isoformat()
                }
                redis_client.set(f"drone:{drone.id}:tracking", json.dumps(tracking_data), ex=60)
                
                # Create tracking record
                tracking = DroneTracking(
                    drone_id=drone.id,
                    order_id=drone.assigned_order_id,
                    latitude=drone.current_lat,
                    longitude=drone.current_lng,
                    speed=speed,
                    battery_level=drone.battery_level,
                    status=drone.status
                )
                db.add(tracking)
            
            db.commit()
            db.close()
            
        except Exception as e:
            print(f"❌ Tracking error: {e}")
        
        time.sleep(DRONE_GPS_UPDATE_INTERVAL)

# ==========================================
# REST API ROUTES
# ==========================================

@app.get("/")
async def root():
    return {"service": "Drone Service", "status": "running", "version": "2.0.0"}

# --- DRONE MANAGEMENT ---

@app.get("/drones", response_model=List[DroneResponse])
async def list_drones(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all drones"""
    query = db.query(Drone)
    if status:
        query = query.filter(Drone.status == status)
    return query.all()

@app.get("/drones/{drone_id}", response_model=DroneResponse)
async def get_drone(drone_id: int, db: Session = Depends(get_db)):
    """Get drone details"""
    drone = db.query(Drone).filter(Drone.id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    return drone

@app.post("/drones", response_model=DroneResponse, status_code=201)
async def create_drone(drone_data: DroneCreate, db: Session = Depends(get_db)):
    """Create new drone"""
    new_drone = Drone(
        name=drone_data.name,
        model=drone_data.model,
        max_payload=drone_data.max_payload,
        max_distance_km=drone_data.max_distance_km,
        base_lat=drone_data.base_lat or DRONE_DEFAULT_LAT,
        base_lng=drone_data.base_lng or DRONE_DEFAULT_LNG,
        current_lat=drone_data.base_lat or DRONE_DEFAULT_LAT,
        current_lng=drone_data.base_lng or DRONE_DEFAULT_LNG,
    )
    db.add(new_drone)
    db.commit()
    db.refresh(new_drone)
    return new_drone

# --- DRONE OPERATIONS ---

@app.post("/drones/{drone_id}/assign")
async def assign_drone(
    drone_id: int,
    request: DroneAssignmentRequest,
    db: Session = Depends(get_db)
):
    """Gán drone cho một đơn hàng"""
    drone = db.query(Drone).filter(Drone.id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    
    # Check requirements
    if drone.status != "idle":
        raise HTTPException(status_code=400, detail=f"Drone is {drone.status}")
    
    if drone.battery_level < 20:
        raise HTTPException(status_code=400, detail="Battery too low")
    
    distance = calculate_distance(
        drone.current_lat, drone.current_lng,
        request.destination_lat, request.destination_lng
    )
    
    if distance > drone.max_distance_km:
        raise HTTPException(status_code=400, detail="Distance exceeds drone range")
    
    # Assign
    drone.status = "in_delivery"
    drone.assigned_order_id = request.order_id
    drone.destination_lat = request.destination_lat
    drone.destination_lng = request.destination_lng
    drone.last_update = datetime.utcnow()
    
    db.commit()
    db.refresh(drone)
    
    return {"message": "Drone assigned", "drone": drone}

@app.post("/drones/{drone_id}/charge")
async def charge_drone(drone_id: int, db: Session = Depends(get_db)):
    """Sạc pin drone"""
    drone = db.query(Drone).filter(Drone.id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    
    drone.status = "charging"
    drone.battery_level = 100.0
    drone.destination_lat = None
    drone.destination_lng = None
    db.commit()
    return {"message": "Drone charging", "battery": 100.0}

@app.post("/drones/{drone_id}/return")
async def return_drone(drone_id: int, db: Session = Depends(get_db)):
    """Gọi drone quay về base"""
    drone = db.query(Drone).filter(Drone.id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    
    if drone.status == "idle":
        return {"message": "Drone already at base"}
    
    drone.status = "returning"
    drone.destination_lat = drone.base_lat
    drone.destination_lng = drone.base_lng
    db.commit()
    return {"message": "Drone returning to base"}

@app.post("/drones/{drone_id}/maintenance")
async def maintenance_mode(drone_id: int, db: Session = Depends(get_db)):
    """Set drone to maintenance"""
    drone = db.query(Drone).filter(Drone.id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    
    drone.status = "maintenance"
    drone.destination_lat = None
    drone.destination_lng = None
    db.commit()
    return {"message": "Drone in maintenance"}

# --- TRACKING ---

@app.get("/drones/{drone_id}/tracking", response_model=List[DroneTrackingResponse])
async def get_drone_tracking(
    drone_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get drone tracking history"""
    tracking = db.query(DroneTracking).filter(
        DroneTracking.drone_id == drone_id
    ).order_by(DroneTracking.timestamp.desc()).limit(limit).all()
    return tracking

@app.get("/drones/{drone_id}/current-position")
async def get_current_position(drone_id: int, db: Session = Depends(get_db)):
    """Get drone current position (real-time from Redis if available)"""
    drone = db.query(Drone).filter(Drone.id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    
    # Try Redis first (fresher data)
    cached = redis_client.get(f"drone:{drone_id}:tracking")
    if cached:
        return json.loads(cached)
    
    # Fall back to DB
    return {
        "drone_id": drone.id,
        "lat": drone.current_lat,
        "lng": drone.current_lng,
        "status": drone.status,
        "battery": drone.battery_level,
        "destination": {
            "lat": drone.destination_lat,
            "lng": drone.destination_lng
        } if drone.destination_lat else None,
        "timestamp": drone.last_update.isoformat()
    }

@app.get("/drones/{drone_id}/stats")
async def get_drone_stats(drone_id: int, db: Session = Depends(get_db)):
    """Get drone statistics"""
    drone = db.query(Drone).filter(Drone.id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    
    total_flights = db.query(DroneTracking).filter(
        DroneTracking.drone_id == drone_id
    ).count()
    
    return {
        "drone_id": drone.id,
        "name": drone.name,
        "total_distance_km": round(drone.total_distance_traveled, 2),
        "total_flight_hours": round(drone.flight_hours, 2),
        "total_flights": total_flights,
        "current_battery": drone.battery_level,
        "status": drone.status,
        "avg_distance_per_flight": round(
            drone.total_distance_traveled / max(total_flights, 1), 2
        )
    }

# --- REAL-TIME UPDATES (WebSocket) ---

manager = {}  # Store active WebSocket connections

@app.websocket("/ws/drone/{drone_id}")
async def websocket_drone_tracking(websocket: WebSocket, drone_id: int):
    """WebSocket for real-time drone tracking"""
    await websocket.accept()
    
    if drone_id not in manager:
        manager[drone_id] = []
    manager[drone_id].append(websocket)
    
    try:
        while True:
            # Receive message (keep connection alive)
            data = await websocket.receive_text()
            
            # Broadcast position update to all clients
            db = SessionLocal()
            drone = db.query(Drone).filter(Drone.id == drone_id).first()
            db.close()
            
            if drone:
                position = {
                    "type": "position_update",
                    "drone_id": drone.id,
                    "lat": drone.current_lat,
                    "lng": drone.current_lng,
                    "status": drone.status,
                    "battery": drone.battery_level,
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket.send_json(position)
            
            await asyncio.sleep(1)
    
    except WebSocketDisconnect:
        manager[drone_id].remove(websocket)
        if not manager[drone_id]:
            del manager[drone_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)