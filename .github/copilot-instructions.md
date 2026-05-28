# IronDen — Copilot Instructions

## Project Overview
IronDen is a full-stack workout tracker web app built around the **Lean & Mean 6-Day Dumbbell Program** (Mon–Fri + Sunday recovery). It features Keycloak-based authentication, equipment management, live set logging with calorie tracking, a dashboard with streaks and history, and dark/light theme support.

## Stack
| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Auth      | Keycloak 23 (OIDC + PKCE)              |
| Backend   | FastAPI + SQLAlchemy + PostgreSQL 15    |
| Frontend  | React 18 + Vite + React Router v6      |
| Container | Docker + Docker Compose                 |
| Proxy     | Nginx on port 80 (single public entry)  |

## Project Structure
```
IronDen/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry, CORS, router registration, seed on startup
│   │   ├── auth.py          # Keycloak JWT verification (JWKS)
│   │   ├── config.py        # pydantic Settings — reads from .env
│   │   ├── database.py      # SQLAlchemy engine + get_db dependency
│   │   ├── models.py        # ORM models: User, Equipment, WorkoutTemplate, Exercise, WorkoutSession, SetLog
│   │   ├── schemas.py       # Pydantic v2 schemas (all request/response types)
│   │   ├── seed.py          # Idempotent DB seeder (6 workout days)
│   │   └── routers/
│   │       ├── dashboard.py  # GET /dashboard/?period=
│   │       ├── equipment.py  # CRUD /equipment/
│   │       ├── profile.py    # GET/PATCH /profile/
│   │       ├── sessions.py   # Workout session + set logging (8 endpoints)
│   │       └── workouts.py   # GET /workouts/ and /workouts/{id}
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Routes; checks ready+authenticated before rendering Layout
│   │   ├── AuthContext.jsx   # Keycloak context; useAuth() → { ready, authenticated, keycloak }
│   │   ├── api.js            # fetch wrapper; auto-attaches Bearer token; api.get/post/patch/delete
│   │   ├── keycloak.js       # Keycloak SDK init
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Stats + recent sessions (deletable) + active session banner
│   │   │   ├── Equipment.jsx      # Equipment inventory (drives exercise availability)
│   │   │   ├── Profile.jsx        # User height/weight/username
│   │   │   ├── WorkoutDay.jsx     # Read-only plan browser; "Start Workout" → navigates to /session
│   │   │   └── ActiveSession.jsx  # Live session; logs sets via modal; rest timer; complete/cancel
│   │   ├── components/
│   │   │   └── Layout.jsx         # App shell, bottom nav, theme toggle (top-right ☀️/🌙)
│   │   └── styles/
│   │       └── global.css         # Single global stylesheet; CSS vars on :root + [data-theme="light"]
│   ├── Dockerfile
│   ├── vite.config.js
│   └── package.json
├── keycloak/
│   └── ironden-realm.json    # Realm import — client ironden-app, PKCE, redirect URIs
├── nginx/
│   └── nginx.conf            # resolver 127.0.0.11 + set $be/$fe pattern (DNS refresh)
├── docker-compose.yml
├── .env                      # Local secrets (never commit)
└── .env.example              # All required vars with safe defaults
```

## Key Conventions

See the per-layer instruction files for details:
- Backend: [.github/instructions/backend.instructions.md](.github/instructions/backend.instructions.md)
- Frontend: [.github/instructions/frontend.instructions.md](.github/instructions/frontend.instructions.md)
- Docker/Nginx: [.github/instructions/docker.instructions.md](.github/instructions/docker.instructions.md)

### Quick reference
- **Backend auth:** every endpoint requires `Depends(get_current_user)` — no exceptions
- **Frontend API:** use `api.get/post/patch/delete()` from `src/api.js` — never raw `fetch()`
- **Frontend auth:** `const { keycloak, authenticated, ready } = useAuth()` — token is `keycloak.token`
- **Styling:** single `global.css`; no CSS modules; theme via `data-theme` attribute on `<html>`
- **Calorie calc:** `MET × weight_kg × (active_seconds / 3600)`; strength sets use 45 s active time
- **Set logging:** only in ActiveSession page — WorkoutDay is a read-only plan browser

## Services & Ports
| Service   | URL / Access                              |
|-----------|-------------------------------------------|
| App (nginx)| http://localhost (port 80)              |
| Keycloak  | http://localhost:8080                     |
| Backend   | internal only — not exposed to host       |

## Running the App
```bash
# Start all services
docker compose up --build

# Rebuild a single service (e.g. after frontend changes)
docker compose up --build -d frontend

# Backend only (local dev, no Docker)
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend only (local dev, no Docker)
cd frontend && npm install && npm run dev
```

## Do Not
- Do not expose secrets in code — use environment variables from `.env`
- Do not bypass `get_current_user` dependency on protected routes
- Do not add Redux or additional state management libraries
- Do not use CSS modules — add styles to `global.css`
- Do not add set-logging UI to `WorkoutDay.jsx` — it belongs in `ActiveSession.jsx`
- Do not modify `keycloak/ironden-realm.json` client ID or redirect URIs without also updating `docker-compose.yml` and the running Keycloak instance
