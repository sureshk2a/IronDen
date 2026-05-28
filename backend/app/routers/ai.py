"""AI-powered endpoints using Ollama (qwen2.5-coder:7b).

Endpoints
---------
POST /ai/workout-swap
    Given a newly added equipment item, returns swap recommendations
    (which existing exercise to remove → which new exercise to add) per workout day.

POST /ai/apply-swaps
    Applies accepted swap recommendations to the database.

Note: Equipment name suggestions are handled client-side from a static list.
"""
import json
import logging
import re
import uuid
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Equipment, Exercise, User, WorkoutTemplate

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

# ── Ollama helper ─────────────────────────────────────────────────────────────

def _ollama_stream(prompt: str, timeout: int = 240) -> str:
    """Call Ollama generate with streaming=True, accumulate tokens, return full text.
    Streaming avoids read-timeouts caused by long model warm-up: the first token
    arrives quickly and resets the idle timer on each chunk.
    """
    try:
        full = []
        with httpx.stream(
            "POST",
            f"{settings.OLLAMA_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {"num_predict": 200, "temperature": 0.1},
            },
            timeout=timeout,
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                    full.append(chunk.get("response", ""))
                    if chunk.get("done"):
                        break
                except json.JSONDecodeError:
                    continue
        return "".join(full).strip()
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=503, detail="AI model timed out — please try again.") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"AI unreachable: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI error: {exc}") from exc


def _extract_json(text: str) -> Any:
    """Strip markdown fences and parse the first JSON value found."""
    # Remove ```json ... ``` fences
    clean = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
    # Find first [ or { and parse from there
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        idx = clean.find(start_char)
        if idx != -1:
            try:
                return json.loads(clean[idx:])
            except json.JSONDecodeError:
                pass
    raise ValueError(f"No JSON found in: {text[:200]}")


# ── Workout swap recommendation ───────────────────────────────────────────────

class WorkoutSwapRequest(BaseModel):
    equipment_name: str
    equipment_type: str


PROGRAM_LABELS = {
    "lean_and_mean": "Lean & Mean 6-Day Dumbbell",
    "pure_strength": "Pure Strength",
    "fat_burner": "Fat Burner",
    "body_recomp": "Body Recomposition",
    "beginner_basics": "Beginner Basics",
    "upper_lower": "Upper/Lower Split",
}


