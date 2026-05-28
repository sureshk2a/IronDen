---
applyTo: "{docker-compose.yml,**/Dockerfile,nginx/**}"
---

# Docker & Infrastructure Instructions

## Services (docker-compose.yml)
| Service      | Container name          | Port(s)             | Notes |
|--------------|-------------------------|---------------------|-------|
| `app-db`     | `ironden-app-db`        | internal 5432       | PostgreSQL 15 |
| `backend`    | `ironden-backend`       | `expose: 8000` only | FastAPI; no host port binding |
| `frontend`   | `ironden-frontend`      | `expose: 80` only   | Nginx-served React build |
| `keycloak`   | `ironden-keycloak`      | `8080:8080`         | Imports realm on first boot |
| `nginx`      | `ironden-nginx`         | `80:80`             | Reverse proxy; only public entry point |
| `keycloak-db`| `ironden-keycloak-db`   | internal 5432       | Postgres for Keycloak |

## Environment Variables
- Secrets live in `.env` (never commit); see `.env.example` for all required vars
- Frontend vars must be prefixed `VITE_` and passed as Docker build args in `docker-compose.yml`
- `CORS_ORIGINS` — comma-separated; must include all origins that the browser hits (including `192.168.x.x` for LAN access)

## Nginx Routing & DNS
- `/api/` → strip prefix → proxy to `backend:8000`
- `/` → proxy to `frontend:80` (React SPA; returns `index.html` for all paths)
- **DNS stale-IP fix:** always declare `resolver 127.0.0.11 valid=10s ipv6=off` and use `set $be`/`set $fe` variables *before* any `rewrite` directive — this forces per-request DNS re-resolution inside Docker
  ```nginx
  set $be http://backend:8000;
  rewrite ^/api/(.*) /$1 break;  # set $be must come BEFORE rewrite
  proxy_pass $be;
  ```

## Keycloak
- Realm config imported from `keycloak/ironden-realm.json` on first boot only
- Client ID: `ironden-app` (public client, PKCE S256)
- To add a new redirect URI, update **both** `ironden-realm.json` (for fresh installs) **and** the running Keycloak via admin console or REST API
- Admin console: `http://localhost:8080/admin` — credentials in `.env` (`KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`)

## Common Commands
```bash
# Rebuild and start a single service
docker compose up --build -d frontend

# View live logs
docker compose logs -f backend

# Stop everything (keeps volumes)
docker compose down

# Full reset — deletes DB data and Keycloak state
docker compose down -v
```
