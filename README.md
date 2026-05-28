# IronDen — Self-Hosted Workout Tracker

A self-hosted, full-stack workout tracker built around the **Lean & Mean 7-Day Dumbbell Program**. Track every set, log calories, visualise muscle activation, get AI-powered equipment swap suggestions, and own your data — no subscriptions, no cloud required.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Keycloak](https://img.shields.io/badge/Keycloak-23-4D4D4D?logo=keycloak&logoColor=white)](https://www.keycloak.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Ollama](https://img.shields.io/badge/Ollama-black?logo=ollama&logoColor=white)](https://ollama.com/)

---

## Screenshots

### All-time stats with muscle activation map
![All-time stats](docs/screenshots/dashboard-alltime.png)

### 7-day workout plan browser
![Workout plan](docs/screenshots/workout-plan.png)

### Exercise detail — sets, tips & progression
![Expanded exercise card](docs/screenshots/workout-expanded.png)

### Equipment management with AI search
![Equipment page](docs/screenshots/equipment.png)

### AI workout swap suggestions
![AI swap modal](docs/screenshots/equipment-ai-swap.png)

### Athlete profile
![Profile page](docs/screenshots/profile.png)

---

## Features

| Feature | Details |
|---|---|
| **7-day program** | Push · Pull · Legs + Core · Upper Full · HIIT + Core · Arms + Core · Active Recovery |
| **Live session logging** | Log sets (reps + weight or duration) inside an active session with a running elapsed timer |
| **Calorie tracking** | MET-based calorie burn per set; cumulative totals per session and all-time |
| **Muscle activation map** | SVG anatomy diagram highlights which muscle groups you've trained in the selected period |
| **Equipment management** | Add / remove gym gear; exercises requiring missing equipment are automatically greyed out |
| **AI equipment suggestions** | Typing a piece of equipment shows instant suggestions from a built-in catalogue of 30+ items |
| **AI workout swaps** | Adding new equipment triggers an on-device AI analysis (Ollama) that recommends which exercises to swap in across your workout days |
| **Workout streak** | Consecutive training days tracked and shown on the dashboard |
| **Session history** | Browse and delete past sessions; filter by Today / Week / Month / All Time |
| **Dark & light theme** | One-click toggle; preference saved in `localStorage` |
| **Self-hosted auth** | Keycloak 23 — OIDC + PKCE; no client secret in the browser; add social login via Keycloak |
| **Single-command deploy** | One `docker compose up --build` starts everything |

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/IronDen.git
cd IronDen

# 2. Copy the example env file
cp .env.example .env
# Edit .env if you want to change passwords or ports

# 3. Build and start all services
docker compose up --build

# 4. Open the app  (nginx serves on port 80)
open http://localhost

# 5. Keycloak admin console — create your user here
open http://localhost:8080/admin   # admin / admin  (change this!)
```

Everything runs in Docker — no local Python, Node, or PostgreSQL needed.

---

## Services

| Service | URL | Notes |
|---|---|---|
| App (nginx) | http://localhost | Single public entry point |
| Keycloak | http://localhost:8080 | Auth server + admin console |
| Backend API | internal only | Not exposed to the host |
| PostgreSQL | internal only | Not exposed to the host |

---

## Stack

| Layer | Technology |
|---|---|
| Auth | Keycloak 23 (OIDC + PKCE) |
| Backend | FastAPI + SQLAlchemy + PostgreSQL 15 |
| Frontend | React 18 + Vite + React Router v6 |
| AI | Ollama (`qwen2.5-coder:7b`) — runs on-device, no cloud |
| Container | Docker + Docker Compose |
| Proxy | Nginx on port 80 |

---

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

```env
# PostgreSQL
POSTGRES_USER=ironden
POSTGRES_PASSWORD=ironden_pass
POSTGRES_DB=ironden

# Keycloak admin credentials  (change before any public deployment)
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# Keycloak realm / client
KEYCLOAK_REALM=ironden
KEYCLOAK_CLIENT_ID=ironden-app

# Frontend build vars (update to your server IP or domain)
VITE_API_URL=http://localhost/api
VITE_KEYCLOAK_URL=http://localhost:8080

# Backend CORS (comma-separated list of allowed origins)
CORS_ORIGINS=http://localhost,http://localhost:3000

# Ollama — on-device AI for workout swap recommendations
OLLAMA_URL=http://192.168.1.x:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

### Ollama (optional — required for AI workout swap suggestions)

Install [Ollama](https://ollama.com) on your host machine and pull the model:

```bash
ollama pull qwen2.5-coder:7b
```

If Ollama is running on the same machine as Docker, bind it to all interfaces so the containers can reach it:

```bash
# Create a systemd override (Linux)
sudo mkdir -p /etc/systemd/system/ollama.service.d
printf '[Service]\nEnvironment="OLLAMA_HOST=0.0.0.0:11434"\n' \
  | sudo tee /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

Then set `OLLAMA_URL` in `.env` to your machine's LAN IP (not `localhost`, which doesn't resolve correctly from inside Docker):

```env
OLLAMA_URL=http://192.168.1.x:11434
```

AI features degrade gracefully if Ollama is unavailable — the rest of the app works normally.

### Accessing from another device on your LAN

Replace `localhost` with your machine's LAN IP in `.env`:

```env
VITE_API_URL=http://192.168.1.x/api
VITE_KEYCLOAK_URL=http://192.168.1.x:8080
CORS_ORIGINS=http://192.168.1.x,http://localhost
```

Then rebuild the frontend:

```bash
docker compose up --build -d frontend
```

You also need to add your IP to Keycloak's allowed redirect URIs via the admin console:  
**Clients → ironden-app → Settings → Valid redirect URIs** — add `http://192.168.1.x/*`.

---

## Calorie Calculation

Uses MET (Metabolic Equivalent of Task) values per exercise type:

| Exercise Type | MET |
|---|---|
| Heavy compound | 6.0 |
| Moderate compound | 5.0 |
| Isolation | 3.5 |
| Core / bodyweight | 4.0 |
| HIIT sprint | 12.0 |
| Cardio (treadmill) | 3.5–5.0 |

**Formula:** `Calories = MET × weight_kg × active_hours`  
Per strength set: 45 seconds of active work → `active_hours = 0.0125`

---

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://ironden:ironden_pass@localhost:5432/ironden
export KEYCLOAK_URL=http://localhost:8080
export KEYCLOAK_REALM=ironden
export CORS_ORIGINS=http://localhost:3000

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

---

## Production Notes

- Change `KEYCLOAK_ADMIN_PASSWORD` before any public deployment
- Add `KC_HOSTNAME` to the Keycloak service env for your public domain
- Update `CORS_ORIGINS` and the Keycloak redirect URIs to match your domain
- Place a TLS-terminating reverse proxy (Caddy, Traefik, Nginx) in front of port 80
- The backend is never exposed directly — all traffic goes through nginx

---

## License

MIT
