from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, VisitStatus, SyncStatus

# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    full_name: str
    role: UserRole

# --- User ---
class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    password: str
    role: UserRole = UserRole.EXPERT

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- NFC Tag ---
class NfcTagCreate(BaseModel):
    tag_uid: str
    description: Optional[str] = None

class NfcTagOut(BaseModel):
    id: int
    tag_uid: str
    description: Optional[str]
    is_active: bool
    class Config:
        from_attributes = True

# --- Checkpoint ---
class CheckpointCreate(BaseModel):
    name: str
    code: str
    location: Optional[str] = None
    description: Optional[str] = None
    nfc_tag_id: Optional[int] = None

class CheckpointUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    nfc_tag_id: Optional[int] = None
    is_active: Optional[bool] = None

class CheckpointOut(BaseModel):
    id: int
    name: str
    code: str
    location: Optional[str]
    description: Optional[str]
    nfc_tag_id: Optional[int]
    is_active: bool
    nfc_tag: Optional[NfcTagOut] = None
    class Config:
        from_attributes = True

# --- Visit Record ---
class VisitRecordCreate(BaseModel):
    nfc_uid_scanned: str
    device_id: Optional[str] = None
    visited_at: datetime
    status: VisitStatus = VisitStatus.OK
    notes: Optional[str] = None
    local_id: Optional[str] = None  # client UUID for dedup

class VisitRecordBulk(BaseModel):
    records: List[VisitRecordCreate]

class VisitRecordOut(BaseModel):
    id: int
    user_id: int
    checkpoint_id: int
    nfc_uid_scanned: str
    device_id: Optional[str]
    visited_at: datetime
    status: VisitStatus
    notes: Optional[str]
    image_path: Optional[str]
    sync_status: SyncStatus
    created_at: datetime
    user: Optional[UserOut] = None
    checkpoint: Optional[CheckpointOut] = None
    class Config:
        from_attributes = True

# --- Dashboard ---
class DashboardStats(BaseModel):
    visits_today: int
    active_experts: int
    total_records: int
    unvisited_checkpoints: int
    pending_sync: int
