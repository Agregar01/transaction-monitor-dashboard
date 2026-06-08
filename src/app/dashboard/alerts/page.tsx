"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useListAlertsQuery } from "@/redux/slices/api/alertsApi";
import { useGetAnalyticsSummaryQuery } from "@/redux/slices/api/analyticsApi";
import ExportButton from "@/components/ExportButton";
import { API_V1 } from "@/config/api";
import { SkeletonTable } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import DonutCard from "@/components/DonutCard";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";
import { riskBandColors, type RiskBand } from "@/config/constants";
import type { AlertPriority, AlertStatus } from "@/types/api";

const PRIORITIES: AlertPriority[] = ["IMMEDIATE", "BATCH", "REVIEW"];
const STATUSES: AlertStatus[] = ["OPEN", "INVESTIGATING", "CLOSED"];

const PRIORITY_COLORS: Record<AlertPriority, string> = {
  IMMEDIATE: "#ef4444",
  BATCH: "#3b82f6",
  REVIEW: "#f59e0b",
};

export default function AlertsListPage() {
  const [page, setPage] = useState(1);
  const [priority, setPriority] = useState<AlertPriority | "">("");
  const [status, setStatus] = useState<AlertStatus | "">("OPEN");
  const [assignedTo, setAssignedTo] = useState("");

  const pollingInterval = useVisiblePolling(10000);
  const { data, isLoading, isFetching, error } = useListAlertsQuery(
    {
      page,
      page_size: 20,
      priority: priority || undefined,
      status: status || undefined,
      assigned_to: assignedTo || undefined,
    },
    { pollingInterval },
  );

  const totalPages = data
    ? Math.max(1, data.total_pages ?? Math.ceil(data.total / data.page_size))
    : 1;

  // Breakdowns: risk band from the real population (analytics), priority from a
  // recent sample (not available in the analytics summary).
  const { data: analytics } = useGetAnalyticsSummaryQuery({ period_days: 90 });
  const { data: sample } = useListAlertsQuery({ page_size: 200 });

  const riskBreakdown = useMemo(() => {
    const order: RiskBand[] = ["ALLOW", "FLAG", "STEP_UP", "HOLD", "BLOCK"];
    const dist = analytics?.risk_distribution;
    const series = order.map((b) => dist?.[b] ?? 0);
    return {
      labels: [...order],
      series,
      colors: order.map((b) => riskBandColors[b]),
      total: series.reduce((a, b) => a + b, 0),
    };
  }, [analytics]);

  const priorityBreakdown = useMemo(() => {
    const counts = {} as Record<AlertPriority, number>;
    for (const p of PRIORITIES) counts[p] = 0;
    for (const a of sample?.items ?? []) if (a.priority in counts) counts[a.priority] += 1;
    const labels = PRIORITIES.filter((p) => counts[p] > 0);
    return {
      labels: [...labels],
      series: labels.map((p) => counts[p]),
      colors: labels.map((p) => PRIORITY_COLORS[p]),
    };
  }, [sample]);

  const sampleSize = sample?.items.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Alerts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Rule- and ML-triggered alerts. Polls every 10s.
          </p>
        </div>
        <ExportButton
          url={(() => {
            const p = new URLSearchParams();
            if (priority) p.set("priority", priority);
            if (status) p.set("status", status);
            const qs = p.toString();
            return `${API_V1}/export/alerts${qs ? `?${qs}` : ""}`;
          })()}
          filename="alerts.csv"
          requiredPermission="view_audit_trail"
        />
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Status
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as AlertStatus | "");
            }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Priority
          </label>
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => {
              setPage(1);
              setPriority(e.target.value as AlertPriority | "");
            }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">Any</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Assigned to (email)
          </label>
          <input
            type="text"
            aria-label="Filter by assigned analyst email"
            value={assignedTo}
            onChange={(e) => {
              setPage(1);
              setAssignedTo(e.target.value);
            }}
            placeholder="analyst@autheo.test"
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {(riskBreakdown.total > 0 || sampleSize > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutCard
            title="By risk band"
            subtitle="All alerts · last 90 days"
            labels={riskBreakdown.labels}
            series={riskBreakdown.series}
            colors={riskBreakdown.colors}
          />
          <DonutCard
            title="By priority"
            subtitle={`Recent ${sampleSize} alerts`}
            labels={priorityBreakdown.labels}
            series={priorityBreakdown.series}
            colors={priorityBreakdown.colors}
          />
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load alerts.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No alerts match the current filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Alert ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-right">Rules</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Assigned</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((a) => (
                <tr key={a.alert_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3">
                    <ActionBadge action={a.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/alerts/${a.alert_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {a.alert_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/customers/${a.customer_id}`}
                      className="font-mono text-xs text-gray-700 dark:text-gray-300 hover:underline"
                    >
                      {a.customer_id.slice(0, 10)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge score={a.risk_score} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-gray-600 dark:text-gray-300">
                    {a.triggered_rules_count}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={a.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    {a.assigned_to ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(a.alert_timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-navy-600 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {data.total} total · page {page} of {totalPages}
              {isFetching && " · refreshing…"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
