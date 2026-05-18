"use client";

import Link from "next/link";
import { useState } from "react";
import { useListRulesQuery } from "@/redux/slices/api/rulesApi";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import type { RuleStatus, RuleCategory } from "@/types/api";

const STATUS_TABS: RuleStatus[] = ["DRAFT", "SHADOW", "PRODUCTION", "ARCHIVED"];

export default function RulesPage() {
  const [status, setStatus] = useState<RuleStatus>("PRODUCTION");
  const [category, setCategory] = useState<RuleCategory | "">("");
  const [enabledOnly, setEnabledOnly] = useState(false);

  const { data, isLoading, error } = useListRulesQuery({
    status,
    category: category || undefined,
    enabled_only: enabledOnly || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Rules</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          43 detection rules across Amount, Velocity, Behavioural, Network, Africa, Device, and
          Travel Rule. Promotion to PRODUCTION requires four-eyes approval.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              status === s
                ? "bg-primary text-white"
                : "border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
            }`}
          >
            {s}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RuleCategory | "")}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">All categories</option>
            {(["AMOUNT", "VELOCITY", "BEHAVIORAL", "NETWORK", "AFRICA", "DEVICE", "COMPLIANCE"] as RuleCategory[]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={enabledOnly}
              onChange={(e) => setEnabledOnly(e.target.checked)}
            />
            Enabled only
          </label>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={10} cols={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load rules.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No rules in {status}.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Version</th>
                <th className="px-4 py-3 text-left">Enabled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.map((r) => (
                <tr key={r.rule_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/rules/${r.rule_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {r.rule_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.rule_name}</td>
                  <td className="px-4 py-3 text-xs">{r.rule_category}</td>
                  <td className="px-4 py-3">
                    <ActionBadge action={r.severity} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.risk_contribution}</td>
                  <td className="px-4 py-3 text-xs">v{r.version}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.enabled ? (
                      <span className="text-green-600">●</span>
                    ) : (
                      <span className="text-gray-400">○</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
