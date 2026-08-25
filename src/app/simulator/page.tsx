"use client";

import TransactionSimulator from "@/components/simulator/TransactionSimulator";

/**
 * Standalone, unauthenticated demo surface — deliberately isolated from the
 * main dashboard: no Sidebar/TopBar, no login, no <Link> anywhere on this
 * page or inside TransactionSimulator, so there is nothing here for a visitor
 * to navigate into the real app with.
 *
 * It's also isolated at the network level, not just the UI level: this page
 * never authenticates the browser itself (no cookies, no Redux auth state).
 * Every "Run simulation" call goes to /api/public-simulator, a server route
 * that holds its own service credential and forwards the request — so even a
 * technical visitor poking at the network tab / devtools has no session to
 * reuse against anything else in the app.
 */
export default function PublicSimulatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="border-b border-gray-100 dark:border-navy-600 bg-white dark:bg-navy-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-white text-[10px] font-extrabold">
            TM
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Transaction Monitor — Simulator
          </span>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <TransactionSimulator canUse publicMode />
      </div>
    </div>
  );
}
