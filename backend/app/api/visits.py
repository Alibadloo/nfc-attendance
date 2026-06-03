from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, date
import os, uuid, shutil
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.schemas import VisitRecordCreate, VisitRecordOut, VisitRecordBulk, DashboardStats
from app.config import settings
from app import models

router = APIRouter(prefix="/api/visits", tags=["visits"])

@router.post("/", response_model=VisitRecordOut)
def create_visit(data: VisitRecordCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    # Validate NFC tag
    tag = db.query(models.NfcTag).filter(models.NfcTag.tag_uid == data.nfc_uid_scanned, models.NfcTag.is_active == True).first()
    if not tag or not tag.checkpoint:
        raise HTTPException(status_code=400, detail="تگ NFC نامعتبر است")

    # Check duplicate in window
    from datetime import timedelta
    window_start = data.visited_at - timedelta(minutes=settings.DUPLICATE_SCAN_WINDOW_MINUTES)
    dup = db.query(models.VisitRecord).filter(
        and_(
            models.VisitRecord.user_id == current.id,
            models.VisitRecord.checkpoint_id == tag.checkpoint.id,
            models.VisitRecord.visited_at >= window_start,
            models.VisitRecord.visited_at <= data.visited_at,
        )
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail=f"این نقطه در {settings.DUPLICATE_SCAN_WINDOW_MINUTES} دقیقه اخیر ثبت شده است")

    # Dedup by local_id
    if data.local_id:
        existing = db.query(models.VisitRecord).filter(models.VisitRecord.local_id == data.local_id).first()
        if existing:
            return existing

    visit = models.VisitRecord(
        user_id=current.id,
        checkpoint_id=tag.checkpoint.id,
        nfc_uid_scanned=data.nfc_uid_scanned,
        device_id=data.device_id,
        visited_at=data.visited_at,
        status=data.status,
        notes=data.notes,
        local_id=data.local_id,
        sync_status=models.SyncStatus.SYNCED,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit

@router.post("/sync", response_model=dict)
def sync_visits(payload: VisitRecordBulk, db: Session = Depends(get_db), current=Depends(get_current_user)):
    """Bulk sync from offline device"""
    results = {"synced": [], "failed": [], "duplicates": []}
    for rec in payload.records:
        try:
            # Dedup by local_id
            if rec.local_id and db.query(models.VisitRecord).filter(models.VisitRecord.local_id == rec.local_id).first():
                results["duplicates"].append(rec.local_id)
                continue
            tag = db.query(models.NfcTag).filter(models.NfcTag.tag_uid == rec.nfc_uid_scanned, models.NfcTag.is_active == True).first()
            if not tag or not tag.checkpoint:
                results["failed"].append({"local_id": rec.local_id, "reason": "تگ نامعتبر"})
                continue
            visit = models.VisitRecord(
                user_id=current.id,
                checkpoint_id=tag.checkpoint.id,
                nfc_uid_scanned=rec.nfc_uid_scanned,
                device_id=rec.device_id,
                visited_at=rec.visited_at,
                status=rec.status,
                notes=rec.notes,
                local_id=rec.local_id,
                sync_status=models.SyncStatus.SYNCED,
            )
            db.add(visit)
            db.flush()
            results["synced"].append(rec.local_id)
        except Exception as e:
            results["failed"].append({"local_id": rec.local_id, "reason": str(e)})
    db.commit()
    return results

@router.get("/", response_model=List[VisitRecordOut])
def list_visits(
    user_id: Optional[int] = None,
    checkpoint_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    q = db.query(models.VisitRecord).options(
        joinedload(models.VisitRecord.user),
        joinedload(models.VisitRecord.checkpoint)
    )
    # Experts can only see their own
    if current.role != models.UserRole.ADMIN:
        q = q.filter(models.VisitRecord.user_id == current.id)
    else:
        if user_id:
            q = q.filter(models.VisitRecord.user_id == user_id)
    if checkpoint_id:
        q = q.filter(models.VisitRecord.checkpoint_id == checkpoint_id)
    if date_from:
        q = q.filter(models.VisitRecord.visited_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(models.VisitRecord.visited_at <= datetime.combine(date_to, datetime.max.time()))
    return q.order_by(models.VisitRecord.visited_at.desc()).offset(skip).limit(limit).all()

@router.post("/{visit_id}/image")
def upload_image(visit_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current=Depends(get_current_user)):
    visit = db.query(models.VisitRecord).filter(models.VisitRecord.id == visit_id, models.VisitRecord.user_id == current.id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="بازدید یافت نشد")
    if file.size and file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    visit.image_path = filename
    db.commit()
    return {"filename": filename}

@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    visits_today = db.query(func.count(models.VisitRecord.id)).filter(
        models.VisitRecord.visited_at.between(today_start, today_end)
    ).scalar()
    active_experts = db.query(func.count(models.User.id)).filter(
        models.User.is_active == True, models.User.role == models.UserRole.EXPERT
    ).scalar()
    total_records = db.query(func.count(models.VisitRecord.id)).scalar()
    # Checkpoints not visited today
    visited_today_ids = db.query(models.VisitRecord.checkpoint_id).filter(
        models.VisitRecord.visited_at.between(today_start, today_end)
    ).distinct().subquery()
    unvisited = db.query(func.count(models.Checkpoint.id)).filter(
        models.Checkpoint.is_active == True,
        ~models.Checkpoint.id.in_(visited_today_ids)
    ).scalar()
    pending_sync = db.query(func.count(models.VisitRecord.id)).filter(
        models.VisitRecord.sync_status == models.SyncStatus.PENDING
    ).scalar()
    return DashboardStats(
        visits_today=visits_today or 0,
        active_experts=active_experts or 0,
        total_records=total_records or 0,
        unvisited_checkpoints=unvisited or 0,
        pending_sync=pending_sync or 0,
    )
