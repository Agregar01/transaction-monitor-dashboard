"use client";

import { useState, useMemo } from "react";
import { useGetAnalyticsSummaryQuery } from "@/redux/slices/api/analyticsApi";
import StatCard from "@/components/StatCard";
import RiskComposition from "@/components/RiskComposition";
import QueryState from "@/components/QueryState";
import type { RiskBand } from "@/config/constants";
import {
  ShieldExclamationIcon,
  FunnelIcon,
  DocumentCheckIcon,
  InboxStackIcon,
} from "@heroicons/react/24/outline";

const PERIODS = [30, 60, 90] as const;
const RESOLVED_STATUSES = ["RESOLVED", "CLOSED"];

/** Simple labelled horizontal bar, scaled to the largest value in its group. */
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
      <div className="flex-1 h-5 rounded bg-gray-100 dark:bg-navy-800 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-12 shrink-0 text-right text-sm tabular-nums font-medium text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export default function ExecutiveReportsPage() {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const { data, isLoading, isError, error } = useGetAnalyticsSummaryQuery({ period_days: periodDays });

  const derived = useMemo(() => {
    if (!data) return null;
    const rd = data.risk_distribution;
    const actionable: RiskBand[] = ["FLAG", "STEP_UP", "HOLD", "BLOCK"];
    const exposure = (rd.HOLD ?? 0) + (rd.BLOCK ?? 0);
    const fpRatePct = (data.overall_stats.false_positive_rate ?? 0) * 100;
    const fpTrend = data.alert_trends.map((d) => (d.total ? (d.fp_count / d.total) * 100 : 0));
    const filings = data.str_ctr_totals.str_filed + data.str_ctr_totals.ctr_filed;
    const caseEntries = Object.entries(data.case_breakdown ?? {});
    const casesTotal = caseEntries.reduce((s, [, n]) => s + n, 0);
    const casesResolved = caseEntries
      .filter(([k]) => RESOLVED_STATUSES.includes(k.toUpperCase()))
      .reduce((s, [, n]) => s + n, 0);
    return {
      bands: actionable.map((band) => ({ band, count: rd[band] ?? 0 })),
      cleared: rd.ALLOW ?? 0,
      exposure,
      fpRatePct,
      fpTrend,
      filings,
      caseEntries,
      casesTotal,
      casesResolved,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Executive Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Board-level view of fraud exposure, operational efficiency and regulatory posture.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-navy-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriodDays(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodDays === p
                  ? "bg-white dark:bg-navy-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} rows={4} cols={4}>
        {data && derived && (
          <>
            {/* ── Executive KPIs ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Fraud exposure"
                value={derived.exposure.toLocaleString()}
                subtitle="Transactions in HOLD / BLOCK"
                color="text-red-500"
                icon={<ShieldExclamationIcon className="h-6 w-6" />}
              />
              <StatCard
                title="False-positive rate"
                value={`${derived.fpRatePct.toFixed(1)}%`}
                subtitle="Lower is better"
                color="text-amber-500"
                trend={derived.fpTrend}
                icon={<FunnelIcon className="h-6 w-6" />}
              />
              <StatCard
                title="Regulatory filings"
                value={derived.filings.toLocaleString()}
                subtitle="STR + CTR filed"
                color="text-emerald-500"
                icon={<DocumentCheckIcon className="h-6 w-6" />}
              />
              <StatCard
                title="Cases resolved"
                value={`${derived.casesResolved}/${derived.casesTotal}`}
                subtitle="Resolved / total this period"
                color="text-primary"
                icon={<InboxStackIcon className="h-6 w-6" />}
              />
            </div>

            {/* ── Fraud exposure ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RiskComposition
                title="Fraud exposure by risk band"
                subtitle={`${data.overall_stats.transactions_total.toLocaleString()} transactions · avg risk ${data.overall_stats.avg_risk_score.toFixed(0)}`}
                bands={derived.bands}
                clearedCount={derived.cleared}
              />

              {/* ── Reporting throughput ─────────────────────────────── */}
              <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Regulatory throughput
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Suspicious & cash-threshold reports filed vs. still in draft.
                </p>
                <div className="space-y-3">
                  {(() => {
                    const t = data.str_ctr_totals;
                    const max = Math.max(t.str_filed, t.str_draft, t.ctr_filed, t.ctr_draft, 1);
                    return (
                      <>
                        <Bar label="STR filed" value={t.str_filed} max={max} color="#22c55e" />
                        <Bar label="STR draft" value={t.str_draft} max={max} color="#94a3b8" />
                        <Bar label="CTR filed" value={t.ctr_filed} max={max} color="#22c55e" />
                        <Bar label="CTR draft" value={t.ctr_draft} max={max} color="#94a3b8" />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* ── Operational efficiency: case throughput ───────────── */}
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Operational efficiency — case workload
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Cases by status this period ({derived.casesResolved} of {derived.casesTotal} resolved).
              </p>
              {derived.caseEntries.length === 0 ? (
                <p className="text-sm text-gray-400">No cases in this period.</p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const max = Math.max(...derived.caseEntries.map(([, n]) => n), 1);
                    return derived.caseEntries.map(([status, n]) => (
                      <Bar
                        key={status}
                        label={status}
                        value={n}
                        max={max}
                        color={RESOLVED_STATUSES.includes(status.toUpperCase()) ? "#22c55e" : "#E06030"}
                      />
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* ── Investigator performance — honest gap ─────────────── */}
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-dashed border-gray-200 dark:border-navy-500 p-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Investigator performance
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Per-investigator metrics (cases handled, average resolution time, throughput) need a
                dedicated analyst-performance endpoint, which the backend doesn&apos;t expose yet.
                Tracked as a backend dependency rather than shown with proxy data.
              </p>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
