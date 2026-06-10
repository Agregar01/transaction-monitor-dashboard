/**
 * Pure helpers used by the BFF proxy route. Kept in a separate file so they
 * are easy to unit-test without spinning up Next.js's request lifecycle.
 */

export const ACCESS_COOKIE = "__access";
export const REFRESH_COOKIE = "__refresh";
export const USER_COOKIE = "__user";
export const CSRF_COOKIE = "__csrf";
export const SESSION_MARKER = "__sid";

/**
 * SSRF allowlist. Only paths starting with one of these prefixes may be
 * proxied through `/api/proxy/[...path]`. Keep this list aligned with the RTK
 * Query slices in `src/redux/slices/api/`.
 *
 * The three ML prefixes (`/models/`, `/drift/`, `/labeled/`) are listed so the
 * sidebar links work the day the backend lands those routers; the dashboard
 * gates the entry points behind `NEXT_PUBLIC_ENABLE_ML_OPS`.
 */
export const ALLOWED_PREFIXES = [
  "/api/v1/auth/",
  "/api/v1/transactions/",
  "/api/v1/alerts/",
  "/api/v1/cases/",
  "/api/v1/rules/",
  "/api/v1/customers/",
  "/api/v1/sanctions/",
  "/api/v1/watchlists/",
  "/api/v1/str-reports/",
  "/api/v1/ctr-reports/",
  "/api/v1/approvals/",
  "/api/v1/jurisdictions/",
  "/api/v1/audit/",
  "/api/v1/analytics/",
  "/api/v1/shadow/",
  "/api/v1/tenant/",
  "/api/v1/health/",
  "/api/v1/metrics/",
  "/api/v1/models/",
  "/api/v1/drift/",
  "/api/v1/attachments/",
  "/api/v1/privacy/",
  "/api/v1/export/",
  // Multi-tenant + regulator (Phases 3–6). Institution onboarding, team
  // management, institution-scoped API keys, and the regulator filings store.
  "/api/v1/institutions/",
  "/api/v1/users/",
  "/api/v1/api-keys/",
  "/api/v1/filings/",
] as const;

export const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Public, session-less flows: protected by passwords or one-time email tokens,
// not by a session cookie — so there is no CSRF cookie to double-submit.
// `/institutions/signup` also covers `/institutions/signup/resend-verification`.
const CSRF_EXEMPT_SUBSTRINGS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/accept-invite",
  "/institutions/signup",
  "/institutions/verify-email",
];

export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const ACCESS_MAX_AGE = 60 * 30; // 30 minutes

/** SSRF guard — only TMS endpoint prefixes may be proxied. */
export function isAllowedPath(path: string): boolean {
  const candidate = path.endsWith("/") ? path : path + "/";
  return ALLOWED_PREFIXES.some((prefix) => candidate.startsWith(prefix));
}

/** Auth-flow paths skip the double-submit CSRF check. */
export function isCsrfExempt(path: string): boolean {
  return CSRF_EXEMPT_SUBSTRINGS.some((s) => path.includes(s));
}

/** True when the request method requires a CSRF token (and the path isn't exempt). */
export function requiresCsrf(method: string, path: string): boolean {
  return CSRF_METHODS.has(method) && !isCsrfExempt(path);
}

/** Strip the `/api/proxy` mount, collapse duplicate slashes, trim trailing slash. */
export function normalizeProxyPath(rawPath: string): string {
  const collapsed = rawPath.replace("/api/proxy", "").replace(/\/+/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1);
  }
  return collapsed;
}
