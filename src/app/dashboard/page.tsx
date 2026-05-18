"use client";

import { useAppSelector } from "@/redux/store";

export default function DashboardOverviewPage() {
  const { fullName, email, roles, jurisdictionCode, jurisdictionDisplayName } = useAppSelector(
    (s) => s.auth,
  );
  const displayName = fullName || email || "Analyst";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Welcome, {displayName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {jurisdictionDisplayName ?? jurisdictionCode ?? "—"} jurisdiction · Transaction monitoring console.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-sm border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Your roles
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.length === 0 ? (
            <span className="text-sm text-gray-400">No roles assigned</span>
          ) : (
            roles.map((r) => (
              <span
                key={r}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
              >
                {r}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Phase 1 verification surface
        </h3>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
          The JWT BFF auth flow is wired up. KPI cards, alert streams, case management,
          and other surfaces land in Phases 4-7. Use the sidebar to navigate to each
          (currently &quot;Coming soon&quot; placeholders).
        </p>
      </div>
    </div>
  );
}
