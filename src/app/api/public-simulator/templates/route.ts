import { NextRequest, NextResponse } from "next/server";
import { forwardToSim, rateLimited } from "@/lib/simulatorProxy";

/**
 * Public simulator — list scenario templates.
 * GET /api/public-simulator/templates → backend GET /simulations/templates.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ detail: "Too many requests — try again in a minute." }, { status: 429 });
  }
  const { status, text } = await forwardToSim("/simulations/templates", "GET", null);
  return new NextResponse(text, { status, headers: { "Content-Type": "application/json" } });
}

export const dynamic = "force-dynamic";
