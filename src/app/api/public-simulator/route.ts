import { NextRequest, NextResponse } from "next/server";
import { forwardToSim, rateLimited, clientIp } from "@/lib/simulatorProxy";

/**
 * Public simulator — single-transaction dry-run.
 * POST /api/public-simulator → backend POST /simulations/transactions.
 * Service credential stays server-side (see lib/simulatorProxy).
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
  const { status, text } = await forwardToSim("/simulations/transactions", "POST", bodyText);
  return new NextResponse(text, { status, headers: { "Content-Type": "application/json" } });
}

export const dynamic = "force-dynamic";
