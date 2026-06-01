"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { useGetAnalyticsSummaryQuery } from "@/redux/slices/api/analyticsApi";
import { SkeletonStats } from "@/components/Skeleton";
import StatCard from "@/components/StatCard";
import {
  BellAlertIcon,
  InboxStackIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PERIODS = [7, 14, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const RISK_COLORS: Record<string, string> = {
  ALLOW: "#22c55e",
  FLAG:  "#f59e0b",
  HOLD:  "#f97316",
  BLOCK: "#ef4444",
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>(30);

  const { data, isLoading } = useGetAnalyticsSummaryQuery(
    { period_days: period },
    { pollingInterval: 120_000 },
  );

  const alertTrendSeries = useMemo(() => {
    const rows = data?.alert_trends ?? [];
    return {
      categories: rows.map((r) => r.date.slice(5)),
      series: [
        { name: "Total alerts", data: rows.map((r) => r.total) },
        { name: "Immediate", data: rows.map((r) => r.immediate_count) },
        { name: "False positives", data: rows.map((r) => r.fp_count) },
      ],
    };
  }, [data]);

  const riskDist = useMemo(() => {
    const dist = data?.risk_distribution ?? { ALLOW: 0, FLAG: 0, HOLD: 0, BLOCK: 0 };
    const order = ["ALLOW", "FLAG", "HOLD", "BLOCK"] as const;
    return {
      labels: [...order],
      series: order.map((k) => dist[k]),
      colors: order.map((k) => RISK_COLORS[k]),
      total: order.reduce((s, k) => s + dist[k], 0),
    };
  }, [data]);

  const caseSeries = useMemo(() => {
    const bd = data?.case_breakdown ?? {};
    const keys = Object.keys(bd).sort();
    return { labels: keys, series: keys.map((k) => bd[k]) };
  }, [data]);

  const topRules = useMemo(() => data?.top_rules ?? [], [data]);

  const stats = data?.overall_stats;
  const strCtr = data?.str_ctr_totals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fraud trends, risk distribution, and filing summaries
          </p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-navy-700 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? "bg-white dark:bg-navy-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      {isLoading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Transactions"
            value={(stats?.transactions_total ?? 0).toLocaleString()}
            subtitle={`last ${period} days`}
            icon={<BellAlertIcon className="h-8 w-8" />}
            color="text-blue-600"
          />
          <StatCard
            title="Alerts"
            value={(stats?.alerts_total ?? 0).toLocaleString()}
            subtitle={`last ${period} days`}
            icon={<BellAlertIcon className="h-8 w-8" />}
            color="text-amber-600"
          />
          <StatCard
            title="FP Rate"
            value={`${((stats?.false_positive_rate ?? 0) * 100).toFixed(1)}%`}
            subtitle="false positives"
            icon={<ShieldCheckIcon className="h-8 w-8" />}
            color={(stats?.false_positive_rate ?? 0) > 0.3 ? "text-red-600" : "text-emerald-600"}
          />
          <StatCard
            title="Avg Risk Score"
            value={Math.round(stats?.avg_risk_score ?? 0)}
            subtitle="across all alerts"
            icon={<InboxStackIcon className="h-8 w-8" />}
            color="text-purple-600"
          />
        </div>
      )}

      {/* STR / CTR summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "STR Filed", value: strCtr?.str_filed ?? 0, color: "text-emerald-600" },
          { label: "STR Draft", value: strCtr?.str_draft ?? 0, color: "text-amber-600" },
          { label: "CTR Filed", value: strCtr?.ctr_filed ?? 0, color: "text-emerald-600" },
          { label: "CTR Draft", value: strCtr?.ctr_draft ?? 0, color: "text-amber-600" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4"
          >
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {item.label}
            </p>
            <p className={`text-2xl font-semibold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Alert trend + risk distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Alert trend — last {period} days
          </h2>
          {alertTrendSeries.categories.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No data for this period.</div>
          ) : (
            <Chart
              options={{
                chart: { type: "line", toolbar: { show: false }, fontFamily: "var(--font-geist-sans), sans-serif" },
                xaxis: { categories: alertTrendSeries.categories },
                colors: ["#6366f1", "#ef4444", "#f59e0b"],
                stroke: { curve: "smooth", width: 2 },
                legend: { position: "top", horizontalAlign: "right" },
                dataLabels: { enabled: false },
                grid: { borderColor: "rgba(148,163,184,0.15)" },
                tooltip: { theme: "dark" },
                yaxis: { labels: { style: { colors: "#94a3b8" } } },
              }}
              series={alertTrendSeries.series}
              type="line"
              height={260}
            />
          )}
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Risk distribution
          </h2>
          {riskDist.total === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No data.</div>
          ) : (
            <Chart
              options={{
                chart: { type: "donut", fontFamily: "var(--font-geist-sans), sans-serif" },
                labels: riskDist.labels,
                colors: riskDist.colors,
                legend: { position: "bottom", labels: { colors: "#94a3b8" } },
                dataLabels: { enabled: false },
                stroke: { width: 0 },
                tooltip: { theme: "dark" },
                plotOptions: {
                  pie: {
                    donut: {
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: "Alerts",
                          color: "#94a3b8",
                          formatter: () => String(riskDist.total),
                        },
                      },
                    },
                  },
                },
              }}
              series={riskDist.series}
              type="donut"
              height={260}
            />
          )}
        </div>
      </div>

      {/* Case breakdown + Top rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case breakdown */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Case status breakdown
          </h2>
          {caseSeries.labels.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No cases.</div>
          ) : (
            <Chart
              options={{
                chart: { type: "bar", toolbar: { show: false }, fontFamily: "var(--font-geist-sans), sans-serif" },
                xaxis: { categories: caseSeries.labels },
                colors: ["#6366f1"],
                plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", horizontal: false } },
                dataLabels: { enabled: false },
                grid: { borderColor: "rgba(148,163,184,0.15)" },
                tooltip: { theme: "dark" },
                yaxis: { labels: { style: { colors: "#94a3b8" } } },
              }}
              series={[{ name: "Cases", data: caseSeries.series }]}
              type="bar"
              height={240}
            />
          )}
        </div>

        {/* Top rules */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Top triggered rules (by volume)
          </h2>
          {topRules.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No rule performance data yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-navy-600">
              {topRules.slice(0, 8).map((r) => (
                <li key={r.rule_id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-primary truncate">{r.rule_id}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {r.total_triggers} triggers ·{" "}
                      <span
                        className={
                          r.false_positive_rate >= 0.5
                            ? "text-red-500"
                            : r.false_positive_rate >= 0.3
                            ? "text-amber-500"
                            : "text-emerald-600"
                        }
                      >
                        {(r.false_positive_rate * 100).toFixed(0)}% FP
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 w-20 bg-gray-100 dark:bg-navy-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{
                        width: `${Math.min(100, (r.total_triggers / (topRules[0]?.total_triggers || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
