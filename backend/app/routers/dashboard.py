"""Dashboard stats route."""
import json
import pathlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Exercise, SetLog, User, WorkoutSession, WorkoutTemplate
from app.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_MOCK_DATA_PATH = pathlib.Path(__file__).parent.parent / "mock_data.json"


# Maps keyword fragments in exercise.target → standard muscle group names
_MUSCLE_RULES = [
    ("chest",      ["chest", "pec"]),
    ("shoulders",  ["delt", "shoulder"]),
    ("triceps",    ["tricep"]),
    ("biceps",     ["bicep"]),
    ("back",       ["back", "lat", "rhomboid", "trap", "erector", "row"]),
    ("core",       ["abs", "oblique", "core", "plank"]),
    ("legs",       ["quad", "hamstring", "glute", "calf", "calves", "leg"]),
]


def _targets_to_muscles(targets: list[str]) -> list[str]:
    muscles: set[str] = set()
    for target in targets:
        if not target:
            continue
        t = target.lower()
        for group, keywords in _MUSCLE_RULES:
            if any(k in t for k in keywords):
                muscles.add(group)
    return sorted(muscles)


@router.get("/", response_model=DashboardStats)
def get_dashboard(
    period: str = Query("week", enum=["today", "week", "month", "all"]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if settings.SHOW_MOCK_DATA:
        return _mock_stats(period)
    uid = current_user.id
    now = datetime.utcnow()

    # ── Date range ────────────────────────────────────────────────
    if period == "today":
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_dt = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    elif period == "month":
        start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_dt = None

    # ── Base filter (shared across all queries) ───────────────────
    base_filter = [
        WorkoutSession.user_id == uid,
        WorkoutSession.completed_at.isnot(None),
    ]
    if start_dt:
        base_filter.append(WorkoutSession.started_at >= start_dt)

    # ── Aggregates ────────────────────────────────────────────────
    total_sessions = (
        db.query(func.count(WorkoutSession.id)).filter(*base_filter).scalar() or 0
    )

    total_calories = (
        db.query(func.sum(WorkoutSession.total_calories)).filter(*base_filter).scalar()
        or 0.0
    )

    # Duration: sum of (completed_at - started_at) for finished sessions
    session_rows = (
        db.query(WorkoutSession.started_at, WorkoutSession.completed_at)
        .filter(*base_filter)
        .all()
    )
    total_duration = int(
        sum(
            (s.completed_at - s.started_at).total_seconds()
            for s in session_rows
            if s.completed_at and s.started_at
        )
    )

    total_sets = (
        db.query(func.count(SetLog.id))
        .join(WorkoutSession, SetLog.session_id == WorkoutSession.id)
        .filter(*base_filter)
        .scalar()
        or 0
    )

    # ── Muscles worked ────────────────────────────────────────────
    target_rows = (
        db.query(Exercise.target)
        .join(SetLog, SetLog.exercise_id == Exercise.id)
        .join(WorkoutSession, SetLog.session_id == WorkoutSession.id)
        .filter(*base_filter)
        .distinct()
        .all()
    )
    muscles_worked = _targets_to_muscles([r[0] for r in target_rows])

    # ── Streak ────────────────────────────────────────────────────
    streak = _calc_streak(uid, db)

    # ── Recent sessions ───────────────────────────────────────────
    recent_rows = (
        db.query(WorkoutSession, WorkoutTemplate.name, WorkoutTemplate.focus)
        .join(WorkoutTemplate, WorkoutSession.workout_template_id == WorkoutTemplate.id)
        .filter(*base_filter)
        .order_by(WorkoutSession.started_at.desc())
        .limit(5)
        .all()
    )
    recent_sessions = [
        {
            "id": str(s.id),
            "workout_name": name,
            "focus": focus,
            "started_at": s.started_at.isoformat(),
            "total_calories": s.total_calories,
        }
        for s, name, focus in recent_rows
    ]

    return DashboardStats(
        total_sessions=total_sessions,
        total_calories_burned=round(total_calories, 1),
        total_duration_seconds=total_duration,
        total_sets_logged=total_sets,
        current_streak=streak,
        muscles_worked=muscles_worked,
        recent_sessions=recent_sessions,
    )


def _mock_stats(period: str) -> DashboardStats:
    """Return pre-built stats from mock_data.json — no DB needed."""
    with open(_MOCK_DATA_PATH) as f:
        data = json.load(f)

    now = datetime.utcnow()

    if period == "today":
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_dt = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    elif period == "month":
        start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_dt = None

    # Attach computed datetime and filter by period
    enriched = []
    for s in data["sessions"]:
        dt = now - timedelta(days=s["day_offset"])
        if start_dt is None or dt >= start_dt:
            enriched.append({**s, "_dt": dt})

    total_sessions = len(enriched)
    total_calories = round(sum(s["total_calories"] for s in enriched), 1)
    total_duration = sum(s["duration_seconds"] for s in enriched)
    total_sets = sum(s["total_sets"] for s in enriched)
    muscles = sorted({m for s in enriched for m in s["muscles"]})

    recent = sorted(enriched, key=lambda s: s["_dt"], reverse=True)[:5]
    recent_sessions = [
        {
            "id": f"mock-{i}",
            "workout_name": s["workout_name"],
            "focus": s["focus"],
            "started_at": s["_dt"].isoformat(),
            "total_calories": s["total_calories"],
        }
        for i, s in enumerate(recent)
    ]

    # Streak: count consecutive day_offsets starting from 0 (today)
    offsets = sorted({s["day_offset"] for s in data["sessions"]})
    streak, expected = 0, 0
    for offset in offsets:
        if offset == expected:
            streak += 1
            expected += 1
        else:
            break

    return DashboardStats(
        total_sessions=total_sessions,
        total_calories_burned=total_calories,
        total_duration_seconds=total_duration,
        total_sets_logged=total_sets,
        current_streak=streak,
        muscles_worked=muscles,
        recent_sessions=recent_sessions,
    )


def _calc_streak(user_id, db: Session) -> int:
    """Return consecutive days (ending today or yesterday) with a completed session."""
    rows = (
        db.query(func.date(WorkoutSession.started_at))
        .filter(WorkoutSession.user_id == user_id, WorkoutSession.completed_at.isnot(None))
        .distinct()
        .order_by(func.date(WorkoutSession.started_at).desc())
        .limit(60)
        .all()
    )
    if not rows:
        return 0

    dates = sorted({r[0] for r in rows}, reverse=True)
    today = datetime.utcnow().date()
    streak = 0
    expected = today

    for d in dates:
        if streak == 0 and d == expected - timedelta(days=1):
            expected = d
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        else:
            break

    return streak


