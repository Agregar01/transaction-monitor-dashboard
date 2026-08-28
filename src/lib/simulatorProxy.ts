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

type TokenResult = { token: string } | { error: string };

/** Returns a service token, or a precise (secret-free) reason it couldn't get
 * one — env-var name(s) missing, or the login HTTP status — so a 503 can say
 * exactly what to fix instead of a vague "unavailable". */
async function getServiceToken(forceRefresh = false): Promise<TokenResult> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return { token: cachedToken.token };
  }
  const missing: string[] = [];
  if (!BACKEND_URL) missing.push("BACKEND_URL");
  if (!DEMO_EMAIL) missing.push("SIMULATOR_ADMIN_EMAIL");
  if (!DEMO_PASSWORD) missing.push("SIMULATOR_ADMIN_PASSWORD");
  if (missing.length) return { error: `not configured — missing env var(s): ${missing.join(", ")}` };

  const form = new URLSearchParams();
  form.set("username", DEMO_EMAIL as string);
  form.set("password", DEMO_PASSWORD as string);
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { error: `service login rejected (HTTP ${res.status}) — check SIMULATOR_ADMIN_EMAIL/PASSWORD values` };
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) return { error: "service login returned no access_token" };
    cachedToken = { token: data.access_token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return { token: data.access_token };
  } catch {
    return { error: "service login request failed (backend unreachable from Netlify)" };
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

  const tok = await getServiceToken();
  if ("error" in tok) return json(`Simulator ${tok.error}`, 503);

  const call = (accessToken: string) =>
    fetch(`${BACKEND_URL}/api/v1${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      ...(method === "POST" && bodyText != null ? { body: bodyText } : {}),
      signal: AbortSignal.timeout(90000),
    });

  let upstream: Response;
  try {
    upstream = await call(tok.token);
  } catch {
    return json("Backend unreachable", 502);
  }
  if (upstream.status === 401) {
    const fresh = await getServiceToken(true);
    if ("token" in fresh) {
      try {
        upstream = await call(fresh.token);
      } catch {
        return json("Backend unreachable", 502);
      }
    }
  }
  const text = await upstream.text();
  return { status: upstream.status, text };
}
