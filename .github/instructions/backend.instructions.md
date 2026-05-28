---
applyTo: "backend/**"
---

# Backend Instructions

## Framework & Patterns
- **FastAPI** with SQLAlchemy ORM + Pydantic v2 schemas
- Session-per-request pattern: `db: Session = Depends(get_db)` injected in every router function
- All request/response types defined in `schemas.py` — never return raw ORM objects

## Auth
- Every protected endpoint must use `Depends(get_current_user)` from `auth.py`
- `get_current_user` verifies the Keycloak JWT against the JWKS endpoint
- Returns a `User` ORM object with `keycloak_id` (sub claim), `email`, `weight_kg`

## Database
- Models in `models.py` — SQLAlchemy declarative base; 6 tables: `User`, `Equipment`, `WorkoutTemplate`, `Exercise`, `WorkoutSession`, `SetLog`
- `db.commit()` only inside router functions, never in helpers or schemas
- When deleting a session, manually delete child `SetLog` rows first (no cascade configured)

## Calorie Calculation
```python
calories = exercise.met_value * weight_kg * (active_seconds / 3600)
# Strength sets: active_seconds = 45
# Time-based exercises: active_seconds = exercise.time_seconds
```

## Key Endpoints Summary
| Router file | Prefix | Notes |
|-------------|--------|-------|
| `sessions.py` | `/sessions` | POST `/`, GET `/active`, POST `/{id}/complete`, GET `/history`, GET `/{id}`, POST `/{id}/sets`, DELETE `/{id}/sets/{log_id}`, DELETE `/{id}` |
| `dashboard.py` | `/dashboard` | GET `/?period=` (today/week/month/all); returns `DashboardStats`; respects `SHOW_MOCK_DATA` env flag |
| `workouts.py` | `/workouts` | GET `/` (all templates), GET `/{id}` (single with exercises) |
| `equipment.py` | `/equipment` | CRUD for user equipment; drives `available` flag on exercises |
| `profile.py` | `/profile` | GET/PATCH user profile (height, weight, username) |

## Seeding
- `seed.py` is idempotent — checks existing `WorkoutTemplate.day_number` values before inserting
- Run automatically on startup via `main.py`; safe to call multiple times
- Currently seeds 6 days: Monday–Friday (days 1–5) + Sunday (day 7)

## Adding a New Router
1. Create `backend/app/routers/your_feature.py`
2. Define `router = APIRouter(prefix="/your_feature", tags=["your_feature"])`
3. Register in `main.py` via `app.include_router(router)`

## Environment Variables
Defined in `config.py` (pydantic `BaseSettings`). Key vars:
- `DATABASE_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`
- `CORS_ORIGINS` — comma-separated list of allowed origins
- `SHOW_MOCK_DATA` — `"true"` returns canned dashboard data (dev/demo use)
