import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const session = request.cookies.get("__sid");
    if (!session?.value) {
      const loginUrl = new URL("/login", request.url);
      // Validate redirect is a safe relative path (prevent open redirect)
      const safeRedirect = pathname.startsWith("/") && !pathname.startsWith("//") && !pathname.includes("://") ? pathname : "/";
      loginUrl.searchParams.set("redirect", safeRedirect);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from public auth pages
  if (pathname === "/login" || pathname === "/forgot-password") {
    const session = request.cookies.get("__sid");
    if (session?.value) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const response = NextResponse.next();

  // Add security headers for non-API routes
  if (!pathname.startsWith("/api/")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/forgot-password"],
};
