"use client";

import { useState } from "react";
import { useListDriftQuery } from "@/redux/slices/api/mlApi";
import { SkeletonTable } from "@/components/Skeleton";

export default function DriftPage() {
  const [driftingOnly, setDriftingOnly] = useState(false);
  const { data, isLoading, error } = useListDriftQuery({
    page_size: 100,
    is_drifting: driftingOnly || undefined,
  });

  if (isLoading) return <SkeletonTable rows={8} cols={5} />;

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Drift Monitoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Feature drift detection (KS test + PSI).
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">Drift endpoint not yet exposed</p>
          <p className="mt-1">
            The TMS backend has the <code className="font-mono">DriftDetection</code> table but no
            <code className="font-mono">/api/v1/drift</code> router yet. Tracked in
            <code className="font-mono"> docs/OPEN_ISSUES.md</code> (#1). This page activates once
            the router lands.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Drift Monitoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Per-feature KS p-value + PSI. Rows flagged red when PSI breaches the threshold.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={driftingOnly}
            onChange={(e) => setDriftingOnly(e.target.checked)}
          />
          Drifting only
        </label>
      </div>

      {!data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No drift checks recorded.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Feature</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-right">p-value</th>
                <th className="px-4 py-3 text-right">PSI</th>
                <th className="px-4 py-3 text-left">Drifting</th>
                <th className="px-4 py-3 text-left">Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((d) => (
                <tr
                  key={d.id}
                  className={d.is_drifting ? "bg-red-50/50 dark:bg-red-900/10" : ""}
                >
                  <td className="px-4 py-3 font-mono text-xs">{d.feature_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.model_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{d.p_value.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{d.psi.toFixed(4)}</td>
                  <td className="px-4 py-3 text-xs">
                    {d.is_drifting ? (
                      <span className="text-red-600 font-semibold">⚠ drifting</span>
                    ) : (
                      <span className="text-green-600">stable</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(d.check_timestamp).toLocaleString()}
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
