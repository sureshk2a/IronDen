from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ── User ──────────────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id: UUID
    keycloak_id: str
    email: Optional[str]
    username: Optional[str]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    workout_program: Optional[str] = "lean_and_mean"
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    username: Optional[str] = None
    workout_program: Optional[str] = None


# ── Equipment ─────────────────────────────────────────────────────────────────

class EquipmentCreate(BaseModel):
    name: str
    equipment_type: str


class EquipmentOut(BaseModel):
    id: UUID
    name: str
    equipment_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Exercises ─────────────────────────────────────────────────────────────────

class ExerciseOut(BaseModel):
    id: UUID
    name: str
    target: Optional[str]
    sets_default: int
    reps_min: Optional[int]
    reps_max: Optional[int]
    is_time_based: bool
    time_seconds: Optional[int]
    rest_seconds: int
    weight_start: Optional[str]
    weight_step: Optional[str]
    weight_cap: Optional[str]
    tip: Optional[str]
    met_value: float
    required_equipment: list
    exercise_type: str
    available: bool = True   # computed: user has required equipment

    class Config:
        from_attributes = True


# ── Workout Templates ─────────────────────────────────────────────────────────

class WorkoutTemplateOut(BaseModel):
    id: UUID
    program: str
    day_number: int
    name: str
    focus: str
    day_name: str
    warmup: Optional[str]
    exercises: list[ExerciseOut] = []

    class Config:
        from_attributes = True


# ── Sessions ──────────────────────────────────────────────────────────────────

class SessionStart(BaseModel):
    workout_template_id: UUID


class SessionComplete(BaseModel):
    notes: Optional[str] = None


class SetLogCreate(BaseModel):
    exercise_id: UUID
    set_number: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_seconds: Optional[int] = None
    notes: Optional[str] = None


class SetLogOut(BaseModel):
    id: UUID
    exercise_id: UUID
    set_number: int
    reps: Optional[int]
    weight_kg: Optional[float]
    duration_seconds: Optional[int]
    calories_burned: float
    logged_at: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True


class WorkoutSessionOut(BaseModel):
    id: UUID
    workout_template_id: UUID
    started_at: datetime
    completed_at: Optional[datetime]
    total_calories: float
    notes: Optional[str]
    set_logs: list[SetLogOut] = []

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_sessions: int
    total_calories_burned: float
    total_duration_seconds: int
    total_sets_logged: int
    current_streak: int
    muscles_worked: list[str]
    recent_sessions: list[dict]
