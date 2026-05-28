"""User profile routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import UserProfile, UserProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/", response_model=UserProfile)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/", response_model=UserProfile)
def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.height_cm is not None:
        current_user.height_cm = payload.height_cm
    if payload.weight_kg is not None:
        current_user.weight_kg = payload.weight_kg
    if payload.username is not None:
        current_user.username = payload.username
    if payload.workout_program is not None:
        current_user.workout_program = payload.workout_program
    db.commit()
    db.refresh(current_user)
    return current_user
