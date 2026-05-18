import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
  // Notify backend to destroy server-side session
  const sessionId = req.cookies.get("__sid")?.value;
  if (BACKEND_URL && sessionId) {
    try {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Best-effort — don't block logout if backend is unreachable
    }
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };

  const response = NextResponse.json({ status: "logged_out" });
  response.cookies.set("__session", "", cookieOpts); // Clear legacy cookie if present
  response.cookies.set("__user", "", cookieOpts);
  response.cookies.set("__sid", "", cookieOpts);
  response.cookies.set("__csrf", "", cookieOpts);
  return response;
}
