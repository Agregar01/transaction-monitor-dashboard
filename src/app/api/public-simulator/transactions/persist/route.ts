import { NextRequest, NextResponse } from "next/server";
import { forwardToSim, rateLimited } from "@/lib/simulatorProxy";

/**
 * Public simulator — score a single payment and KEEP it.
 * POST /api/public-simulator/transactions/persist → backend POST /simulations/transactions/persist.
 *
 * The sibling of the scenarios/persist route, for one payment rather than a
 * sequence. Writes a real transaction (and whatever alert/case the pipeline
 * opens off it) into the demo institution fixed server-side by
 * SCENARIO_PERSIST_INSTITUTION_ID, so a flagged payment from the customer-facing
 * simulator reaches the client's queue in the dashboard. The backend refuses a
 * borrowed customer_id on this path and holds it to a per-day write budget.
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
  const { status, text } = await forwardToSim("/simulations/transactions/persist", "POST", bodyText);
  return new NextResponse(text, { status, headers: { "Content-Type": "application/json" } });
}

export const dynamic = "force-dynamic";
