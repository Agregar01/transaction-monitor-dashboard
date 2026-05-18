"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import {
  useGetRiskDistributionQuery,
  useGetRuleAnalyticsQuery,
  useGetComplianceAlertsQuery,
  useGetHourlyStatsQuery,
  useGetVerificationBacklogQuery,
} from "@/redux/slices/api/complianceApi";
import { useGetDecisionStatisticsQuery } from "@/redux/slices/api/decisionsApi";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import TierBadge from "@/components/TierBadge";
import { SkeletonStats, SkeletonTable, SkeletonCard } from "@/components/Skeleton";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";
import { chartColors } from "@/config/constants";
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  ChartBarSquareIcon,
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const RULE_CATEGORY_LABELS: Record<string, string> = {
  TXN: "Transaction",
  ACT: "Action",
  BEH: "Behavioral",
  RSK: "Risk",
  TIM: "Time-based",
  REG: "Regulatory",
  EXT: "External",
  BIZ: "Business",
};

const CATEGORY_COLORS: Record<string, string> = {
  TXN: "#3b82f6",
  ACT: "#8b5cf6",
  BEH: "#f97316",
  RSK: "#ef4444",
  TIM: "#06b6d4",
  REG: "#f59e0b",
  EXT: "#ec4899",
  BIZ: "#10b981",
};

