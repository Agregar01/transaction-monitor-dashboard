#!/bin/bash
# Manual verification of the BFF auth flow against a running TMS backend.
#
# Prerequisites:
#   1. TMS backend running:
#        cd ../transaction-monitor
#        bash scripts/generate-secrets.sh > /tmp/tm-secrets.env  # paste into .env
#        cp .env.example .env  # then merge generated secrets
#        docker compose --env-file .env -f docker/docker-compose.yml up -d
#        docker exec tm-app alembic upgrade head
#        docker exec tm-app python scripts/seed_auth.py \
#          --email admin@autheo.test --password 'Passw0rd!'
#
#   2. This dashboard running:
#        BACKEND_URL=http://localhost:8088 npm run dev
#
# What this script checks:
#   1. POST /api/proxy/api/v1/auth/login returns user_id, email, roles,
#      csrf_token, jurisdiction_code AND sets the five auth cookies.
#   2. GET /api/proxy/api/v1/auth/me with the cookies succeeds.
#   3. A non-whitelisted prefix is rejected with 403.
#   4. A mutation without X-CSRF-Token is rejected with 403.
#
# Usage:
#   bash scripts/verify-auth.sh [EMAIL] [PASSWORD] [DASHBOARD_URL]
#   bash scripts/verify-auth.sh admin@autheo.test 'Passw0rd!' http://localhost:3000

set -u

EMAIL="${1:-admin@autheo.test}"
PASSWORD="${2:-Passw0rd!}"
BASE="${3:-http://localhost:3000}"
COOKIES=$(mktemp -t verify-auth-XXXXXX.cookies)
trap "rm -f $COOKIES" EXIT

ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "\033[31m✗\033[0m %s\n" "$1"; exit 1; }

echo "── Step 1: login ─────────────────────────────────────────"
LOGIN_BODY=$(curl -sS -c "$COOKIES" -b "$COOKIES" \
  -X POST "$BASE/api/proxy/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_BODY" | grep -q '"user_id"' || fail "login response missing user_id (body: $LOGIN_BODY)"
echo "$LOGIN_BODY" | grep -q '"csrf_token"' || fail "login response missing csrf_token"
echo "$LOGIN_BODY" | grep -q '"jurisdiction_code"' || fail "login response missing jurisdiction_code"
echo "$LOGIN_BODY" | grep -q '"access_token"' && fail "login response leaked access_token (should be stripped)"

grep -q "__access" "$COOKIES" || fail "missing __access cookie"
grep -q "__refresh" "$COOKIES" || fail "missing __refresh cookie"
grep -q "__user" "$COOKIES" || fail "missing __user cookie"
grep -q "__csrf" "$COOKIES" || fail "missing __csrf cookie"
grep -q "__sid" "$COOKIES" || fail "missing __sid cookie"
ok "login set all 5 cookies + returned identity"

echo ""
echo "── Step 2: authenticated GET /auth/me ───────────────────"
ME=$(curl -sS -b "$COOKIES" "$BASE/api/proxy/api/v1/auth/me")
echo "$ME" | grep -q '"email"' || fail "/auth/me failed (body: $ME)"
ok "/auth/me returned user identity"

echo ""
echo "── Step 3: SSRF — non-whitelisted prefix → 403 ──────────"
STATUS=$(curl -sS -b "$COOKIES" -o /dev/null -w "%{http_code}" \
  "$BASE/api/proxy/api/v1/admin-only-secret")
[ "$STATUS" = "403" ] || fail "expected 403, got $STATUS"
ok "non-whitelisted path correctly blocked"

echo ""
echo "── Step 4: CSRF — mutation without token → 403 ──────────"
STATUS=$(curl -sS -b "$COOKIES" -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE/api/proxy/api/v1/alerts/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{}')
[ "$STATUS" = "403" ] || fail "expected 403 (missing CSRF), got $STATUS"
ok "mutation without CSRF token correctly blocked"

echo ""
echo "── Step 5: CSRF — mutation with token → not-403 ─────────"
CSRF=$(awk '/__csrf/ {print $7}' "$COOKIES" | tail -1)
STATUS=$(curl -sS -b "$COOKIES" -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE/api/proxy/api/v1/alerts/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{}')
# Expect 404 or 400 from the backend (the alert doesn't exist) — anything BUT 403 proves CSRF passed.
[ "$STATUS" != "403" ] || fail "CSRF should have passed but proxy returned 403 (csrf=$CSRF)"
ok "mutation with CSRF token reached backend (status $STATUS)"

echo ""
ok "all checks passed"
