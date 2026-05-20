import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  CSRF_COOKIE,
  SESSION_MARKER,
} from "@/lib/proxy-policy";

const BACKEND_URL = process.env.BACKEND_URL;
const AUTH_COOKIE_NAMES = [
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  CSRF_COOKIE,
  SESSION_MARKER,
] as const;

/**
 * Canonical logout endpoint. Lives here (not behind the `/api/proxy/[...path]`
 * BFF) so it can clear cookies even if the backend is unreachable. Single
 * source of truth — the proxy intentionally does not handle `/auth/logout`.
 */
export async function POST(req: NextRequest) {
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
      // best-effort: cookies get cleared regardless.
    }
  }

  const response = NextResponse.json({ status: "logged_out" });
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}
