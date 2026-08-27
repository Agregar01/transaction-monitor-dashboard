/**
 * Server-only module: imported exclusively by `/api/public-simulator*` route
 * handlers, so its service credential and token cache never reach the client.
 *
 * Shared backend for the public, unauthenticated `/simulator` page routes
 * (`/api/public-simulator*`). The service credential never leaves the server:
 * we log in ourselves, cache the token in memory, and forward one call to an
 * ALLOW-LISTED simulation endpoint. The browser holds nothing — no cookie, no
 * token — so there is no session to reuse against any other endpoint.
 *
 * Configure via server-only env vars (do NOT prefix with NEXT_PUBLIC_):
 *   SIMULATOR_ADMIN_EMAIL, SIMULATOR_ADMIN_PASSWORD, BACKEND_URL
 */

const BACKEND_URL = process.env.BACKEND_URL;
const DEMO_EMAIL = process.env.SIMULATOR_ADMIN_EMAIL;
const DEMO_PASSWORD = process.env.SIMULATOR_ADMIN_PASSWORD;

// Only these backend paths are reachable through the public proxy. The service
// token is scoped to simulate_transaction, but allow-listing keeps it from
// being pointed anywhere else even if a caller crafts a different path.
const ALLOWED_PATHS = new Set([
  "/simulations/transactions",
  "/simulations/scenarios",
  "/simulations/templates",
]);

const TOKEN_TTL_MS = 25 * 60 * 1000; // access tokens live 30 min server-side; refresh early
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

// Best-effort per-IP throttle (in-memory, per instance — a courtesy limit
// against a runaway script, not the security boundary).
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; windowStart: number }>();

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export interface ForwardResult {
  status: number;
  text: string;
}

function json(detail: string, status: number): ForwardResult {
  return { status, text: JSON.stringify({ detail }) };
}

/** Forward one call to an allow-listed simulation endpoint using the cached
 * service token (with one forced-refresh retry on a 401). Scenarios can run
 * many legs, so the upstream timeout is generous. */
export async function forwardToSim(
  path: string,
  method: "GET" | "POST",
  bodyText: string | null,
): Promise<ForwardResult> {
  if (!ALLOWED_PATHS.has(path)) return json("Unknown endpoint", 404);
  if (!BACKEND_URL) return json("Server misconfiguration: BACKEND_URL not set", 503);

  const token = await getServiceToken();
  if (!token) return json("Simulator is temporarily unavailable", 503);

  const call = (accessToken: string) =>
    fetch(`${BACKEND_URL}/api/v1${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      ...(method === "POST" && bodyText != null ? { body: bodyText } : {}),
      signal: AbortSignal.timeout(90000),
    });

  let upstream: Response;
  try {
    upstream = await call(token);
  } catch {
    return json("Backend unreachable", 502);
  }
  if (upstream.status === 401) {
    const fresh = await getServiceToken(true);
    if (fresh) {
      try {
        upstream = await call(fresh);
      } catch {
        return json("Backend unreachable", 502);
      }
    }
  }
  const text = await upstream.text();
  return { status: upstream.status, text };
}
