"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useGetShadowStatsQuery } from "@/redux/slices/api/shadowApi";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import StatCard from "@/components/StatCard";
import {
  CheckBadgeIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const WINDOWS = [7, 14, 30];

export default function ShadowStatsPage() {
  const [windowDays, setWindowDays] = useState(14);
  const { data, isLoading, error } = useGetShadowStatsQuery({ window_days: windowDays });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Shadow Stats</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Legacy rule engine vs EzRulesEngine over a rolling window.
          </p>
        </div>
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindowDays(w)}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                windowDays === w
                  ? "bg-primary text-white"
                  : "border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <>
          <SkeletonStats count={4} />
          <SkeletonTable rows={8} cols={4} />
        </>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load shadow stats.
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Transactions"
              value={data.total_evaluated.toLocaleString()}
              subtitle={`${windowDays}d window`}
              icon={<PresentationChartLineIcon className="h-8 w-8" />}
            />
            <StatCard
              title="Agreement"
              value={
                data.agreement_rate == null
                  ? "—"
                  : `${(data.agreement_rate * 100).toFixed(1)}%`
              }
              subtitle="legacy vs ezrules outcome"
              icon={<ArrowsRightLeftIcon className="h-8 w-8" />}
              color={
                data.agreement_rate != null && data.agreement_rate >= 0.95
                  ? "text-green-600"
                  : "text-amber-600"
              }
            />
            <StatCard
              title="Equivalence"
              value={
                data.equivalence_rate == null
                  ? "—"
                  : `${(data.equivalence_rate * 100).toFixed(1)}%`
              }
              subtitle="rule-set equivalence"
              icon={<ChartBarIcon className="h-8 w-8" />}
              color={
                data.equivalence_rate != null && data.equivalence_rate >= 0.95
                  ? "text-green-600"
                  : "text-amber-600"
              }
            />
            <StatCard
              title="Promotion ready"
              value={data.promotion_ready ? "Yes" : "Not yet"}
              subtitle={data.promotion_ready ? "thresholds met" : "needs more data or alignment"}
              icon={<CheckBadgeIcon className="h-8 w-8" />}
              color={data.promotion_ready ? "text-green-600" : "text-gray-400"}
            />
          </div>

          {/* Promotion gate — agreement & equivalence vs the 95% threshold
              (performance-vs-target bullet bars), so "promotion ready" is legible. */}
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Promotion gate
              </h2>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  data.promotion_ready
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {data.promotion_ready ? "Ready to promote" : "Not ready"}
              </span>
            </div>
            <div className="space-y-4">
              {([
                { label: "Agreement", rate: data.agreement_rate },
                { label: "Equivalence", rate: data.equivalence_rate },
              ] as const).map(({ label, rate }) => {
                const pct = rate == null ? 0 : rate * 100;
                const pass = rate != null && rate >= 0.95;
                return (
                  <div key={label}>
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300">{label}</span>
                      <span className={`font-mono font-semibold ${pass ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {rate == null ? "—" : `${pct.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-gray-100 dark:bg-navy-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pass ? "bg-green-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                      {/* 95% promotion threshold marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-500 dark:bg-gray-300"
                        style={{ left: "95%" }}
                        title="Promotion threshold: 95%"
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 dark:text-gray-500">Marker = 95% promotion threshold.</p>
            </div>
          </section>

          {data.per_rule_stats.length > 0 && (() => {
            // The delta is the story: where do the engines diverge? A diverging
            // horizontal bar sorted by Δ surfaces the divergent rules directly,
            // far better than eyeballing the gap between two side-by-side bars.
            const sorted = [...data.per_rule_stats].sort((a, b) => b.delta - a.delta);
            const divergent = sorted.filter((d) => d.delta !== 0).length;
            return (
              <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Per-rule divergence (Δ fires)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
                  {divergent} of {sorted.length} rules diverge · bars right = EzRules fires more, left = fewer
                </p>
                <Chart
                  options={{
                    chart: { type: "bar", toolbar: { show: false }, fontFamily: "var(--font-geist-sans), sans-serif" },
                    xaxis: { categories: sorted.map((d) => d.rule_id) },
                    plotOptions: {
                      bar: {
                        horizontal: true,
                        borderRadius: 3,
                        barHeight: "70%",
                        colors: {
                          ranges: [
                            { from: -1e9, to: -0.0001, color: "#64748b" },
                            { from: 0.0001, to: 1e9, color: "#E06030" },
                          ],
                        },
                      },
                    },
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    grid: { borderColor: "rgba(148,163,184,0.15)" },
                    tooltip: { theme: "dark" },
                    yaxis: { labels: { style: { fontSize: "11px" } } },
                  }}
                  series={[{ name: "Δ fires (EzRules − Legacy)", data: sorted.map((d) => d.delta) }]}
                  type="bar"
                  height={Math.max(240, sorted.length * 26)}
                />
              </section>
            );
          })()}

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
            <header className="px-4 py-3 border-b border-gray-100 dark:border-navy-600 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
              Per-rule delta
            </header>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Rule</th>
                  <th className="px-4 py-2 text-right">Legacy fires</th>
                  <th className="px-4 py-2 text-right">EzRules fires</th>
                  <th className="px-4 py-2 text-right">Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {data.per_rule_stats.map((d) => (
                  <tr key={d.rule_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                    <td className="px-4 py-2 font-mono text-xs">{d.rule_id}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{d.legacy_trigger_count}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{d.ez_trigger_count}</td>
                    <td
                      className={`px-4 py-2 text-right font-mono text-xs ${
                        Math.abs(d.delta) > 5
                          ? "text-red-600 font-semibold"
                          : Math.abs(d.delta) > 1
                          ? "text-amber-600"
                          : "text-gray-500"
                      }`}
                    >
                      {d.delta > 0 ? "+" : ""}
                      {d.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
