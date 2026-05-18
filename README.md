# Transaction Monitor Dashboard

A Next.js 14 analyst console for the [Autheo Transaction Monitoring System](../transaction-monitor) — an AML/CFT backend for mobile money fraud detection in Ghana, Nigeria, and Kenya.

The dashboard covers four operator surfaces:

| Surface | Pages |
| --- | --- |
| **Analyst workbench** | Overview, Alerts, Cases, Transactions, Customers |
| **Compliance officer** | STR Reports, CTR Reports, Approvals queue, Watchlists, Sanctions screening |
| **Rule & ML ops** | Rules (DRAFT/SHADOW/PRODUCTION), Shadow stats, ML model registry, Drift monitoring |
| **Admin & audit** | Users & Roles, Jurisdictions, Audit Trail, System Health, Settings |

## Tech stack

- Next.js 14.2 (App Router) + React 18 + TypeScript 5
- Tailwind CSS 3 (dark mode via `class`)
- Redux Toolkit 2.11 + RTK Query + redux-persist
- Heroicons + ApexCharts
- Vitest (unit) + Playwright (E2E)

## Architecture (one minute)

```
Browser  ──fetch──▶  /api/proxy/api/v1/<endpoint>     (Next.js BFF)
                          │
                          ├─ validates X-CSRF-Token == __csrf cookie
                          ├─ injects Authorization: Bearer <__access>
                          ├─ on 401 → POST /auth/refresh, rotate, retry once
                          ▼
                    BACKEND_URL/api/v1/<endpoint>       (TMS FastAPI)
```

Five cookies are set on login:

| Cookie | httpOnly | Lifetime | Purpose |
| --- | --- | --- | --- |
| `__access` | yes | 30 min | TMS access JWT |
| `__refresh` | yes | 7 days | TMS refresh JWT |
| `__user` | yes | 7 days | Identity payload from `/auth/me` |
| `__csrf` | **no** | 7 days | Double-submit token (mirrored to Redux state) |
| `__sid` | yes | 7 days | Session marker for middleware route guards |

The dashboard never stores tokens in JavaScript-accessible storage. Role-gated navigation is convenience only — every mutating endpoint is enforced server-side via the TMS 40-permission RBAC.

## Quick start

```bash
# 1. Bring up the TMS backend (sibling repo)
cd ../transaction-monitor
bash scripts/generate-secrets.sh    # paste output into a fresh .env
docker compose --env-file .env -f docker/docker-compose.yml up -d
docker exec tm-app alembic upgrade head
docker exec tm-app python scripts/seed_auth.py \
  --email admin@autheo.test --password 'Passw0rd!'

# 2. Run the dashboard
cd ../transaction-monitor-dashboard
npm install
BACKEND_URL=http://localhost:8088 npm run dev
```

Open <http://localhost:3000/login> and sign in with the seeded credentials.

### Quick smoke-test of the auth flow

After the dashboard is running:

```bash
bash scripts/verify-auth.sh admin@autheo.test 'Passw0rd!' http://localhost:3000
```

The script confirms login → 5 cookies → `/auth/me` → SSRF block → CSRF block → CSRF pass.

## Environment variables

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `BACKEND_URL` | — | **yes** | TMS backend origin (nginx on `8088`, direct API on `8021`). Server-side only. |
| `NODE_ENV` | `development` | no | Enables HSTS and strict CSP in production. |
| `E2E_EMAIL` / `E2E_PASSWORD` | — | no | Credentials for the Playwright login spec. When unset, live E2E specs auto-skip. |

A complete copy is in `.env.example`.

## Scripts

```bash
npm run dev            # Next.js dev server with hot-reload
npm run build          # Production build (used by Docker image)
npm run start          # Production server
npm run lint           # ESLint
npm run test           # Vitest unit tests (proxy policy, RiskBadge, sidebar filter, status badges)
npm run test:coverage  # Vitest with v8 coverage
npm run test:e2e       # Playwright golden-path (auto-skips without BACKEND_URL)
```

## Running with Docker

```bash
# Build the image and run alongside the TMS stack
docker compose up --build
```

The Compose file expects to reach the TMS nginx at `http://host.docker.internal:8088`. To run inside the existing TMS Docker network instead, uncomment the `networks:` block at the bottom of `docker-compose.yml` and re-point `BACKEND_URL=http://tm-nginx:80`.

## Routes

```
/                        →  redirects based on auth
/login                   →  email + password (BFF converts JSON → form-urlencoded)
/dashboard               →  overview (KPI cards + 14-day alert chart + recent feed)
/dashboard/alerts        →  list  /  /dashboard/alerts/[alert_id]
/dashboard/cases         →  list  /  /dashboard/cases/new  /  /dashboard/cases/[id]
/dashboard/transactions  →  list  /  /dashboard/transactions/[id]
/dashboard/customers     →  list  /  /dashboard/customers/[id]
/dashboard/str           →  list  /  /dashboard/str/new?case_id=…  /  /dashboard/str/[id]
/dashboard/ctr           →  list with exemption modal
/dashboard/approvals     →  four-eyes queue (15s polling)
/dashboard/watchlists    →  per-list CRUD (four-eyes)
/dashboard/sanctions     →  screen-one form (CLEAR / REVIEW / MATCH)
/dashboard/rules         →  list with status tabs  /  /dashboard/rules/[rule_id]
/dashboard/shadow        →  agreement / equivalence stats + per-rule deltas
/dashboard/models        →  ML registry (404-tolerant; see Open Issues)
/dashboard/drift         →  per-feature drift table (404-tolerant)
/dashboard/users         →  read-only directory
/dashboard/jurisdictions →  threshold editor (four-eyes)
/dashboard/audit         →  filterable trail with expandable diffs
/dashboard/health        →  subsystem pills (15s polling)
/dashboard/settings      →  profile + dark-mode toggle
```

## Implementation plan

The full multi-phase plan lives at `/Users/joseph/.claude/plans/alright-i-want-you-virtual-shannon.md`. Backend gaps spotted along the way are logged in `../transaction-monitor/docs/OPEN_ISSUES.md`.
