"""IronDen FastAPI application entry point."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import dashboard, equipment, profile, sessions, workouts
from app.routers import ai as ai_router
from app.seed import run_seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IronDen API",
    description="Workout tracker backend for the IronDen app",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(profile.router)
app.include_router(equipment.router)
app.include_router(workouts.router)
app.include_router(sessions.router)
app.include_router(dashboard.router)
app.include_router(ai_router.router)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Idempotent column migrations for new fields added after initial deploy
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE workout_templates "
            "ADD COLUMN IF NOT EXISTS program VARCHAR(100) NOT NULL DEFAULT 'lean_and_mean'"
        ))
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS workout_program VARCHAR(100) DEFAULT 'lean_and_mean'"
        ))
        conn.commit()
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
    logger.info("IronDen API ready.")


@app.get("/health")
def health():
    return {"status": "ok"}
