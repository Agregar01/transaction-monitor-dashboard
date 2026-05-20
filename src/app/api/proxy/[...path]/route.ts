import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  CSRF_COOKIE,
  SESSION_MARKER,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  isAllowedPath,
  isCsrfExempt,
  normalizeProxyPath,
  requiresCsrf,
} from "@/lib/proxy-policy";

const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
  console.error("FATAL: BACKEND_URL environment variable is not set");
}

const cookieOpts = (isProduction: boolean) => ({
  httpOnly: true as const,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/" as const,
});

async function callBackend(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
}

// Exchange the refresh token for a new pair. Returns null on failure so the caller
// can clear cookies and propagate the 401.
async function rotateTokens(
  refreshToken: string,
): Promise<{ access: string; refresh: string } | null> {
  try {
    const res = await callBackend("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) return null;
    return { access: data.access_token, refresh: data.refresh_token };
  } catch {
    return null;
  }
}

async function fetchMe(accessToken: string) {
  try {
    const res = await callBackend("/api/v1/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      user_id: string;
      email: string;
      full_name: string | null;
      roles: string[];
    };
  } catch {
    return null;
  }
}

async function fetchTenant(accessToken: string) {
  try {
    const res = await callBackend("/api/v1/tenant/info", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      jurisdiction_code: data.jurisdiction_code as string,
      display_name: data.display_name as string,
    };
  } catch {
    return null;
  }
}

function clearAuthCookies(res: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, CSRF_COOKIE, SESSION_MARKER]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

function buildBackendInit(
  req: NextRequest,
  bodyBuffer: ArrayBuffer | null,
  bodyText: string,
  accessToken: string | null,
  contentType: string,
): RequestInit {
  const headers: Record<string, string> = {};

  if (contentType && !contentType.includes("multipart/form-data")) {
    headers["Content-Type"] = contentType;
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const apiKeyHeader = req.headers.get("X-API-Key");
  if (apiKeyHeader) {
    headers["X-API-Key"] = apiKeyHeader;
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("multipart/form-data") && bodyBuffer) {
      init.body = bodyBuffer;
      headers["Content-Type"] = contentType; // preserve boundary
    } else if (bodyText) {
      init.body = bodyText;
    }
  }

  return init;
}

async function proxyRequest(req: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { detail: "Server misconfiguration: BACKEND_URL not set" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const path = normalizeProxyPath(url.pathname);

  if (!isAllowedPath(path)) {
    return NextResponse.json({ detail: "Not allowed" }, { status: 403 });
  }

  const isLogin = req.method === "POST" && path === "/api/v1/auth/login";
  const isLogout = req.method === "POST" && path === "/api/v1/auth/logout";

  const accessCookie = req.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refreshCookie = req.cookies.get(REFRESH_COOKIE)?.value ?? null;
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value ?? null;

  // [DIAG] Temporary cookie diagnostic — remove once 401-loop is resolved.
  const rawCookieHeader = req.headers.get("cookie") ?? "";
  const cookieNamesInHeader = rawCookieHeader
    .split(";")
    .map((s) => s.trim().split("=")[0])
    .filter(Boolean);
  const cookieNamesViaApi: string[] = [];
  for (const c of req.cookies.getAll()) {
    cookieNamesViaApi.push(c.name);
  }
  console.log("[proxy-diag]", JSON.stringify({
    method: req.method,
    path,
    cookieHeaderPresent: rawCookieHeader.length > 0,
    cookieNamesInHeader,
    cookieNamesViaApi,
    accessCookieReadable: accessCookie !== null,
    accessCookieLength: accessCookie?.length ?? 0,
    refreshCookieReadable: refreshCookie !== null,
    csrfCookieReadable: csrfCookie !== null,
  }));

  // CSRF double-submit validation. Public auth flows are exempt; they are protected
  // by passwords or one-time tokens, not session cookies.
  if (requiresCsrf(req.method, path)) {
    const csrfHeader = req.headers.get("X-CSRF-Token") ?? "";
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ detail: "CSRF validation failed" }, { status: 403 });
    }
  }

  // Read body once so we can replay on a 401 retry.
  const contentType = req.headers.get("Content-Type") ?? "";
  let bodyBuffer: ArrayBuffer | null = null;
  let bodyText = "";

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      try {
        bodyBuffer = await req.arrayBuffer();
      } catch {
        bodyBuffer = null;
      }
    } else {
      try {
        bodyText = await req.text();
      } catch {
        bodyText = "";
      }
    }
  }

  // ── LOGIN: JSON {email, password} → form-urlencoded username/password ──
  if (isLogin) {
    let parsed: { email?: string; password?: string };
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
    }
    if (!parsed.email || !parsed.password) {
      return NextResponse.json({ detail: "email and password required" }, { status: 400 });
    }

    const form = new URLSearchParams();
    form.set("username", parsed.email);
    form.set("password", parsed.password);

    let upstream: Response;
    try {
      upstream = await callBackend("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    } catch {
      return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
    }

    const upstreamText = await upstream.text();
    if (!upstream.ok) {
      return new NextResponse(upstreamText, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    let tokenPair: { access_token: string; refresh_token: string };
    try {
      tokenPair = JSON.parse(upstreamText);
    } catch {
      return NextResponse.json({ detail: "Invalid backend login response" }, { status: 502 });
    }

    // Enrich the response so the client can populate Redux without a second round-trip.
    const [me, tenant] = await Promise.all([
      fetchMe(tokenPair.access_token),
      fetchTenant(tokenPair.access_token),
    ]);
    if (!me) {
      return NextResponse.json(
        { detail: "Login succeeded but /auth/me failed" },
        { status: 502 },
      );
    }

    const csrfToken = randomBytes(32).toString("hex");
    const isProduction = process.env.NODE_ENV === "production";
    const base = cookieOpts(isProduction);

    const response = NextResponse.json({
      user_id: me.user_id,
      email: me.email,
      full_name: me.full_name,
      roles: me.roles,
      csrf_token: csrfToken,
      jurisdiction_code: tenant?.jurisdiction_code ?? null,
      jurisdiction_display_name: tenant?.display_name ?? null,
    });

    response.cookies.set(ACCESS_COOKIE, tokenPair.access_token, { ...base, maxAge: ACCESS_MAX_AGE });
    response.cookies.set(REFRESH_COOKIE, tokenPair.refresh_token, { ...base, maxAge: REFRESH_MAX_AGE });
    response.cookies.set(
      USER_COOKIE,
      JSON.stringify({
        user_id: me.user_id,
        email: me.email,
        full_name: me.full_name,
        roles: me.roles,
      }),
      { ...base, maxAge: REFRESH_MAX_AGE },
    );
    // CSRF cookie readable by client JS (double-submit) → httpOnly: false
    response.cookies.set(CSRF_COOKIE, csrfToken, { ...base, httpOnly: false, maxAge: REFRESH_MAX_AGE });
    response.cookies.set(SESSION_MARKER, "1", { ...base, maxAge: REFRESH_MAX_AGE });

    return response;
  }

  // ── LOGOUT: revoke refresh token + clear all auth cookies ──
  if (isLogout) {
    if (refreshCookie) {
      try {
        await callBackend("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshCookie }),
        });
      } catch {
        // best-effort; cookies still get cleared
      }
    }
    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);
    return response;
  }

  // ── Standard proxied request ──
  let accessToken = accessCookie;

  const backendInit = buildBackendInit(req, bodyBuffer, bodyText, accessToken, contentType);
  // [DIAG] Confirm whether the Authorization header actually made it onto the outbound init.
  const outboundHeaders = backendInit.headers as Record<string, string> | undefined;
  console.log("[proxy-diag-outbound]", JSON.stringify({
    path,
    hasAccessToken: accessToken !== null,
    accessTokenLen: accessToken?.length ?? 0,
    outboundHasAuthorization: Boolean(outboundHeaders?.["Authorization"]),
    outboundAuthorizationPrefix: outboundHeaders?.["Authorization"]?.slice(0, 14) ?? null,
    outboundHeaderKeys: outboundHeaders ? Object.keys(outboundHeaders) : [],
  }));

  const firstAttempt = await callBackend(
    `${path}${url.search}`,
    backendInit,
  ).catch(() => null);

  if (!firstAttempt) {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }

  // Transparent refresh-and-retry on 401
  if (firstAttempt.status === 401 && refreshCookie && !isCsrfExempt(path)) {
    const rotated = await rotateTokens(refreshCookie);
    if (!rotated) {
      const text = await firstAttempt.text().catch(() => "");
      const response = new NextResponse(
        text || JSON.stringify({ detail: "Session expired" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
      clearAuthCookies(response);
      return response;
    }
    accessToken = rotated.access;
    const retry = await callBackend(
      `${path}${url.search}`,
      buildBackendInit(req, bodyBuffer, bodyText, accessToken, contentType),
    ).catch(() => null);
    if (!retry) {
      return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
    }
    const retryText = await retry.text();
    const response = new NextResponse(retryText, {
      status: retry.status,
      headers: {
        "Content-Type": retry.headers.get("Content-Type") || "application/json",
      },
    });
    const isProduction = process.env.NODE_ENV === "production";
    const base = cookieOpts(isProduction);
    response.cookies.set(ACCESS_COOKIE, rotated.access, { ...base, maxAge: ACCESS_MAX_AGE });
    response.cookies.set(REFRESH_COOKIE, rotated.refresh, { ...base, maxAge: REFRESH_MAX_AGE });
    return response;
  }

  const responseText = await firstAttempt.text();
  return new NextResponse(responseText, {
    status: firstAttempt.status,
    headers: {
      "Content-Type": firstAttempt.headers.get("Content-Type") || "application/json",
    },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
