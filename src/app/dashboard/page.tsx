"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, type ReactNode } from "react";
import { useAppSelector } from "@/redux/store";
import { useListAlertsQuery } from "@/redux/slices/api/alertsApi";
import { useListCasesQuery } from "@/redux/slices/api/casesApi";
import { useListSTRQuery } from "@/redux/slices/api/strApi";
import { useListApprovalsQuery } from "@/redux/slices/api/approvalsApi";
import { useListTransactionsQuery } from "@/redux/slices/api/transactionsApi";
import { useGetAnalyticsSummaryQuery } from "@/redux/slices/api/analyticsApi";
import {
  useListChampionsQuery,
  useGetLatestDriftQuery,
} from "@/redux/slices/api/mlApi";
import StatCard from "@/components/StatCard";
import { SkeletonStats } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import DonutCard from "@/components/DonutCard";
import { alertPriorityColors, riskBand, riskBandColors, type RiskBand } from "@/config/constants";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";
import {
  BellAlertIcon,
  InboxStackIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// ApexCharts is client-only.
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Which landing variant a user sees, derived from their RBAC roles. A user may
// hold several roles; we pick the most operationally-specific one (first match).
type Persona = "admin" | "compliance" | "ml" | "analyst" | "default";

function pickPersona(roles: string[]): Persona {
  const order: [string, Persona][] = [
    ["SYSTEM_ADMIN", "admin"],
    ["COMPLIANCE_OFFICER", "compliance"],
    ["ML_ENGINEER", "ml"],
    ["SENIOR_ANALYST", "analyst"],
    ["ANALYST", "analyst"],
  ];
  for (const [role, persona] of order) {
    if (roles.includes(role)) return persona;
  }
  return "default";
}

const PERSONA_META: Record<Persona, { title: string; blurb: string }> = {
  admin: { title: "System Overview", blurb: "Platform-wide monitoring" },
  compliance: { title: "Compliance Overview", blurb: "Approvals, STR filing & case oversight" },
  ml: { title: "Model Operations", blurb: "Risk-scoring model health & drift" },
  analyst: { title: "My Triage Queue", blurb: "Alerts and cases needing review" },
  default: { title: "Overview", blurb: "Transaction monitoring console" },
};

type Kpi = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  color: string;
};

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysBack(n: number): string[] {
  const today = startOfDay(new Date());
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

export default function DashboardOverviewPage() {
  const { fullName, email, roles, jurisdictionCode, jurisdictionDisplayName } =
    useAppSelector((s) => s.auth);
  const displayName = fullName || email || "Analyst";
  const persona = useMemo(() => pickPersona(roles), [roles]);
  const meta = PERSONA_META[persona];
  const primaryRole = roles[0] ?? "READONLY";

  // Pull a generous window of recent alerts for KPI math + the 14-day chart.
  const fourteenDaysAgo = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - 13);
    return d.toISOString();
  }, []);

  const todayIso = useMemo(() => startOfDay(new Date()).toISOString(), []);

  const fastPoll = useVisiblePolling(10000);
  const slowPoll = useVisiblePolling(30000);
  const mediumPoll = useVisiblePolling(15000);

  const { data: openAlerts } = useListAlertsQuery(
    { status: "OPEN", page_size: 10 },
    { pollingInterval: fastPoll },
  );

  const { data: alertsLast14d } = useListAlertsQuery(
    { start_date: fourteenDaysAgo, page_size: 500 },
    { pollingInterval: slowPoll },
  );

  const { data: immediateToday } = useListAlertsQuery({
    priority: "IMMEDIATE",
    start_date: todayIso,
    page_size: 1,
  });

  const { data: openCases } = useListCasesQuery(
    { status: "OPEN", page_size: 1 },
    { pollingInterval: slowPoll },
  );

  const { data: draftSTR } = useListSTRQuery({ status: "DRAFT", page_size: 1 });
  // Approvals endpoint returns a bare list, not paginated — derive the count
  // client-side. Safe because the queue is bounded (active four-eyes work).
  const { data: pendingApprovals } = useListApprovalsQuery(
    { approval_status: "PENDING" },
    { pollingInterval: mediumPoll },
  );

  // ML data is only relevant — and only fetched — for the ML persona.
  const isMl = persona === "ml";
  const { data: champions } = useListChampionsQuery(undefined, { skip: !isMl });
  const { data: latestDrift } = useGetLatestDriftQuery(undefined, { skip: !isMl });

  // Real population aggregates — executive strip + risk donut source.
  const { data: analytics } = useGetAnalyticsSummaryQuery({ period_days: 30 });
  const isExec = persona === "admin" || persona === "compliance";

  // Live transaction feed (real-time monitoring fold-in); not for ML persona.
  const { data: liveTxns } = useListTransactionsQuery(
    { page_size: 8 },
    { pollingInterval: fastPoll, skip: isMl },
  );

  // Role-tailored KPI row.
  const kpis = useMemo<Kpi[]>(() => {
    const openAlertsCard: Kpi = {
      title: "Open alerts",
      value: openAlerts?.total ?? 0,
      subtitle: "awaiting triage",
      icon: <BellAlertIcon className="h-8 w-8" />,
      color: "text-amber-600",
    };
    const immediateCard: Kpi = {
      title: "Immediate (today)",
      value: immediateToday?.total ?? 0,
      subtitle: "P0 priority alerts",
      icon: <BellAlertIcon className="h-8 w-8" />,
      color: "text-red-600",
    };
    const openCasesCard: Kpi = {
      title: "Open cases",
      value: openCases?.total ?? 0,
      subtitle: "active investigations",
      icon: <InboxStackIcon className="h-8 w-8" />,
      color: "text-blue-600",
    };
    const approvalsCard: Kpi = {
      title: "Pending approvals",
      value: pendingApprovals?.length ?? 0,
      subtitle: "four-eyes queue",
      icon: <CheckBadgeIcon className="h-8 w-8" />,
      color: "text-purple-600",
    };
    const strCard: Kpi = {
      title: "STR drafts",
      value: draftSTR?.total ?? 0,
      subtitle: "awaiting filing",
      icon: <DocumentTextIcon className="h-8 w-8" />,
      color: "text-emerald-600",
    };

    switch (persona) {
      case "analyst":
        return [openAlertsCard, immediateCard, openCasesCard];
      case "compliance":
        return [approvalsCard, strCard, openCasesCard, openAlertsCard];
      case "ml":
        return [
          {
            title: "Champion models",
            value: champions?.length ?? 0,
            subtitle: "live in production",
            icon: <CpuChipIcon className="h-8 w-8" />,
            color: "text-teal-600",
          },
          {
            title: "Features drifted",
            value: `${latestDrift?.features_drifted ?? 0} / ${latestDrift?.features_tested ?? 0}`,
            subtitle: latestDrift?.report_date
              ? `last check ${latestDrift.report_date.slice(0, 10)}`
              : "no recent check",
            icon: <ExclamationTriangleIcon className="h-8 w-8" />,
            color: "text-amber-600",
          },
          {
            title: "Critical drift",
            value: latestDrift?.critical_features_drifted ?? 0,
            subtitle: "critical features",
            icon: <ExclamationTriangleIcon className="h-8 w-8" />,
            color: "text-red-600",
          },
          {
            title: "Drift status",
            value: latestDrift?.drift_detected ? "Detected" : "Stable",
            subtitle: "champion distribution",
            icon: <ShieldCheckIcon className="h-8 w-8" />,
            color: latestDrift?.drift_detected ? "text-red-600" : "text-emerald-600",
          },
        ];
      case "admin":
      default:
        return [openAlertsCard, immediateCard, openCasesCard, approvalsCard];
    }
  }, [
    persona,
    openAlerts,
    immediateToday,
    openCases,
    pendingApprovals,
    draftSTR,
    champions,
    latestDrift,
  ]);

  // Group the 14-day alerts client-side into priority buckets per day.
  const chartSeries = useMemo(() => {
    const dates = daysBack(14);
    const buckets = {
      IMMEDIATE: Array(14).fill(0),
      BATCH: Array(14).fill(0),
      REVIEW: Array(14).fill(0),
    } as Record<"IMMEDIATE" | "BATCH" | "REVIEW", number[]>;
    for (const a of alertsLast14d?.items ?? []) {
      const day = a.alert_timestamp.slice(0, 10);
      const idx = dates.indexOf(day);
      if (idx >= 0 && a.priority in buckets) {
        buckets[a.priority][idx] += 1;
      }
    }
    return {
      categories: dates.map((d) => d.slice(5)), // MM-DD
      series: [
        { name: "IMMEDIATE", data: buckets.IMMEDIATE },
        { name: "BATCH", data: buckets.BATCH },
        { name: "REVIEW", data: buckets.REVIEW },
      ],
    };
  }, [alertsLast14d]);

  // Alert distribution across the four risk bands. Prefer the real population
  // from /analytics/summary; fall back to bucketing the 14-day sample.
  const riskBreakdown = useMemo(() => {
    const order: RiskBand[] = ["ALLOW", "FLAG", "STEP_UP", "HOLD", "BLOCK"];
    // /analytics/summary computes risk_distribution over ALL transactions
    // (combined_risk_score), so every decision band — including ALLOW — appears.
    // Render only the bands that carry volume so empty slices don't clutter.
    const present = (counts: Record<RiskBand, number>) => order.filter((b) => counts[b] > 0);
    const dist = analytics?.risk_distribution;
    const fromAnalytics: Record<RiskBand, number> = {
      ALLOW: dist?.ALLOW ?? 0,
      FLAG: dist?.FLAG ?? 0,
      STEP_UP: dist?.STEP_UP ?? 0,
      HOLD: dist?.HOLD ?? 0,
      BLOCK: dist?.BLOCK ?? 0,
    };
    const analyticsTotal = order.reduce((sum, b) => sum + fromAnalytics[b], 0);
    if (analyticsTotal > 0) {
      const bands = present(fromAnalytics);
      return {
        labels: bands,
        series: bands.map((b) => fromAnalytics[b]),
        colors: bands.map((b) => riskBandColors[b]),
        total: analyticsTotal,
        caption: "all transactions · last 30 days",
      };
    }
    // Fallback when analytics is unavailable: bucket the recent alert sample.
    const counts: Record<RiskBand, number> = { ALLOW: 0, FLAG: 0, STEP_UP: 0, HOLD: 0, BLOCK: 0 };
    for (const a of alertsLast14d?.items ?? []) {
      counts[riskBand(a.risk_score)] += 1;
    }
    const bands = present(counts);
    return {
      labels: bands,
      series: bands.map((b) => counts[b]),
      colors: bands.map((b) => riskBandColors[b]),
      total: order.reduce((sum, b) => sum + counts[b], 0),
      caption: "recent alerts · last 14 days",
    };
  }, [analytics, alertsLast14d]);

  const isLoading = !openAlerts && !alertsLast14d;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {meta.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {displayName} · {primaryRole} ·{" "}
          {jurisdictionDisplayName ?? jurisdictionCode ?? "—"} · {meta.blurb}
        </p>
      </div>

      {isLoading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <StatCard
              key={k.title}
              title={k.title}
              value={k.value}
              subtitle={k.subtitle}
              icon={k.icon}
              color={k.color}
            />
          ))}
        </div>
      )}

      {/* Executive summary strip — real 30-day aggregates from /analytics/summary. */}
      {isExec && analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Transactions · 30d",
              value: (analytics.overall_stats?.transactions_total ?? 0).toLocaleString(),
              cls: "text-gray-900 dark:text-white",
            },
            {
              label: "False positive rate",
              value: `${((analytics.overall_stats?.false_positive_rate ?? 0) * 100).toFixed(1)}%`,
              cls:
                (analytics.overall_stats?.false_positive_rate ?? 0) > 0.3
                  ? "text-red-600"
                  : "text-emerald-600",
            },
            {
              label: "Avg risk score",
              value: String(Math.round(analytics.overall_stats?.avg_risk_score ?? 0)),
              cls: "text-purple-600",
            },
            {
              label: "STR / CTR filed",
              value: `${analytics.str_ctr_totals?.str_filed ?? 0} / ${analytics.str_ctr_totals?.ctr_filed ?? 0}`,
              cls: "text-emerald-600",
            },
          ].map((t) => (
            <div
              key={t.label}
              className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4"
            >
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t.label}
              </p>
              <p className={`text-2xl font-semibold mt-1 ${t.cls}`}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Alerts — last 14 days, by priority
          </h2>
          <Chart
            options={{
              chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "var(--font-geist-sans), sans-serif" },
              xaxis: { categories: chartSeries.categories },
              colors: [
                alertPriorityColors.IMMEDIATE,
                alertPriorityColors.BATCH,
                alertPriorityColors.REVIEW,
              ],
              plotOptions: { bar: { borderRadius: 3, columnWidth: "60%" } },
              legend: { position: "top", horizontalAlign: "right" },
              dataLabels: { enabled: false },
              grid: { borderColor: "rgba(148,163,184,0.15)" },
              tooltip: { theme: "dark" },
              yaxis: { labels: { style: { colors: "#94a3b8" } } },
            }}
            series={chartSeries.series}
            type="bar"
            height={280}
          />
        </div>

        <DonutCard
          title="Risk band distribution"
          subtitle={riskBreakdown.caption}
          labels={riskBreakdown.labels}
          series={riskBreakdown.series}
          colors={riskBreakdown.colors}
        />
      </div>

      {isMl ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-navy-600">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Champion models
            </h2>
            <Link
              href="/dashboard/models"
              className="text-xs font-medium text-primary hover:underline"
            >
              View registry →
            </Link>
          </div>
          {!champions ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : champions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CpuChipIcon className="h-10 w-10 mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No champion models registered.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-navy-600">
              {champions.map((m) => (
                <li
                  key={m.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CpuChipIcon className="h-4 w-4 text-teal-600 shrink-0" />
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {m.model_type ?? "—"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">v{m.version}</span>
                  </div>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {m.trained_at ? new Date(m.trained_at).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-navy-600">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Recent open alerts
            </h2>
            <Link
              href="/dashboard/alerts"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          {!openAlerts ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : openAlerts.items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <DocumentTextIcon className="h-10 w-10 mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No open alerts. Nice.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-navy-600">
              {openAlerts.items.slice(0, 10).map((a) => (
                <li
                  key={a.alert_id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ActionBadge action={a.priority} />
                    <Link
                      href={`/dashboard/alerts/${a.alert_id}`}
                      className="font-mono text-xs text-primary hover:underline truncate"
                    >
                      {a.alert_id}
                    </Link>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {a.triggered_rules_count}{" "}
                      {a.triggered_rules_count === 1 ? "rule" : "rules"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <RiskBadge score={a.risk_score} />
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {new Date(a.alert_timestamp).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Live transaction feed — polls every 10s while the tab is visible. */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-navy-600">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Live transactions
            </h2>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          {!liveTxns ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : liveTxns.items.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No transactions yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-navy-600">
              {liveTxns.items.slice(0, 8).map((t) => (
                <li
                  key={t.transaction_id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      href={`/dashboard/transactions/${t.transaction_id}`}
                      className="font-mono text-xs text-primary hover:underline truncate"
                    >
                      {t.transaction_id.slice(0, 10)}…
                    </Link>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t.channel}</span>
                    <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                      {t.amount == null ? "—" : Number(t.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <RiskBadge score={t.combined_risk_score} />
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
