"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import {
  useGetAnalyticsSummaryQuery,
  useGetRuleThresholdStatsQuery,
  useGetTransactionClustersQuery,
  useGetInsiderThreatReportQuery,
} from "@/redux/slices/api/analyticsApi";
import { SkeletonStats } from "@/components/Skeleton";
import StatCard from "@/components/StatCard";
import { useAppSelector } from "@/redux/store";
import { currencyForJurisdiction, formatMoney } from "@/lib/currency";
import {
  BellAlertIcon,
  InboxStackIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PERIODS = [7, 14, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const RISK_COLORS: Record<string, string> = {
  ALLOW:   "#22c55e",
  FLAG:    "#eab308",
  STEP_UP: "#f59e0b",
  HOLD:    "#f97316",
  BLOCK:   "#ef4444",
};

const RECO_META: Record<string, { label: string; cls: string }> = {
  increase_threshold: { label: "Raise threshold", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  review_rule:        { label: "Review rule",     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  monitor:            { label: "Monitor",         cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  well_calibrated:    { label: "Well calibrated", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>(30);
  const jurisdictionCode = useAppSelector((s) => s.auth.jurisdictionCode);
  const currency = currencyForJurisdiction(jurisdictionCode);

  const { data, isLoading } = useGetAnalyticsSummaryQuery(
    { period_days: period },
    { pollingInterval: 120_000 },
  );
  const { data: thresholdStats } = useGetRuleThresholdStatsQuery({ period_days: period });
  const { data: clusters } = useGetTransactionClustersQuery({});
  const { data: insiderThreat } = useGetInsiderThreatReportQuery({ period_days: period });

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
    const dist = data?.risk_distribution ?? { ALLOW: 0, FLAG: 0, STEP_UP: 0, HOLD: 0, BLOCK: 0 };
    const order = ["ALLOW", "FLAG", "STEP_UP", "HOLD", "BLOCK"] as const;
    // Computed over all transactions (combined_risk_score); show only the bands
    // that actually carry volume rather than rendering empty slices.
    const present = order.filter((k) => (dist[k] ?? 0) > 0);
    return {
      labels: present,
      series: present.map((k) => dist[k]),
      colors: present.map((k) => RISK_COLORS[k]),
      total: order.reduce((s, k) => s + (dist[k] ?? 0), 0),
    };
  }, [data]);

  // Latest window the rule-threshold job actually covered — surfaced so an empty
  // or sparse panel reads as "job hasn't run", not "feature broken" (D1).
  const thresholdAsOf = useMemo(() => {
    const ends = (thresholdStats ?? [])
      .map((s) => s.period_end)
      .filter((d): d is string => Boolean(d))
      .sort();
    return ends.length ? ends[ends.length - 1] : null;
  }, [thresholdStats]);

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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Risk distribution
          </h2>
          <p className="text-xs text-gray-400 mb-4 mt-0.5">
            all transactions by decision band · last {period} days
          </p>
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
                          label: "Total",
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

      {/* Rule tuning recommendations + transaction clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rule threshold recommendations */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Rule tuning recommendations
            </h2>
            {thresholdAsOf && (
              <span className="text-xs text-gray-400">
                as of {new Date(thresholdAsOf).toLocaleDateString()}
              </span>
            )}
          </div>
          {!thresholdStats || thresholdStats.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No threshold analysis yet — computed by a nightly job.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-navy-600">
              {thresholdStats.slice(0, 8).map((s) => {
                const meta = RECO_META[s.recommendation] ?? { label: s.recommendation, cls: "bg-gray-100 text-gray-700" };
                return (
                  <li key={s.rule_id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-primary truncate">{s.rule_id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {s.total_triggers} triggers · {(s.false_positive_rate * 100).toFixed(0)}% FP
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Transaction clusters */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Transaction clusters
            </h2>
            {clusters?.run_date && (
              <span className="text-xs text-gray-400">{new Date(clusters.run_date).toLocaleDateString()}</span>
            )}
          </div>
          {!clusters || clusters.clusters.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No clustering run available.</div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {clusters.total_clustered.toLocaleString()} clustered · {clusters.noise_count.toLocaleString()} noise
              </p>
              <ul className="divide-y divide-gray-100 dark:divide-navy-600">
                {clusters.clusters
                  .filter((c) => !c.is_noise)
                  .slice(0, 8)
                  .map((c) => (
                    <li key={c.cluster_label} className="py-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-900 dark:text-white">Cluster #{c.cluster_label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {c.count.toLocaleString()} txns · avg {formatMoney(c.avg_amount, currency)}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {/* M2 — Insider threat signals */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Insider threat signals
          </h2>
          {insiderThreat && (
            <span className="text-xs text-gray-400">
              {insiderThreat.total_actions.toLocaleString()} audit actions · {insiderThreat.unique_actors} actors
            </span>
          )}
        </div>
        {!insiderThreat ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bulk actors */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                High-volume actors (&gt;2σ)
              </h3>
              {insiderThreat.bulk_actors.length === 0 ? (
                <p className="text-xs text-gray-400">None flagged.</p>
              ) : (
                <ul className="space-y-1">
                  {insiderThreat.bulk_actors.map((u) => (
                    <li key={u.user_id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                        {u.user_id.slice(0, 8)}…
                      </span>
                      <span className="font-medium text-red-600">{u.action_count} actions</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Off-hours access */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Off-hours access (UTC)
              </h3>
              {insiderThreat.off_hours_access.length === 0 ? (
                <p className="text-xs text-gray-400">None flagged.</p>
              ) : (
                <ul className="space-y-1">
                  {insiderThreat.off_hours_access.slice(0, 5).map((u) => (
                    <li key={u.user_id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                        {u.user_id.slice(0, 8)}…
                      </span>
                      <span className="font-medium text-amber-600">{u.off_hours_count} actions</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Self-approvals + sensitive access */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Self-approval signals
              </h3>
              {insiderThreat.self_approval_signals.length === 0 ? (
                <p className="text-xs text-gray-400">None detected.</p>
              ) : (
                <ul className="space-y-1">
                  {insiderThreat.self_approval_signals.slice(0, 5).map((u) => (
                    <li key={u.user_id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                        {u.user_id.slice(0, 8)}…
                      </span>
                      <span className="font-medium text-orange-600">{u.self_approve_count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
