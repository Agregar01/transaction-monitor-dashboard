import { NextRequest, NextResponse } from "next/server";
import { forwardToSim, rateLimited } from "@/lib/simulatorProxy";

/**
 * Public simulator — persist a multi-leg scenario for real.
 * POST /api/public-simulator/scenarios/persist → backend POST /simulations/scenarios/persist.
 * Unlike the dry-run scenarios route, this writes real transactions/alerts/cases
 * into the configured demo institution so the run is trackable in the dashboard.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ detail: "Too many requests — try again in a minute." }, { status: 429 });
  }
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }
  const { status, text } = await forwardToSim("/simulations/scenarios/persist", "POST", bodyText);
  return new NextResponse(text, { status, headers: { "Content-Type": "application/json" } });
}

export const dynamic = "force-dynamic";
