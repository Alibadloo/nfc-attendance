from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EXPERT = "expert"

class VisitStatus(str, enum.Enum):
    OK = "ok"
    ISSUE = "issue"
    CRITICAL = "critical"

class SyncStatus(str, enum.Enum):
    SYNCED = "synced"
    PENDING = "pending"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.EXPERT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    visits = relationship("VisitRecord", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class NfcTag(Base):
    __tablename__ = "nfc_tags"
    id = Column(Integer, primary_key=True, index=True)
    tag_uid = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    checkpoint = relationship("Checkpoint", back_populates="nfc_tag", uselist=False)

class Checkpoint(Base):
    __tablename__ = "checkpoints"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    location = Column(String(200))
    description = Column(Text)
    nfc_tag_id = Column(Integer, ForeignKey("nfc_tags.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    nfc_tag = relationship("NfcTag", back_populates="checkpoint")
    visits = relationship("VisitRecord", back_populates="checkpoint")

class VisitRecord(Base):
    __tablename__ = "visit_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=False)
    nfc_uid_scanned = Column(String(100), nullable=False)
    device_id = Column(String(100))
    visited_at = Column(DateTime, nullable=False)
    status = Column(SAEnum(VisitStatus), default=VisitStatus.OK)
    notes = Column(Text)
    image_path = Column(String(500))
    sync_status = Column(SAEnum(SyncStatus), default=SyncStatus.SYNCED)
    local_id = Column(String(100))  # client-side UUID for dedup
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="visits")
    checkpoint = relationship("Checkpoint", back_populates="visits")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100))
    entity_id = Column(Integer)
    detail = Column(Text)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="audit_logs")

class DeviceRegistry(Base):
    __tablename__ = "device_registry"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    device_name = Column(String(100))
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_trusted = Column(Boolean, default=True)