@router.post("/workout-swap")
def workout_swap(
    payload: WorkoutSwapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ask the AI which exercises to swap in for the newly added equipment."""
    program = current_user.workout_program or "lean_and_mean"
    program_label = PROGRAM_LABELS.get(program, program)

    # Load all workout days + exercises for this program
    templates = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.program == program)
        .order_by(WorkoutTemplate.day_number)
        .all()
    )

    # Build a COMPACT single-line summary — names only, no JSON bloat
    lines = []
    for t in templates:
        names = ", ".join(ex.name for ex in t.exercises)
        lines.append(f"Day {t.day_number} ({t.focus}): {names}")
    days_compact = "\n".join(lines)

    prompt = f"""You are a personal trainer. A user added "{payload.equipment_name}" to their home gym.
Program: {program_label}

Current workout days (day number, focus, exercise names):
{days_compact}

Task: Pick the SINGLE best day where "{payload.equipment_name}" most improves the workout. Skip recovery/rest/cardio days.

Return ONLY a JSON array with exactly 1 object, no markdown:
[{{"day_number":1,"day_name":"Mon — Chest+Triceps","remove_exercise":"Diamond Push-Up","reason":"short reason","add_name":"Barbell Bench Press","add_target":"Chest","sets":4,"reps_min":6,"reps_max":8,"rest_seconds":90,"tip":"short tip"}}]"""

    raw = _ollama_stream(prompt, timeout=240)
    try:
        swaps_raw = _extract_json(raw)
        if not isinstance(swaps_raw, list):
            return {"swaps": []}
        valid = []
        for s in swaps_raw:
            if not isinstance(s, dict) or not s.get("add_name") or not s.get("remove_exercise"):
                continue
            # Build a full add_exercise object — AI provides minimal fields, backend fills defaults
            valid.append({
                "day_number": s.get("day_number"),
                "day_name": s.get("day_name", ""),
                "remove_exercise": s.get("remove_exercise", ""),
                "reason": s.get("reason", ""),
                "add_exercise": {
                    "name": s.get("add_name", ""),
                    "target": s.get("add_target", ""),
                    "sets_default": int(s.get("sets") or 3),
                    "reps_min": s.get("reps_min"),
                    "reps_max": s.get("reps_max"),
                    "is_time_based": False,
                    "time_seconds": None,
                    "rest_seconds": int(s.get("rest_seconds") or 60),
                    "weight_start": f"Start light with {payload.equipment_name}",
                    "weight_step": "+2–5 kg when reps feel easy",
                    "weight_cap": None,
                    "tip": s.get("tip", ""),
                    "met_value": 5.0,
                    "required_equipment": [payload.equipment_type],
                    "exercise_type": "strength",
                },
            })
        return {"swaps": valid}
    except Exception as exc:
        logger.warning("Failed to parse workout swap response: %s | raw: %s", exc, raw[:400])
        return {"swaps": []}


# ── Apply accepted swaps ──────────────────────────────────────────────────────

class SwapExercise(BaseModel):
    name: str
    target: str = ""
    sets_default: int = 3
    reps_min: int | None = None
    reps_max: int | None = None
    is_time_based: bool = False
    time_seconds: int | None = None
    rest_seconds: int = 60
    weight_start: str = ""
    weight_step: str = ""
    weight_cap: str | None = None
    tip: str = ""
    met_value: float = 4.0
    required_equipment: list[str] = []
    exercise_type: str = "strength"


class ApplySwapItem(BaseModel):
    day_number: int
    remove_exercise: str
    add_exercise: SwapExercise


class ApplySwapsRequest(BaseModel):
    swaps: list[ApplySwapItem]


@router.post("/apply-swaps")
def apply_swaps(
    payload: ApplySwapsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply the accepted swap recommendations to the database."""
    program = current_user.workout_program or "lean_and_mean"

    # Load all templates for this program indexed by day_number
    templates = {
        t.day_number: t
        for t in db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.program == program)
        .all()
    }

    applied = []
    for swap in payload.swaps:
        template = templates.get(swap.day_number)
        if not template:
            continue

        # Remove the old exercise (case-insensitive name match)
        removed = False
        for ex in template.exercises:
            if ex.name.lower() == swap.remove_exercise.lower():
                # Capture its display_order to slot the new one in the same position
                slot_order = ex.display_order
                db.delete(ex)
                removed = True
                break

        if not removed:
            # Try partial match as fallback
            for ex in template.exercises:
                if swap.remove_exercise.lower() in ex.name.lower():
                    slot_order = ex.display_order
                    db.delete(ex)
                    removed = True
                    break

        if not removed:
            # Still add the exercise even if we couldn't find the one to remove
            existing_orders = [e.display_order for e in template.exercises]
            slot_order = max(existing_orders, default=0) + 1

        # Insert the new exercise
        new_ex = Exercise(
            id=uuid.uuid4(),
            workout_template_id=template.id,
            name=swap.add_exercise.name,
            target=swap.add_exercise.target,
            sets_default=swap.add_exercise.sets_default,
            reps_min=swap.add_exercise.reps_min,
            reps_max=swap.add_exercise.reps_max,
            is_time_based=swap.add_exercise.is_time_based,
            time_seconds=swap.add_exercise.time_seconds,
            rest_seconds=swap.add_exercise.rest_seconds,
            weight_start=swap.add_exercise.weight_start,
            weight_step=swap.add_exercise.weight_step,
            weight_cap=swap.add_exercise.weight_cap,
            tip=swap.add_exercise.tip,
            met_value=swap.add_exercise.met_value,
            required_equipment=swap.add_exercise.required_equipment,
            exercise_type=swap.add_exercise.exercise_type,
            display_order=slot_order,
        )
        db.add(new_ex)
        applied.append({
            "day_number": swap.day_number,
            "removed": swap.remove_exercise if removed else None,
            "added": swap.add_exercise.name,
        })

    db.commit()
    return {"applied": applied}
