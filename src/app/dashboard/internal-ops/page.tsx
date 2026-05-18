"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import { useGetUsageQuery } from "@/redux/slices/api/usageApi";
import { useGetDecisionStatisticsQuery } from "@/redux/slices/api/decisionsApi";
import { useGetHourlyStatsQuery } from "@/redux/slices/api/complianceApi";
import StatCard from "@/components/StatCard";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import AdminGuard from "@/components/AdminGuard";
import {
  ServerIcon,
  CpuChipIcon,
  ClockIcon,
  SignalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function InternalOpsPage() {
  const { clientId } = useAppSelector((s) => s.auth);
  const [healthStatus, setHealthStatus] = useState<Record<string, unknown> | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    document.title = "Internal Operations | Deferred KYC";
  }, []);

  // Fetch health check
  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/proxy/api/v1/health/");
        const data = await res.json();
        setHealthStatus(data);
      } catch {
        setHealthStatus({ status: "error", message: "Failed to connect" });
      } finally {
        setHealthLoading(false);
      }
    }
    fetchHealth();
  }, []);

  const { data: usage, isLoading: usageLoading } = useGetUsageQuery(
    { client_id: clientId || undefined },
    { skip: !clientId }
  );

  const { data: stats, isLoading: statsLoading } = useGetDecisionStatisticsQuery(
    { client_id: clientId!, period: "7d" },
    { skip: !clientId }
  );

  const { data: hourly, isLoading: hourlyLoading } = useGetHourlyStatsQuery(
    { client_id: clientId!, hours: 24 },
    { skip: !clientId }
  );

  const refreshHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/proxy/api/v1/health/");
      const data = await res.json();
      setHealthStatus(data);
    } catch {
      setHealthStatus({ status: "error", message: "Failed to connect" });
    } finally {
      setHealthLoading(false);
    }
  };

  const isLoading = usageLoading || statsLoading;

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Internal Operations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            System health, API metrics, and operational monitoring
          </p>
        </div>
        <button
          onClick={refreshHealth}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
        >
          <ArrowPathIcon className={`h-4 w-4 ${healthLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h2>
        </div>
        {healthLoading ? (
          <SkeletonTable rows={4} cols={3} />
        ) : healthStatus ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <HealthCard
                label="API Status"
                status={healthStatus.status === "healthy" ? "healthy" : "unhealthy"}
                detail={String(healthStatus.status || "unknown")}
              />
              <HealthCard
                label="Service"
                status="info"
                detail={String(healthStatus.service || "orchestrator")}
              />
              <HealthCard
                label="Version"
                status="info"
                detail={String(healthStatus.version || "—")}
              />
              <HealthCard
                label="Environment"
                status="info"
                detail={String(healthStatus.environment || "—")}
              />
            </div>

            {/* Component Health Details */}
            <ComponentHealth components={healthStatus.components} />
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Unable to fetch health status.</div>
        )}
      </div>

      {/* API Metrics */}
      {isLoading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total API Calls (7d)"
            value={usage?.total_calls || 0}
            subtitle={`${usage?.total_evaluate_calls || 0} evaluations`}
            icon={<ServerIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-primary"
          />
          <StatCard
            title="Avg Decision Latency"
            value={`${(stats?.avg_processing_time_ms || 0).toFixed(0)}ms`}
            subtitle="7-day average"
            icon={<ClockIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-blue-500"
          />
          <StatCard
            title="Decisions (7d)"
            value={stats?.total_decisions || 0}
            subtitle="Evaluate endpoint calls"
            icon={<CpuChipIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-green-500"
          />
          <StatCard
            title="Block Rate"
            value={
              stats?.total_decisions
                ? `${(((stats.decisions_by_action?.BLOCK || 0) / stats.total_decisions) * 100).toFixed(1)}%`
                : "0%"
            }
            subtitle={`${stats?.decisions_by_action?.BLOCK || 0} blocked`}
            icon={<SignalIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-red-500"
          />
        </div>
      )}

      {/* Decision Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Action */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Decisions by Action (7d)</h3>
            <div className="space-y-3">
              {Object.entries(stats.decisions_by_action || {}).map(([action, count]) => {
                const pct = stats.total_decisions ? (count / stats.total_decisions) * 100 : 0;
                return (
                  <div key={action}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{action}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-navy-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          action === "ALLOW" ? "bg-green-500" :
                          action === "BLOCK" ? "bg-red-500" :
                          action === "REVIEW" ? "bg-amber-500" :
                          action === "FREEZE" ? "bg-gray-500" :
                          "bg-primary"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Risk Level */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Decisions by Risk Level (7d)</h3>
            <div className="space-y-3">
              {Object.entries(stats.decisions_by_risk_level || {}).map(([level, count]) => {
                const pct = stats.total_decisions ? (count / stats.total_decisions) * 100 : 0;
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{level}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-navy-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          level === "LOW" ? "bg-green-500" :
                          level === "MEDIUM" ? "bg-amber-500" :
                          level === "HIGH" ? "bg-orange-500" :
                          level === "VERY_HIGH" ? "bg-red-500" :
                          "bg-red-800"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hourly Activity */}
      {!hourlyLoading && hourly?.data?.length ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hourly Activity (Last 24h)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Hour</th>
                  <th className="px-6 py-3 font-medium">Allow</th>
                  <th className="px-6 py-3 font-medium">Block</th>
                  <th className="px-6 py-3 font-medium">Review</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {hourly.data.map((h) => {
                  const total = Object.values(h.counts || {}).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={h.hour} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-gray-900 dark:text-white">
                        {new Date(h.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3 text-green-600">{h.counts?.ALLOW || 0}</td>
                      <td className="px-6 py-3 text-red-600">{h.counts?.BLOCK || 0}</td>
                      <td className="px-6 py-3 text-amber-600">{h.counts?.REVIEW || 0}</td>
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Daily Usage Trend */}
      {usage?.daily_breakdown?.length ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Daily API Usage</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Evaluate</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Allow</th>
                  <th className="px-6 py-3 font-medium">Block</th>
                  <th className="px-6 py-3 font-medium">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {usage.daily_breakdown.slice(-14).map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-gray-900 dark:text-white">{day.date}</td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{day.evaluate_calls}</td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{day.customer_calls}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{day.total_calls}</td>
                    <td className="px-6 py-3 text-green-600">{day.decisions_allow}</td>
                    <td className="px-6 py-3 text-red-600">{day.decisions_block}</td>
                    <td className="px-6 py-3 text-amber-600">{day.decisions_review}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
    </AdminGuard>
  );
}

function ComponentHealth({ components }: { components: unknown }) {
  if (!components || typeof components !== "object") return null;
  const entries = Object.entries(components as Record<string, Record<string, unknown>>);
  if (!entries.length) return null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Component Status</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {entries.map(([name, info]) => {
          const isHealthy = info?.status === "healthy" || info?.status === "connected";
          return (
            <div
              key={name}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isHealthy
                  ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20"
                  : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {isHealthy ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{name}</span>
              </div>
              <span className={`text-xs font-medium ${isHealthy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {String(info?.status || "unknown")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthCard({ label, status, detail }: { label: string; status: "healthy" | "unhealthy" | "info"; detail: string }) {
  return (
    <div className={`p-4 rounded-lg border ${
      status === "healthy"
        ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20"
        : status === "unhealthy"
        ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"
        : "border-gray-200 dark:border-navy-600 bg-gray-50 dark:bg-navy-800"
    }`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {status === "healthy" && <CheckCircleIcon className="h-5 w-5 text-green-500" aria-hidden="true" />}
        {status === "unhealthy" && <XCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />}
        <p className={`text-sm font-medium ${
          status === "healthy" ? "text-green-700 dark:text-green-400" :
          status === "unhealthy" ? "text-red-700 dark:text-red-400" :
          "text-gray-900 dark:text-white"
        }`}>
          {detail}
        </p>
      </div>
    </div>
  );
}
