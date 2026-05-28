import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keycloak_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255))
    username = Column(String(255))
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    workout_program = Column(String(100), nullable=True, default="lean_and_mean")
    created_at = Column(DateTime, default=datetime.utcnow)

    equipment = relationship("Equipment", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    equipment_type = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="equipment")


class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program = Column(String(100), nullable=False, default="lean_and_mean", index=True)
    day_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    focus = Column(String(255), nullable=False)
    day_name = Column(String(50), nullable=False)  # Monday, Tuesday…
    warmup = Column(String(500))

    exercises = relationship("Exercise", back_populates="template", order_by="Exercise.display_order")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workout_template_id = Column(UUID(as_uuid=True), ForeignKey("workout_templates.id"), nullable=False)
    name = Column(String(255), nullable=False)
    target = Column(String(255))
    sets_default = Column(Integer, nullable=False)
    reps_min = Column(Integer, nullable=True)
    reps_max = Column(Integer, nullable=True)
    is_time_based = Column(Boolean, default=False)
    time_seconds = Column(Integer, nullable=True)
    rest_seconds = Column(Integer, nullable=False, default=60)
    weight_start = Column(String(100))
    weight_step = Column(String(200))
    weight_cap = Column(String(200))
    tip = Column(Text)
    # MET = Metabolic Equivalent of Task — used for calorie calc
    met_value = Column(Float, default=4.0)
    required_equipment = Column(JSON, default=list)  # e.g. ["dumbbells", "bench"]
    exercise_type = Column(String(50), default="strength")  # strength | cardio | core
    display_order = Column(Integer, default=0)

    template = relationship("WorkoutTemplate", back_populates="exercises")
    set_logs = relationship("SetLog", back_populates="exercise")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workout_template_id = Column(UUID(as_uuid=True), ForeignKey("workout_templates.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    total_calories = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")
    template = relationship("WorkoutTemplate")
    set_logs = relationship("SetLog", back_populates="session", cascade="all, delete-orphan")


class SetLog(Base):
    __tablename__ = "set_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(UUID(as_uuid=True), ForeignKey("exercises.id"), nullable=False)
    set_number = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)  # for time-based exercises
    calories_burned = Column(Float, default=0.0)
    logged_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    session = relationship("WorkoutSession", back_populates="set_logs")
    exercise = relationship("Exercise", back_populates="set_logs")
