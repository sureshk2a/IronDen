---
applyTo: "frontend/**"
---

# Frontend Instructions

## Framework & Patterns
- **React 18** with functional components and hooks only — no class components
- **Vite** as the build tool — env vars must be prefixed `VITE_` to be available at runtime
- **React Router v6** — use `<Routes>`, `<Route>`, `<Navigate>`; pages are in `src/pages/`, shared UI in `src/components/`

## Authentication
- Keycloak PKCE flow via `keycloak-js` SDK (initialized in `keycloak.js`)
- Auth state lives in `AuthContext.jsx`; always consume via:
  ```js
  const { ready, authenticated, keycloak } = useAuth()
  ```
- `keycloak.token` is the raw JWT; `keycloak.tokenParsed` has claims (`preferred_username`, `sub`, etc.)
- Never access the `keycloak` object directly inside pages — always go through `useAuth()`
- Route protection is handled in `App.jsx` (checks `ready` + `authenticated` before rendering `<Layout>`)

## API Calls
- All HTTP requests go through `src/api.js` — a thin `fetch` wrapper (not axios)
- Exports an `api` object: `api.get(path)`, `api.post(path, body)`, `api.patch(path, body)`, `api.delete(path)`
- Auto-attaches `Authorization: Bearer <token>` and refreshes the token if expiring within 30 s
- Returns parsed JSON; returns `null` for 204 responses; throws `Error` on non-2xx
- **Never** use `fetch()` directly — always use the `api` instance

## State Management
- Local state with `useState` / `useReducer`; shared state via React Context only
- No Redux, Zustand, or other state libraries
- Ephemeral UI state (selected workout day) is persisted to `sessionStorage`; user preferences (theme) to `localStorage`

## Styling
- **Single global stylesheet** — `src/styles/global.css`, imported in `main.jsx`
- No CSS modules — use class names from `global.css` directly
- Design tokens are CSS custom properties on `:root` (`--black`, `--lime`, `--ash`, etc.)
- **Dark/light theme** — `Layout.jsx` sets `document.documentElement.setAttribute('data-theme', theme)` (`'dark'` default); CSS overrides live under `[data-theme="light"]`; preference persisted in `localStorage`

## File Conventions
| Location              | Purpose                          |
|-----------------------|----------------------------------|
| `src/pages/`          | Full-page route components       |
| `src/components/`     | Reusable UI components           |
| `src/styles/global.css` | All styles + theme variables   |
| `src/api.js`          | Fetch wrapper (Bearer token)     |
| `src/AuthContext.jsx` | Auth context + provider          |
| `src/keycloak.js`     | Keycloak SDK initialization      |
| `src/components/Layout.jsx` | App shell, bottom nav, theme toggle |

## Page-Specific Notes
- **WorkoutDay** — read-only plan browser; no set logging here; set logging only happens in **ActiveSession**
- **ActiveSession** — live session; logs sets via `POST /sessions/{id}/sets`; has rest timer and calorie tracking
- **Dashboard** — fetches stats + active session in parallel on mount; supports session delete inline

## Adding a New Page
1. Create `src/pages/YourPage.jsx`
2. Add a `<Route>` in `App.jsx`
3. Add to `NAV_ITEMS` in `Layout.jsx` if it needs a bottom-nav entry
4. API calls via `src/api.js`
