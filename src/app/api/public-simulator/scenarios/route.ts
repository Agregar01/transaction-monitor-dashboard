import { NextRequest, NextResponse } from "next/server";
import { forwardToSim, rateLimited, clientIp } from "@/lib/simulatorProxy";

/**
 * Public simulator — multi-leg scenario dry-run.
 * POST /api/public-simulator/scenarios → backend POST /simulations/scenarios.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ detail: "Too many requests — try again in a minute." }, { status: 429 });
  }
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }
  const { status, text } = await forwardToSim("/simulations/scenarios", "POST", bodyText);
  return new NextResponse(text, { status, headers: { "Content-Type": "application/json" } });
}

export const dynamic = "force-dynamic";
