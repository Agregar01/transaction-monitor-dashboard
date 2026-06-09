"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useListCustomersQuery } from "@/redux/slices/api/customersApi";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import DonutCard from "@/components/DonutCard";
import Pagination from "@/components/Pagination";
import type { RiskLevel } from "@/types/api";
import { CUSTOMER_RISK_LEVELS } from "@/config/constants";

const RISK_LEVELS: RiskLevel[] = [...CUSTOMER_RISK_LEVELS];

const RISK_LEVEL_COLORS: Record<string, string> = {
  Low: "#22c55e",
  Medium: "#f59e0b",
  High: "#ef4444",
};

const CATEGORY_PALETTE = ["#14b8a6", "#2563eb", "#f59e0b", "#7c3aed", "#ec4899"];

export default function CustomersListPage() {
  const [page, setPage] = useState(1);
  const [riskLevel, setRiskLevel] = useState<RiskLevel | "">("");
  const [country, setCountry] = useState("");
  const [pepOnly, setPepOnly] = useState(false);

  const { data, isLoading, error } = useListCustomersQuery({
    page,
    page_size: 20,
    risk_level: riskLevel || undefined,
    country_code: country || undefined,
    is_pep: pepOnly || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  // Portfolio breakdowns from a larger recent sample, independent of filters.
  const { data: sample } = useListCustomersQuery({ page_size: 100 });

  const riskLevelBreakdown = useMemo(() => {
    const counts = {} as Record<RiskLevel, number>;
    for (const lvl of RISK_LEVELS) counts[lvl] = 0;
    for (const c of sample?.items ?? []) {
      if (c.risk_level in counts) counts[c.risk_level] += 1;
    }
    const labels = RISK_LEVELS.filter((l) => counts[l] > 0);
    return {
      labels: labels.map((l) => l.replace(/_/g, " ")),
      series: labels.map((l) => counts[l]),
      colors: labels.map((l) => RISK_LEVEL_COLORS[l]),
    };
  }, [sample]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of sample?.items ?? []) counts[c.customer_type] = (counts[c.customer_type] ?? 0) + 1;
    const labels = Object.keys(counts);
    return {
      labels,
      series: labels.map((l) => counts[l]),
      colors: labels.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]),
    };
  }, [sample]);

  const sampleSize = sample?.items.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Customers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customer directory with risk score, PEP flag, and country of residence.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Risk level
          </label>
          <select
            aria-label="Filter by risk level"
            value={riskLevel}
            onChange={(e) => {
              setPage(1);
              setRiskLevel(e.target.value as RiskLevel | "");
            }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">Any</option>
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Country
          </label>
          <input
            type="text"
            aria-label="Filter by country"
            value={country}
            onChange={(e) => {
              setPage(1);
              setCountry(e.target.value.toUpperCase());
            }}
            placeholder="GH, NG, KE…"
            maxLength={3}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={pepOnly}
            onChange={(e) => {
              setPage(1);
              setPepOnly(e.target.checked);
            }}
          />
          PEP only
        </label>
      </div>

      {sampleSize > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutCard
            title="By risk level"
            subtitle={`Recent ${sampleSize} customers`}
            labels={riskLevelBreakdown.labels}
            series={riskLevelBreakdown.series}
            colors={riskLevelBreakdown.colors}
          />
          <DonutCard
            title="By customer type"
            subtitle={`Recent ${sampleSize} customers`}
            labels={typeBreakdown.labels}
            series={typeBreakdown.series}
            colors={typeBreakdown.colors}
          />
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load customers.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No customers match the filters.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Customer ID</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Risk</th>
                <th className="px-4 py-2 text-left">Score</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">PEP</th>
                <th className="px-4 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((c) => (
                <tr key={c.customer_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/customers/${c.customer_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {c.customer_id}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs">{c.customer_type}</td>
                  <td className="px-4 py-2">
                    <ActionBadge action={c.risk_level} />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{c.risk_score.toFixed(1)}</td>
                  <td className="px-4 py-2 text-xs">{c.country_code ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {c.is_pep ? (
                      <span className="text-amber-600 font-semibold">PEP</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data.total}
            noun="customers"
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
