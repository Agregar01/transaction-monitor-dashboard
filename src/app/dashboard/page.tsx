"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useAppSelector } from "@/redux/store";
import { useListAlertsQuery } from "@/redux/slices/api/alertsApi";
import { useListCasesQuery } from "@/redux/slices/api/casesApi";
import { useListSTRQuery } from "@/redux/slices/api/strApi";
import { useListApprovalsQuery } from "@/redux/slices/api/approvalsApi";
import StatCard from "@/components/StatCard";
import { SkeletonStats } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { alertPriorityColors } from "@/config/constants";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";
import {
  BellAlertIcon,
  InboxStackIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

// ApexCharts is client-only.
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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
  const { fullName, email, jurisdictionCode, jurisdictionDisplayName } = useAppSelector(
    (s) => s.auth,
  );
  const displayName = fullName || email || "Analyst";

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

  const isLoading = !openAlerts && !alertsLast14d;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Welcome, {displayName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {jurisdictionDisplayName ?? jurisdictionCode ?? "—"} jurisdiction · Transaction monitoring console
        </p>
      </div>

      {isLoading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Open alerts"
            value={openAlerts?.total ?? 0}
            subtitle="awaiting triage"
            icon={<BellAlertIcon className="h-8 w-8" />}
            color="text-amber-600"
          />
          <StatCard
            title="Immediate (today)"
            value={immediateToday?.total ?? 0}
            subtitle="P0 priority alerts"
            icon={<BellAlertIcon className="h-8 w-8" />}
            color="text-red-600"
          />
          <StatCard
            title="Open cases"
            value={openCases?.total ?? 0}
            subtitle="active investigations"
            icon={<InboxStackIcon className="h-8 w-8" />}
            color="text-blue-600"
          />
          <StatCard
            title="STR drafts / approvals"
            value={`${draftSTR?.total ?? 0} / ${pendingApprovals?.length ?? 0}`}
            subtitle="STR drafts · approvals pending"
            icon={<CheckBadgeIcon className="h-8 w-8" />}
            color="text-purple-600"
          />
        </div>
      )}

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
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
    </div>
  );
}
