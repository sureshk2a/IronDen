"""Workout session & set-logging routes."""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Exercise, SetLog, User, WorkoutSession
from app.schemas import (
    SessionComplete,
    SessionStart,
    SetLogCreate,
    SetLogOut,
    WorkoutSessionOut,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])

# ── Calorie helper ────────────────────────────────────────────────────────────
_SET_DURATION_SECONDS = 45  # assumed work time per strength set


def _calc_calories(exercise: Exercise, reps: int | None, duration_seconds: int | None, weight_kg: float) -> float:
    """MET-based calorie burn for a single set."""
    if exercise.is_time_based:
        active_seconds = duration_seconds or exercise.time_seconds or _SET_DURATION_SECONDS
    else:
        active_seconds = _SET_DURATION_SECONDS
    hours = active_seconds / 3600.0
    return round(exercise.met_value * weight_kg * hours, 2)


# ── Session CRUD ──────────────────────────────────────────────────────────────

@router.post("/", response_model=WorkoutSessionOut, status_code=status.HTTP_201_CREATED)
def start_session(
    payload: SessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only one active (incomplete) session per user at a time
    active = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.completed_at.is_(None),
        )
        .first()
    )
    if active:
        return active

    session = WorkoutSession(
        user_id=current_user.id,
        workout_template_id=payload.workout_template_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/active", response_model=WorkoutSessionOut | None)
def get_active_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.completed_at.is_(None),
        )
        .first()
    )


@router.post("/{session_id}/complete", response_model=WorkoutSessionOut)
def complete_session(
    session_id: UUID,
    payload: SessionComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_own_session(session_id, current_user, db)
    if session.completed_at:
        raise HTTPException(status_code=400, detail="Session already completed")

    total = sum(log.calories_burned for log in session.set_logs)
    session.completed_at = datetime.utcnow()
    session.total_calories = total
    session.notes = payload.notes
    db.commit()
    db.refresh(session)
    return session


@router.get("/history", response_model=list[WorkoutSessionOut])
def session_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.completed_at.isnot(None),
        )
        .order_by(WorkoutSession.started_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/{session_id}", response_model=WorkoutSessionOut)
def get_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_own_session(session_id, current_user, db)


# ── Set Logging ───────────────────────────────────────────────────────────────

@router.post("/{session_id}/sets", response_model=SetLogOut, status_code=status.HTTP_201_CREATED)
def log_set(
    session_id: UUID,
    payload: SetLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_own_session(session_id, current_user, db)
    if session.completed_at:
        raise HTTPException(status_code=400, detail="Cannot log sets to a completed session")

    exercise = db.query(Exercise).filter(Exercise.id == payload.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    user_weight = current_user.weight_kg or 75.0
    calories = _calc_calories(exercise, payload.reps, payload.duration_seconds, user_weight)

    log = SetLog(
        session_id=session.id,
        exercise_id=payload.exercise_id,
        set_number=payload.set_number,
        reps=payload.reps,
        weight_kg=payload.weight_kg,
        duration_seconds=payload.duration_seconds,
        calories_burned=calories,
        notes=payload.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{session_id}/sets/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set_log(
    session_id: UUID,
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_own_session(session_id, current_user, db)
    log = db.query(SetLog).filter(SetLog.id == log_id, SetLog.session_id == session.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Set log not found")
    db.delete(log)
    db.commit()


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_own_session(session_id, current_user, db)
    db.query(SetLog).filter(SetLog.session_id == session.id).delete()
    db.delete(session)
    db.commit()


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_own_session(session_id: UUID, user: User, db: Session) -> WorkoutSession:
    session = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.id == session_id, WorkoutSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
