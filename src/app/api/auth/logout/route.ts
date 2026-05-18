import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

const ACCESS_COOKIE = "__access";
const REFRESH_COOKIE = "__refresh";
const USER_COOKIE = "__user";
const CSRF_COOKIE = "__csrf";
const SESSION_MARKER = "__sid";

export async function POST(req: NextRequest) {
  // Best-effort: revoke the refresh token server-side before clearing cookies.
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (BACKEND_URL && refreshToken) {
    try {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Logout proceeds even if the backend is unreachable.
    }
  }

  const clearOpts = { path: "/", maxAge: 0 };
  const response = NextResponse.json({ status: "logged_out" });
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, CSRF_COOKIE, SESSION_MARKER]) {
    response.cookies.set(name, "", clearOpts);
  }
  return response;
}
