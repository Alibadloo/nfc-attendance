from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import LoginRequest, TokenResponse
from app.services.auth import authenticate_user, create_access_token
from app.dependencies import get_current_user
from app import models

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نام کاربری یا رمز عبور اشتباه است")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    # Log the action
    log = models.AuditLog(user_id=user.id, action="login", ip_address=request.client.host if request.client else None)
    db.add(log)
    db.commit()
    return TokenResponse(access_token=token, user_id=user.id, username=user.username, full_name=user.full_name, role=user.role)

@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "full_name": current_user.full_name, "role": current_user.role}
