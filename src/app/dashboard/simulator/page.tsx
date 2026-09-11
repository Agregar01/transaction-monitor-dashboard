"use client";

import { useAppSelector } from "@/redux/store";
import TransactionSimulator from "@/components/simulator/TransactionSimulator";

/**
 * The simulator for the institution's OWN people, inside the authenticated
 * console. The same component the public `/simulator` page mounts, minus
 * `publicMode` — which changes three things that matter:
 *
 *   1. Runs are DRY RUNS, scored and rolled back. The public page persists into
 *      a fixed demo institution; an analyst testing a rule change must never
 *      inject traffic into their own institution's alert and case queues.
 *   2. A real customer can be looked up and borrowed, so a rule can be tested
 *      against an actual profile and history rather than a made-up one.
 *   3. The guided walkthrough runs to completion, STR included, because here the
 *      viewer genuinely holds that role.
 *
 * The simulator's own components are painted on a fixed dark surface (see
 * components/simulator/ui.tsx), so the panel is wrapped in `dark` rather than
 * inheriting the console's theme. Without the wrapper its `dark:` classes never
 * resolve for a user on the light theme and the panel renders unreadable.
 */
export default function DashboardSimulatorPage() {
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canUse = permissions.includes("simulate_transaction");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Simulator</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Score a payment, or a whole typology, against the live decision engine without
          touching your data. Nothing here is written to your alerts, cases or transactions.
        </p>
      </div>

      <div className="dark">
        <div className="rounded-xl bg-[#08081C] p-5 text-[#F2F3FA] sm:p-6">
          <TransactionSimulator canUse={canUse} />
        </div>
      </div>
    </div>
  );
}
