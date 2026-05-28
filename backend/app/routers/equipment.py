"""Equipment management routes."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Equipment, User
from app.schemas import EquipmentCreate, EquipmentOut

router = APIRouter(prefix="/equipment", tags=["equipment"])


@router.get("/", response_model=list[EquipmentOut])
def list_equipment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Equipment).filter(Equipment.user_id == current_user.id).all()


@router.post("/", response_model=EquipmentOut, status_code=status.HTTP_201_CREATED)
def add_equipment(
    payload: EquipmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = Equipment(
        user_id=current_user.id,
        name=payload.name,
        equipment_type=payload.equipment_type,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_equipment(
    equipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(Equipment)
        .filter(Equipment.id == equipment_id, Equipment.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Equipment not found")
    db.delete(item)
    db.commit()