const VERIFICATION_STATUS_CONFIG = [
  { key: "none",    label: "Pending",     icon: ClockIcon,        bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  { key: "pending", label: "In Progress", icon: ArrowPathIcon,    bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  { key: "passed",  label: "Completed",   icon: CheckCircleIcon,  bg: "bg-green-50 dark:bg-green-900/20",  text: "text-green-600 dark:text-green-400",  badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  { key: "failed",  label: "Failed",      icon: XCircleIcon,      bg: "bg-red-50 dark:bg-red-900/20",      text: "text-red-600 dark:text-red-400",      badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
];

// Behavioral signal classification
const BEHAVIORAL_SIGNAL_LABELS: Record<string, string> = {
  BEH_001: "Multiple identity attempts",
  BEH_002: "Suspicious onboarding pattern",
  BEH_003: "Document anomaly",
  BEH_004: "Device fingerprint mismatch",
  BEH_005: "Unusual login timing",
  BEH_006: "Velocity anomaly",
};

export default function RiskMonitoringPage() {
  const { clientId } = useAppSelector((s) => s.auth);

  useEffect(() => {
    document.title = "Risk & Monitoring | Deferred KYC";
  }, []);

  const { data: riskDist, isLoading: riskLoading } = useGetRiskDistributionQuery(
    { client_id: clientId! },
    { skip: !clientId }
  );

  const { data: ruleAnalytics, isLoading: rulesLoading } = useGetRuleAnalyticsQuery(
    { client_id: clientId!, days: 30 },
    { skip: !clientId }
  );

  const { data: stats } = useGetDecisionStatisticsQuery(
    { client_id: clientId!, period: "30d" },
    { skip: !clientId }
  );

  const { data: alerts } = useGetComplianceAlertsQuery(
    { client_id: clientId!, limit: 20 },
    { skip: !clientId }
  );

  const { data: hourlyData, isLoading: hourlyLoading } = useGetHourlyStatsQuery(
    { client_id: clientId!, hours: 168 },
    { skip: !clientId }
  );

  const { data: backlog, isLoading: backlogLoading } = useGetVerificationBacklogQuery(
    { client_id: clientId! },
    { skip: !clientId }
  );

  // Behavioral anomalies: alerts from BEH_* rules
  const behavioralAlerts = useMemo(() => {
    if (!alerts?.items) return [];
    return alerts.items.filter((a) =>
      (a.triggered_rules || []).some((r) => r.startsWith("BEH_"))
    );
  }, [alerts]);

  // Risk distribution donut chart
  const riskDonutOptions = useMemo(() => {
    if (!riskDist?.by_risk_level) return null;
    const levels = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH", "CRITICAL"];
    const labels = levels.filter((l) => (riskDist.by_risk_level[l] || 0) > 0);
    const series = labels.map((l) => riskDist.by_risk_level[l] || 0);
    const colors = labels.map((l) => chartColors.risk[l] || "#94a3b8");

    return {
      series,
      options: {
        chart: { type: "donut" as const, background: "transparent" },
        labels,
        colors,
        legend: { position: "bottom" as const, labels: { colors: "#9ca3af" } },
        plotOptions: {
          pie: {
            donut: {
              size: "60%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "Total",
                  formatter: () => String(riskDist.total_customers),
                },
              },
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val: number) => `${val.toFixed(0)}%`,
          style: { fontSize: "11px", fontWeight: "600" },
          dropShadow: { enabled: false },
        },
        stroke: { show: false },
        tooltip: { theme: "dark", y: { formatter: (val: number) => `${val} customers` } },
      },
    };
  }, [riskDist]);

  // Risk trend area chart from hourly data
  const trendChartData = useMemo(() => {
    if (!hourlyData?.data?.length) return null;

    const dailyMap: Record<string, Record<string, number>> = {};
    for (const entry of hourlyData.data) {
      const day = entry.hour.slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = {};
      for (const [action, count] of Object.entries(entry.counts || {})) {
        dailyMap[day][action] = (dailyMap[day][action] || 0) + count;
      }
    }

    const days = Object.keys(dailyMap).sort();
    const actionKeys = ["ALLOW", "BLOCK", "REVIEW", "UPGRADE_REQUIRED"];
    const seriesData = actionKeys
      .map((action) => ({
        name: action === "UPGRADE_REQUIRED" ? "Upgrade" : action.charAt(0) + action.slice(1).toLowerCase(),
        data: days.map((d) => dailyMap[d][action] || 0),
      }))
      .filter((s) => s.data.some((v) => v > 0));

    return {
      series: seriesData,
      options: {
        chart: { type: "area" as const, background: "transparent", toolbar: { show: false }, stacked: false },
        xaxis: {
          categories: days.map((d) => {
            const date = new Date(d);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }),
          labels: { style: { colors: "#9ca3af", fontSize: "11px" } },
        },
        yaxis: { labels: { style: { colors: "#9ca3af" } } },
        colors: [chartColors.action.ALLOW, chartColors.action.BLOCK, chartColors.action.REVIEW, chartColors.action.UPGRADE_REQUIRED],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
        stroke: { curve: "smooth" as const, width: 2 },
        grid: { borderColor: "#334155", strokeDashArray: 4 },
        dataLabels: { enabled: false },
        tooltip: { theme: "dark" },
        legend: { position: "top" as const, labels: { colors: "#9ca3af" } },
      },
    };
  }, [hourlyData]);

  // Rule category bar chart
  const categoryChartData = useMemo(() => {
    if (!ruleAnalytics?.by_category) return null;
    const entries = Object.entries(ruleAnalytics.by_category);
    const categories = entries.map(([k]) => RULE_CATEGORY_LABELS[k] || k);
    const series = entries.map(([, v]) => v);
    const colors = entries.map(([k]) => CATEGORY_COLORS[k] || "#94a3b8");

    return {
      series: [{ name: "Triggers", data: series }],
      options: {
        chart: { type: "bar" as const, background: "transparent", toolbar: { show: false } },
        xaxis: { categories, labels: { style: { colors: "#9ca3af", fontSize: "11px" } } },
        yaxis: { labels: { style: { colors: "#9ca3af" } } },
        colors,
        plotOptions: { bar: { distributed: true, borderRadius: 4, columnWidth: "60%" } },
        legend: { show: false },
        grid: { borderColor: "#334155", strokeDashArray: 4 },
        dataLabels: { enabled: false },
        tooltip: { theme: "dark" },
      },
    };
  }, [ruleAnalytics]);

  // Verification status bar chart
  const verificationChartData = useMemo(() => {
    if (!backlog?.by_status) return null;
    const { none, pending, passed, failed } = backlog.by_status;
    const total = none + pending + passed + failed;
    if (total === 0) return null;
    return {
      series: [
        { name: "Pending", data: [none] },
        { name: "In Progress", data: [pending] },
        { name: "Completed", data: [passed] },
        { name: "Failed", data: [failed] },
      ],
      options: {
        chart: { type: "bar" as const, background: "transparent", toolbar: { show: false }, stacked: true, stackType: "100%" as const },
        xaxis: { categories: ["Verification Status"], labels: { style: { colors: "#9ca3af" } } },
        yaxis: { labels: { style: { colors: "#9ca3af" }, formatter: (v: number) => `${v.toFixed(0)}%` } },
        colors: ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444"],
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        legend: { position: "bottom" as const, labels: { colors: "#9ca3af" } },
        dataLabels: { enabled: true, formatter: (v: number) => v > 5 ? `${v.toFixed(0)}%` : "" },
        grid: { borderColor: "#334155" },
        tooltip: { theme: "dark" },
      },
    };
  }, [backlog]);

  // Decision status from decision stats
  const verificationStatus = useMemo(() => {
    if (!stats) return null;
    const byAction = stats.decisions_by_action || {};
    return {
      allowed: byAction.ALLOW || 0,
      blocked: byAction.BLOCK || 0,
      review: byAction.REVIEW || 0,
      upgrade: byAction.UPGRADE_REQUIRED || 0,
      stepUp: byAction.STEP_UP || 0,
      frozen: byAction.FREEZE || 0,
    };
  }, [stats]);

  // Business vs individual breakdown
  const entityBreakdown = useMemo(() => {
    if (!riskDist?.by_entity_type) return null;
    return {
      individual: riskDist.by_entity_type.INDIVIDUAL || 0,
      business: riskDist.by_entity_type.BUSINESS || 0,
    };
  }, [riskDist]);

  // Business high-risk customers
  const businessHighRisk = useMemo(() => {
    if (!riskDist?.high_risk_customers) return [];
    return riskDist.high_risk_customers.filter((c) => c.entity_type === "BUSINESS");
  }, [riskDist]);

  const totalHighRisk = riskDist?.high_risk_customers?.length || 0;

  return (
    <ClientGuard>
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "RISK", "COMPLIANCE", "EXECUTIVE"]}>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk & Monitoring</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Portfolio risk intelligence, deferred verification backlog, and behavioral anomaly detection
        </p>
      </div>

      {/* Top Stats — 5 cards */}
      {riskLoading || backlogLoading ? (
        <SkeletonStats count={5} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Customers</p>
              <UsersIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{riskDist?.total_customers || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {entityBreakdown?.individual || 0} KYC · {entityBreakdown?.business || 0} KYB
            </p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Risk Score</p>
              <ChartBarSquareIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-amber-500 mt-1">{riskDist?.average_risk_score?.toFixed(1) || "0.0"}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Across all customers</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">High-Risk Accounts</p>
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">{totalHighRisk}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{businessHighRisk.length} businesses</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Verification Backlog</p>
              <ClockIcon className="h-5 w-5 text-orange-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-orange-500 mt-1">{backlog?.backlog_count || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">T0/B0 pending verification</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Behavioral Anomalies</p>
              <FireIcon className="h-5 w-5 text-rose-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-rose-500 mt-1">{behavioralAlerts.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">BEH_* rule triggers</p>
          </div>
        </div>
      )}

      {/* ── Risk Distribution (left) + Risk Alerts (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution donut */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Risk Distribution</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Customers by risk level with percentage breakdown</p>
          {riskLoading ? (
            <SkeletonCard />
          ) : riskDonutOptions ? (
            <ApexChart type="donut" series={riskDonutOptions.series} options={riskDonutOptions.options} height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-gray-500 dark:text-gray-400 text-sm">
              No customer data yet.
            </div>
          )}
        </div>

        {/* Risk Alerts */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Risk Alerts</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Recent compliance events requiring attention</p>
            </div>
            {(alerts?.count ?? 0) > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                {alerts!.count} alerts
              </span>
            )}
          </div>
          {!alerts?.items?.length ? (
            <div className="flex-1 flex items-center justify-center py-10 text-gray-500 dark:text-gray-400 text-sm">
              No active risk alerts.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-navy-600 overflow-y-auto max-h-[320px]">
              {alerts.items.slice(0, 10).map((alert) => (
                <div key={alert.decision_id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <ActionBadge action={alert.action} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium text-gray-900 dark:text-white truncate">
                      {alert.customer_external_id || alert.customer_id.slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{alert.reason}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <RiskBadge level={alert.risk_level} />
                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-1">{alert.risk_score.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Deferred Verification Status Monitoring ── */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Deferred Verification Status</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Customers onboarded before verification completion — the core deferred KYC cohort
          </p>
        </div>

        {backlogLoading ? (
          <SkeletonCard />
        ) : (
          <div className="p-6 space-y-6">
            {/* 4 status tiles — horizontal row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {VERIFICATION_STATUS_CONFIG.map(({ key, label, icon: Icon, bg, text }) => {
                const count = backlog?.by_status?.[key as keyof typeof backlog.by_status] ?? 0;
                const total = backlog
                  ? backlog.by_status.none + backlog.by_status.pending + backlog.by_status.passed + backlog.by_status.failed
                  : 0;
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
                return (
                  <div key={key} className={`rounded-xl p-4 ${bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${text}`} aria-hidden="true" />
                      <span className={`text-xs font-medium ${text}`}>{label}</span>
                    </div>
                    <p className={`text-3xl font-bold ${text}`}>{count}</p>
                    <p className={`text-sm font-semibold ${text} opacity-80 mt-0.5`}>{pct}%</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">of total</p>
                  </div>
                );
              })}
            </div>

            {/* Stacked percentage bar */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Verification completion rate</p>
              {verificationChartData ? (
                <ApexChart
                  type="bar"
                  series={verificationChartData.series}
                  options={verificationChartData.options}
                  height={160}
                />
              ) : (
                <div className="flex items-center justify-center h-[160px] text-gray-400 text-sm">
                  No verification data yet.
                </div>
              )}
            </div>

            {/* Backlog table — customers waiting longest */}
            {backlog?.backlog && backlog.backlog.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Backlog — Oldest First ({backlog.backlog_count} customers)
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-navy-600">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Customer</th>
                        <th className="px-4 py-2.5 font-medium">Type</th>
                        <th className="px-4 py-2.5 font-medium">Tier</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium">Workflow</th>
                        <th className="px-4 py-2.5 font-medium">Risk</th>
                        <th className="px-4 py-2.5 font-medium">Waiting</th>
                        <th className="px-4 py-2.5 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                      {backlog.backlog.map((c) => {
                        const statusCfg = VERIFICATION_STATUS_CONFIG.find((s) => s.key === c.verification_status);
                        const isUrgent = c.days_waiting > 3;
                        return (
                          <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors ${isUrgent ? "bg-red-50/30 dark:bg-red-900/10" : ""}`}>
                            <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-white">{c.external_id}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                c.entity_type === "BUSINESS"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-navy-600 dark:text-gray-400"
                              }`}>
                                {c.entity_type === "BUSINESS" ? "KYB" : "KYC"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5"><TierBadge tier={c.current_tier} /></td>
                            <td className="px-4 py-2.5">
                              {statusCfg && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusCfg.badge}`}>
                                  {statusCfg.label}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">
                              {c.pending_workflow || "—"}
                              {c.pending_target_tier && <span className="ml-1 text-gray-400">→{c.pending_target_tier}</span>}
                            </td>
                            <td className="px-4 py-2.5"><RiskBadge level={c.risk_level} /></td>
                            <td className="px-4 py-2.5">
                              <span className={`font-medium ${c.days_waiting > 3 ? "text-red-600 dark:text-red-400" : c.days_waiting > 1 ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-300"}`}>
                                {c.days_waiting < 1
                                  ? `${Math.round(c.days_waiting * 24)}h`
                                  : `${c.days_waiting.toFixed(1)}d`}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <Link href={`/dashboard/customers/${c.external_id}`} className="text-primary text-[10px] font-medium hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Decision Trend ── */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Decision Trend</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Daily decision activity (last 7 days)</p>
        {hourlyLoading ? (
          <SkeletonCard />
        ) : trendChartData ? (
          <ApexChart type="area" series={trendChartData.series} options={trendChartData.options} height={220} />
        ) : (
          <div className="flex items-center justify-center h-[220px] text-gray-500 dark:text-gray-400 text-sm">
            No activity data yet. Make API calls to see trends.
          </div>
        )}
      </div>

      {/* ── Customer Segmentation + Rule Categories ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Segmentation */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Customer Segmentation</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Portfolio breakdown by type and decision outcomes (30d)</p>
          <div className="space-y-4">
            {/* KYC vs KYB */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">KYC Individuals</p>
                <p className="text-2xl font-bold text-primary mt-1">{entityBreakdown?.individual || 0}</p>
                <p className="text-[10px] text-gray-400 mt-1">T0–T3 tiers</p>
              </div>
              <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">KYB Businesses</p>
                <p className="text-2xl font-bold text-blue-500 mt-1">{entityBreakdown?.business || 0}</p>
                <p className="text-[10px] text-gray-400 mt-1">B0–B3 tiers</p>
              </div>
            </div>
            {/* Decision status grid */}
            {verificationStatus && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Allowed", value: verificationStatus.allowed, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
                  { label: "Blocked", value: verificationStatus.blocked, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
                  { label: "Review", value: verificationStatus.review, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
                  { label: "Upgrade Req.", value: verificationStatus.upgrade, color: "text-navy dark:text-primary", bg: "bg-primary-50 dark:bg-primary-900/20" },
                  { label: "Step Up", value: verificationStatus.stepUp, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
                  { label: "Frozen", value: verificationStatus.frozen, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900/20" },
                ].map((s) => (
                  <div key={s.label} className={`text-center p-2 rounded-lg ${s.bg}`}>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rule Category Distribution */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Rule Triggers by Category</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Last 30 days</p>
          {rulesLoading ? (
            <SkeletonCard />
          ) : categoryChartData ? (
            <ApexChart type="bar" series={categoryChartData.series} options={categoryChartData.options} height={240} />
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-500 dark:text-gray-400 text-sm">
              No rule analytics yet.
            </div>
          )}
        </div>
      </div>

      {/* ── High-Risk Accounts + Business Risk Classification ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All High-Risk Accounts */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              High-Risk Accounts ({totalHighRisk})
            </h2>
            <ShieldExclamationIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
          {riskLoading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : !riskDist?.high_risk_customers?.length ? (
            <div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
              No high-risk customers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium">Tier</th>
                    <th className="px-4 py-2.5 font-medium">Risk</th>
                    <th className="px-4 py-2.5 font-medium">Score</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {riskDist.high_risk_customers.slice(0, 8).map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-gray-900 dark:text-white">{c.external_id}</span>
                        <span className={`ml-1.5 px-1 py-0.5 text-[9px] font-medium rounded ${
                          c.entity_type === "BUSINESS"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 dark:bg-navy-600 dark:text-gray-400"
                        }`}>
                          {c.entity_type === "BUSINESS" ? "KYB" : "KYC"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><TierBadge tier={c.current_tier} /></td>
                      <td className="px-4 py-2.5"><RiskBadge level={c.risk_level} /></td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-white font-bold">{c.risk_score.toFixed(1)}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/dashboard/customers/${c.external_id}`} className="text-primary text-[10px] font-medium hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Business Risk Classification */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Business Risk Classification ({businessHighRisk.length})
            </h2>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-medium">KYB</span>
          </div>
          {riskLoading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : !businessHighRisk.length ? (
            <div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
              No high-risk businesses found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Business ID</th>
                    <th className="px-4 py-2.5 font-medium">Tier</th>
                    <th className="px-4 py-2.5 font-medium">Risk</th>
                    <th className="px-4 py-2.5 font-medium">Score</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {businessHighRisk.slice(0, 8).map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-white">{c.external_id}</td>
                      <td className="px-4 py-2.5"><TierBadge tier={c.current_tier} /></td>
                      <td className="px-4 py-2.5"><RiskBadge level={c.risk_level} /></td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-white font-bold">{c.risk_score.toFixed(1)}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/dashboard/customers/${c.external_id}`} className="text-primary text-[10px] font-medium hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Top Triggered Rules ── */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top Triggered Rules (30d)</h2>
        </div>
        {rulesLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : !ruleAnalytics?.top_rules?.length ? (
          <div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
            No rule triggers recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Rule</th>
                  <th className="px-6 py-3 font-medium">Hits</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                  <th className="px-6 py-3 font-medium w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {ruleAnalytics.top_rules.slice(0, 8).map((rule) => {
                  const maxCount = ruleAnalytics.top_rules[0]?.count || 1;
                  const pct = (rule.count / maxCount) * 100;
                  return (
                    <tr key={rule.code} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-3 font-mono font-semibold text-gray-900 dark:text-white">{rule.code}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">{rule.count}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(rule.actions || {}).slice(0, 2).map(([action, count]) => (
                            <span key={action} className="text-xs">
                              <ActionBadge action={action} /> <span className="text-gray-400">({count})</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-full bg-gray-200 dark:bg-navy-600 rounded-full h-1.5">
                          <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Behavioral Risk Indicators ── */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FireIcon className="h-5 w-5 text-orange-500" aria-hidden="true" />
              Behavioral Risk Indicators
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Multiple identity attempts · Suspicious onboarding patterns · Document anomalies
            </p>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{behavioralAlerts.length} signals</span>
        </div>
        {!behavioralAlerts.length ? (
          <div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
            No behavioral anomalies detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Signal Type</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Risk</th>
                  <th className="px-6 py-3 font-medium">Score</th>
                  <th className="px-6 py-3 font-medium">Reason</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {behavioralAlerts.slice(0, 10).map((alert) => {
                  const behRules = (alert.triggered_rules || []).filter((r) => r.startsWith("BEH_"));
                  const signalLabel = behRules.length > 0
                    ? (BEHAVIORAL_SIGNAL_LABELS[behRules[0]] || behRules[0])
                    : "Behavioral anomaly";
                  return (
                    <tr key={alert.decision_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] rounded font-mono">
                            {behRules[0] || "BEH"}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">{signalLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3"><ActionBadge action={alert.action} /></td>
                      <td className="px-6 py-3"><RiskBadge level={alert.risk_level} /></td>
                      <td className="px-6 py-3 text-gray-900 dark:text-white">{alert.risk_score.toFixed(1)}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300 max-w-[180px] truncate">{alert.reason}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/dashboard/compliance/${alert.decision_id}`} className="text-primary text-[10px] font-medium hover:underline">
                          Investigate
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </RoleGuard>
    </ClientGuard>
  );
}
