import { NextRequest, NextResponse } from "next/server";

/**
 * Dedicated backend for the public, unauthenticated `/simulator` page.
 *
 * Deliberately NOT part of `/api/proxy/[...path]` — that route sets real
 * session cookies in the visitor's browser (see buildSessionResponse there),
 * which would hand an anonymous visitor a working session for the *entire*
 * app, not just this one endpoint. Here the service credential never leaves
 * this server: we log in ourselves, cache the token in memory, and forward
 * just the one call. The browser holds nothing — no cookie, no token — so
 * there is no session to reuse against any other endpoint, dashboard route,
 * or devtools fetch.
 *
 * Configure via env vars (server-only — do NOT prefix with NEXT_PUBLIC_):
 *   SIMULATOR_ADMIN_EMAIL
 *   SIMULATOR_ADMIN_PASSWORD
 * plus the existing BACKEND_URL.
 */

const BACKEND_URL = process.env.BACKEND_URL;
const DEMO_EMAIL = process.env.SIMULATOR_ADMIN_EMAIL;
const DEMO_PASSWORD = process.env.SIMULATOR_ADMIN_PASSWORD;

// Access tokens are short-lived server-side (30 min); refresh a bit early.
const TOKEN_TTL_MS = 25 * 60 * 1000;
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getServiceToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  if (!BACKEND_URL || !DEMO_EMAIL || !DEMO_PASSWORD) return null;

  const form = new URLSearchParams();
  form.set("username", DEMO_EMAIL);
  form.set("password", DEMO_PASSWORD);

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) return null;
    cachedToken = { token: data.access_token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return cachedToken.token;
  } catch {
    return null;
  }
}

// Best-effort per-IP rate limit. In-memory, per server instance — not
// distributed, resets on cold start. That's fine here: it's a courtesy
// throttle against a runaway script, not the security boundary (the service
// account's own permission scope is).
const RATE_LIMIT = 20; // requests
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ detail: "Too many requests — try again in a minute." }, { status: 429 });
  }

  if (!BACKEND_URL) {
    return NextResponse.json({ detail: "Server misconfiguration: BACKEND_URL not set" }, { status: 503 });
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  const token = await getServiceToken();
  if (!token) {
    return NextResponse.json({ detail: "Simulator is temporarily unavailable" }, { status: 503 });
  }

  const call = (accessToken: string) =>
    fetch(`${BACKEND_URL}/api/v1/simulations/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: bodyText,
      signal: AbortSignal.timeout(30000),
    });

  let upstream: Response;
  try {
    upstream = await call(token);
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }

  // Cached token might have gone stale server-side (e.g. rotated/revoked) —
  // one forced-refresh retry before giving up.
  if (upstream.status === 401) {
    const fresh = await getServiceToken(true);
    if (fresh) {
      try {
        upstream = await call(fresh);
      } catch {
        return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
      }
    }
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const dynamic = "force-dynamic";
