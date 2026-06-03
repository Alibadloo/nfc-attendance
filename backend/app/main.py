from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine
from app.models import Base
from app.api import auth, users, checkpoints, visits, reports
from app.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(checkpoints.router)
app.include_router(checkpoints.nfc_router)
app.include_router(visits.router)
app.include_router(reports.router)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}

# Seed admin user on first run
@app.on_event("startup")
def seed_admin():
    from app.database import SessionLocal
    from app.models import User, UserRole
    from app.services.auth import hash_password
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                full_name="مدیر سیستم",
                hashed_password=hash_password("admin1234"),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created: admin / admin1234")
    finally:
        db.close()
