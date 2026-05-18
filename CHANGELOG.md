# Changelog

All notable changes to the transaction-monitor-dashboard. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-05-18

Initial fork of `deferred-kyc-dashboard`, rewired end-to-end for the Autheo
Transaction Monitoring System.

### Added

- **BFF proxy with JWT bearer auth.** `src/app/api/proxy/[...path]/route.ts`
  converts browser JSON to OAuth2 form-urlencoded for `/auth/login`, issues
  five cookies (`__access`, `__refresh`, `__user`, `__csrf`, `__sid`),
  validates a double-submit CSRF token on mutations, and transparently
  refreshes the access token on 401.
- **17 RTK Query slices** covering every TMS endpoint group: auth, tenant,
  transactions, customers, alerts, cases, rules, sanctions, watchlists, STR,
  CTR, approvals, jurisdictions, audit, shadow, health, ML registry.
- **Analyst workbench:** overview (KPI cards + 14-day alert chart), alerts
  triage with assign/note/resolve, cases with state-machine transitions,
  transactions + timeline, customers + baseline.
- **Compliance officer:** STR draft → file (four-eyes) → goAML XML download,
  CTR list with exemption modal, four-eyes approvals queue with countdown,
  watchlists with add/remove/reload, sanctions screening.
- **Rule & ML ops:** status-tabbed rules list, rule detail with DSL
  visualization + JSON view + promote/archive, shadow stats with agreement/
  equivalence + per-rule delta, ML registry and drift (graceful 404 fallback
  while the backend endpoints land).
- **Admin & audit:** read-only users with roles modal, jurisdictions editor
  (four-eyes), audit trail with expandable JSON diff, system health with
  live subsystem pills.
- **Role-gated navigation** via `ROLE_NAV_MAP` against the 8 TMS roles.
- **Vitest unit tests** (51 across 4 files): proxy policy (CSRF / SSRF /
  normalization), RiskBadge 0-300 boundaries, sidebar role filter, status
  badge variants.
- **Playwright specs** (2): login flow + analyst triage golden path. Both
  auto-skip when `BACKEND_URL` isn't set so CI without TMS stays green.
- **Dockerfile** (multi-stage) + standalone `docker-compose.yml` pointing at
  the running TMS stack.
- **`scripts/verify-auth.sh`** — curl-driven manual smoke test of the BFF
  auth flow.

### Changed

- Replaced the deferred-kyc auth model (session-cookie + `X-Session-ID`)
  with TMS's JWT bearer + 7-day rotating refresh tokens.
- Replaced KYC concepts (Tier, Workflow, Policy, Decision) with AML
  concepts (Alert, Case, Rule, STR, CTR, Approval).
- Replaced the broad 7-role KYC RBAC with the 8-role TMS RBAC
  (SYSTEM_ADMIN / COMPLIANCE_OFFICER / SENIOR_ANALYST / ANALYST / AUDITOR /
  ML_ENGINEER / OPERATIONS / READONLY).
- Risk score scale switched from KYC's qualitative LOW/HIGH to TMS's
  0–300 combined band (ALLOW / FLAG / HOLD / BLOCK).

### Removed

- All 25 KYC dashboard subpages (tiers, workflows, policies, signup-requests,
  vendor-config, regulator, supervisor, onboarding, etc.).
- 15 KYC API slices (decisions, policies, workflows, webhooks, clients,
  vendor-config, signup-requests, …).
- Auth-flow pages out of v1 scope (signup, forgot-password, reset-password,
  accept-invite).
- AdminGuard / ClientGuard / RegulatorGuard / TierBadge / UsageChart /
  RegisterCustomerModal / StepTypeSelector / useDecisionNotifications.

### Backend gaps logged

12 issues observed in the TMS backend during this work, captured in
`../transaction-monitor/docs/OPEN_ISSUES.md`. The dashboard ships with
graceful fallbacks where the corresponding endpoint is missing (ML registry,
drift, time-series metrics) so the affected pages can land before the
backend catches up.
