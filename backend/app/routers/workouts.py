"""Workout template routes — returns exercises filtered by user equipment."""
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Equipment, Exercise, User, WorkoutTemplate
from app.schemas import ExerciseOut, WorkoutTemplateOut

router = APIRouter(prefix="/workouts", tags=["workouts"])


def _user_equipment_types(user_id, db: Session) -> set[str]:
    rows = db.query(Equipment.equipment_type).filter(Equipment.user_id == user_id).all()
    return {r[0] for r in rows}


def _enrich_exercises(exercises: list[Exercise], owned: set[str]) -> list[ExerciseOut]:
    result = []
    for ex in exercises:
        required: list = ex.required_equipment or []
        available = all(req in owned for req in required)
        out = ExerciseOut.model_validate(ex)
        out.available = available
        result.append(out)
    return result


@router.get("/", response_model=list[WorkoutTemplateOut])
def list_workouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned = _user_equipment_types(current_user.id, db)
    program = current_user.workout_program or "lean_and_mean"
    templates = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.program == program)
        .order_by(WorkoutTemplate.day_number)
        .all()
    )
    result = []
    for t in templates:
        out = WorkoutTemplateOut.model_validate(t)
        out.exercises = _enrich_exercises(t.exercises, owned)
        result.append(out)
    return result


@router.get("/{workout_id}", response_model=WorkoutTemplateOut)
def get_workout(
    workout_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned = _user_equipment_types(current_user.id, db)
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == workout_id).first()
    if not template:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workout not found")
    out = WorkoutTemplateOut.model_validate(template)
    out.exercises = _enrich_exercises(template.exercises, owned)
    return out
