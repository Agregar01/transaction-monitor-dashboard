import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
  console.error("FATAL: BACKEND_URL environment variable is not set");
}

const USER_COOKIE_NAME = "__user";
const SESSION_ID_COOKIE = "__sid";
const CSRF_COOKIE = "__csrf";

// Whitelist of allowed backend API path prefixes
const ALLOWED_PREFIXES = [
  "/api/v1/auth/",
  "/api/v1/clients/",
  "/api/v1/customers/",
  "/api/v1/decisions/",
  "/api/v1/policies/",
  "/api/v1/tiers/",
  "/api/v1/webhooks/",
  "/api/v1/usage/",
  "/api/v1/notifications/",
  "/api/v1/documents/",
  "/api/v1/signup-requests/",
  "/api/v1/health/",
  "/api/v1/users/",
  "/api/v1/mfa/",
  "/api/v1/audit-logs/",
  "/api/v1/audit-trail/",
  "/api/v1/compliance/",
  "/api/v1/gdpr/",
  "/api/v1/case-notes/",
  "/api/v1/cases/",
  "/api/v1/workflows/",
  "/api/v1/vendor-config/",
];

// Mutation methods that require CSRF validation
const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function proxyRequest(req: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { detail: "Server misconfiguration: BACKEND_URL not set" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  // Normalize: remove proxy prefix and collapse double slashes
  let path = url.pathname.replace("/api/proxy", "").replace(/\/+/g, "/");

  // Block requests to non-whitelisted paths (SSRF protection)
  const pathToCheck = path.endsWith("/") ? path : path + "/";
  const allowed = ALLOWED_PREFIXES.some((prefix) => pathToCheck.startsWith(prefix));
  if (!allowed) {
    return NextResponse.json({ detail: "Not allowed" }, { status: 403 });
  }

  // Strip trailing slash to avoid FastAPI 307 redirects (which can drop headers on POST)
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  const targetUrl = `${BACKEND_URL}${path}${url.search}`;

  const headers: Record<string, string> = {};

  // Determine Content-Type: don't set for multipart (let fetch handle boundary)
  const incomingContentType = req.headers.get("Content-Type") || "";
  if (!incomingContentType.includes("multipart/form-data")) {
    headers["Content-Type"] = incomingContentType || "application/json";
  }

  // Auth: forward session ID from httpOnly cookie
  const sessionId = req.cookies.get(SESSION_ID_COOKIE)?.value;
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }

  // Also forward X-API-Key if provided directly (programmatic API usage)
  const apiKeyHeader = req.headers.get("X-API-Key");
  if (apiKeyHeader) {
    headers["X-API-Key"] = apiKeyHeader;
  }

  // CSRF validation for mutation requests from authenticated dashboard sessions.
  // Auth endpoints are exempt: they are public flows (login, accept-invite, reset-password)
  // protected by their own mechanisms (passwords, one-time tokens), not session cookies.
  if (CSRF_METHODS.has(req.method) && sessionId && !path.includes("/auth/")) {
    const csrfHeader = req.headers.get("X-CSRF-Token") || "";
    const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value || "";
    if (!csrfHeader || !csrfCookie) {
      return NextResponse.json({ detail: "CSRF token required" }, { status: 403 });
    }
    if (csrfCookie !== csrfHeader) {
      return NextResponse.json({ detail: "CSRF validation failed" }, { status: 403 });
    }
  }

  // Forward user identity from httpOnly cookie for RBAC
  const userCookie = req.cookies.get(USER_COOKIE_NAME)?.value;
  if (userCookie) {
    try {
      const userInfo = JSON.parse(userCookie);
      if (userInfo.email) headers["X-User-Email"] = userInfo.email;
      if (userInfo.role) headers["X-User-Role"] = userInfo.role;
      if (userInfo.is_team_member) headers["X-Is-Team-Member"] = "true";
    } catch {
      // Invalid cookie, skip
    }
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual", // Handle redirects ourselves to preserve headers
    signal: AbortSignal.timeout(30000), // 30s timeout
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (incomingContentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      fetchOptions.body = formData;
      // Remove Content-Type so fetch sets it with boundary
      delete (fetchOptions.headers as Record<string, string>)["Content-Type"];
    } else {
      try {
        const body = await req.text();
        if (body) fetchOptions.body = body;
      } catch {
        // no body
      }
    }
  }

  const isLoginRequest =
    req.method === "POST" &&
    (path.includes("/auth/login") || path.includes("/auth/verify-mfa"));

  try {
    let response = await fetch(targetUrl, fetchOptions);

    // Follow redirects manually to preserve headers (307/308 from FastAPI)
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (location) {
        const redirectUrl = new URL(location, targetUrl).href;
        response = await fetch(redirectUrl, { ...fetchOptions, redirect: "follow" });
      }
    }

    const data = await response.text();

    // For login responses: set session cookies, strip secrets from body
    if (isLoginRequest && response.ok) {
      try {
        const parsed = JSON.parse(data);
        const serverSessionId = parsed.session_id || "";
        const csrfToken = parsed.csrf_token || "";

        if (serverSessionId) {
          // Remove session secrets from the response sent to the client
          delete parsed.session_id;
          delete parsed.csrf_token;

          const nextResponse = NextResponse.json(parsed, {
            status: response.status,
          });

          const isProduction = process.env.NODE_ENV === "production";
          const cookieOpts = {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax" as const,
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
          };

          // Store user identity for RBAC enforcement
          nextResponse.cookies.set(USER_COOKIE_NAME, JSON.stringify({
            email: parsed.contact_email,
            role: parsed.user_role || null,
            is_team_member: parsed.is_team_member || false,
            is_regulator: parsed.is_regulator || false,
          }), cookieOpts);

          // Server-side session ID (httpOnly)
          nextResponse.cookies.set(SESSION_ID_COOKIE, serverSessionId, cookieOpts);

          // CSRF token — non-httpOnly so client JS can read it
          // for the double-submit cookie pattern (X-CSRF-Token header)
          if (csrfToken) {
            nextResponse.cookies.set(CSRF_COOKIE, csrfToken, {
              ...cookieOpts,
              httpOnly: false,
            });
          }

          return nextResponse;
        }
      } catch (e) {
        console.error("Login cookie-setting failed:", e);
        // Fall through to normal response
      }
    } else if (isLoginRequest) {
      console.error("Login proxy: response.ok =", response.ok, "status =", response.status);
    }

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { detail: "Backend unreachable" },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
