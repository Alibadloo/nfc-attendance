from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.dependencies import require_admin, get_current_user
from app.schemas import CheckpointCreate, CheckpointUpdate, CheckpointOut, NfcTagCreate, NfcTagOut
from app import models

router = APIRouter(prefix="/api/checkpoints", tags=["checkpoints"])
nfc_router = APIRouter(prefix="/api/nfc-tags", tags=["nfc-tags"])

@router.get("/", response_model=List[CheckpointOut])
def list_checkpoints(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Checkpoint).options(joinedload(models.Checkpoint.nfc_tag)).order_by(models.Checkpoint.name).all()

@router.post("/", response_model=CheckpointOut)
def create_checkpoint(data: CheckpointCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(models.Checkpoint).filter(models.Checkpoint.code == data.code).first():
        raise HTTPException(status_code=400, detail="کد نقطه تکراری است")
    cp = models.Checkpoint(**data.model_dump())
    db.add(cp)
    db.commit()
    db.refresh(cp)
    return cp

@router.put("/{cp_id}", response_model=CheckpointOut)
def update_checkpoint(cp_id: int, data: CheckpointUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    cp = db.query(models.Checkpoint).filter(models.Checkpoint.id == cp_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="نقطه بازرسی یافت نشد")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cp, field, value)
    db.commit()
    db.refresh(cp)
    return cp

@router.delete("/{cp_id}")
def delete_checkpoint(cp_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    cp = db.query(models.Checkpoint).filter(models.Checkpoint.id == cp_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="نقطه بازرسی یافت نشد")
    db.delete(cp)
    db.commit()
    return {"detail": "نقطه بازرسی حذف شد"}

# NFC Tags
@nfc_router.get("/", response_model=List[NfcTagOut])
def list_nfc_tags(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(models.NfcTag).all()

@nfc_router.post("/", response_model=NfcTagOut)
def create_nfc_tag(data: NfcTagCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(models.NfcTag).filter(models.NfcTag.tag_uid == data.tag_uid).first():
        raise HTTPException(status_code=400, detail="شناسه NFC تکراری است")
    tag = models.NfcTag(**data.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

@nfc_router.get("/validate/{tag_uid}")
def validate_nfc(tag_uid: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    tag = db.query(models.NfcTag).filter(models.NfcTag.tag_uid == tag_uid, models.NfcTag.is_active == True).first()
    if not tag or not tag.checkpoint:
        raise HTTPException(status_code=404, detail="تگ NFC ناشناس یا غیرفعال است")
    return {"valid": True, "checkpoint": {"id": tag.checkpoint.id, "name": tag.checkpoint.name, "code": tag.checkpoint.code}}
