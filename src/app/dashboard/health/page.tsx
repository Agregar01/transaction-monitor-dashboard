"use client";

import {
  useGetDetailedHealthQuery,
  useGetSystemMetricsQuery,
} from "@/redux/slices/api/healthApi";
import { SkeletonCard } from "@/components/Skeleton";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";

function StatusPill({ status }: { status?: string }) {
  const color =
    status === "healthy"
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
      : status === "degraded"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {status ?? "unknown"}
    </span>
  );
}

export default function HealthPage() {
  const healthPoll = useVisiblePolling(15000);
  const metricsPoll = useVisiblePolling(30000);
  const { data: detailed, isLoading } = useGetDetailedHealthQuery(undefined, {
    pollingInterval: healthPoll,
  });
  const { data: metrics } = useGetSystemMetricsQuery(undefined, {
    pollingInterval: metricsPoll,
  });

  if (isLoading) return <SkeletonCard />;

  const overall = detailed?.status ?? "unknown";
  const deps = detailed?.dependencies ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">System Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Live status of every backing service. Polls every 15s.
          </p>
        </div>
        <StatusPill status={overall} />
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-100 dark:border-navy-600 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
          Subsystems
        </header>
        {Object.keys(deps).length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No dependency data.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-navy-600">
            {Object.entries(deps).map(([name, sub]) => (
              <li key={name} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                  {sub.detail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub.detail}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {sub.latency_ms !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {sub.latency_ms}ms
                    </span>
                  )}
                  <StatusPill status={sub.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {metrics && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Metrics snapshot
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-3 text-sm">
            {Object.entries(metrics)
              .filter(([k]) => typeof (metrics as Record<string, unknown>)[k] !== "object")
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {k.replace(/_/g, " ")}
                  </dt>
                  <dd className="mt-1 font-mono text-gray-900 dark:text-white">
                    {typeof v === "number" ? v.toLocaleString() : String(v)}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  );
}
