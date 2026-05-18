# Transaction Monitor Dashboard

A Next.js 14 console for the [Autheo Transaction Monitoring System](../transaction-monitor) — an AML/CFT backend for mobile money fraud detection.

> **Status:** scaffolded from `deferred-kyc-dashboard` and adapted to the TMS JWT-bearer auth model. Phase 0 of the implementation plan. Full README arrives at Phase 10.

## Tech stack

- Next.js 14 (App Router) + React 18 + TypeScript 5
- Tailwind CSS 3 (dark mode via `class`)
- Redux Toolkit + RTK Query + redux-persist
- Heroicons + ApexCharts
- Vitest + Playwright

## Quick start (local dev)

```bash
# 1. Bring up the TMS backend (in a separate repo)
cd ../transaction-monitor
docker compose --env-file .env -f docker/docker-compose.yml up -d
docker exec tm-app python scripts/seed_auth.py --email admin@autheo.test --password Passw0rd!

# 2. Run the dashboard
cd ../transaction-monitor-dashboard
npm install
BACKEND_URL=http://localhost:8088 npm run dev
```

Open <http://localhost:3000/login> and sign in with the seeded credentials.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `BACKEND_URL` | _none — required_ | TMS backend origin (nginx on `8088` or direct API on `8021`). Used by the BFF proxy server-side. |
| `NODE_ENV` | `development` | Enables HSTS and strict CSP in production. |

## Scripts

```bash
npm run dev            # Next.js dev server
npm run build          # production build
npm run start          # production server
npm run lint           # ESLint
npm run test           # Vitest unit tests
npm run test:coverage  # Vitest with coverage
npm run test:e2e       # Playwright end-to-end
```

## Architecture

- **BFF proxy:** `src/app/api/proxy/[...path]/route.ts` forwards every browser-bound API call to `BACKEND_URL`, injecting `Authorization: Bearer` from an httpOnly cookie and validating a CSRF double-submit token on mutations.
- **Auth state:** Redux holds `userId`, `email`, `fullName`, `roles[]`, `csrfToken`, `jurisdictionCode`. Access + refresh tokens live in httpOnly cookies; the proxy refreshes transparently on 401.
- **RTK Query:** one slice per resource (alerts, cases, rules, ...). Tag-based cache invalidation.
- **Role-gated navigation:** `Sidebar` filters routes against the user's roles using a `ROLE_NAV_MAP`. Backend still enforces 403 on writes.

See `/Users/joseph/.claude/plans/alright-i-want-you-virtual-shannon.md` for the full implementation plan.
