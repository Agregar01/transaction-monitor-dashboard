import { NextRequest, NextResponse } from "next/server";

/**
 * Edge auth gate. We check the refresh token cookie (`__refresh`) rather than
 * the short-lived access token: by the time the middleware runs the access
 * token may have expired even though the session is still valid — the proxy
 * will rotate it on the next API call. The refresh token is the authoritative
 * "do you have an unexpired session" signal.
 *
 * Note: this is convenience, not security. The proxy still validates every
 * upstream call and returns 401 if the token is invalid.
 */
const SESSION_COOKIE = "__refresh";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Root entry point: redirect at the edge instead of shipping a client
  // component that hydrates and then router.replace()s (a guaranteed waterfall
  // on the most-hit URL).
  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/dashboard" : "/login", request.url));
  }

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Only forward purely-relative paths to prevent open-redirect via ?redirect=.
    const safeRedirect =
      pathname.startsWith("/") && !pathname.startsWith("//") && !pathname.includes("://")
        ? pathname
        : "/";
    loginUrl.searchParams.set("redirect", safeRedirect);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/forgot-password") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  if (!pathname.startsWith("/api/")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/forgot-password"],
};
