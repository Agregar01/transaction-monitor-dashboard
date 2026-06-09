"use client";

import { useState } from "react";
import { useListDriftQuery } from "@/redux/slices/api/mlApi";
import { SkeletonTable } from "@/components/Skeleton";
import Pagination from "@/components/Pagination";

export default function DriftPage() {
  const [page, setPage] = useState(1);
  const [driftedOnly, setDriftedOnly] = useState(false);
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useListDriftQuery({
    page,
    page_size: 50,
    days,
    drifted_only: driftedOnly || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Drift Monitoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Daily drift detection reports — feature + prediction drift.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setPage(1);
                  setDays(d);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  days === d
                    ? "bg-primary text-white"
                    : "border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={driftedOnly}
              onChange={(e) => {
                setPage(1);
                setDriftedOnly(e.target.checked);
              }}
            />
            Drifted only
          </label>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load drift reports.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No drift reports in the last {days} days.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Features tested</th>
                <th className="px-4 py-2 text-right">Drifted</th>
                <th className="px-4 py-2 text-right">Critical</th>
                <th className="px-4 py-2 text-left">Feature drift</th>
                <th className="px-4 py-2 text-left">Prediction drift</th>
                <th className="px-4 py-2 text-right">Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((d) => (
                <tr
                  key={d.id}
                  className={
                    d.skipped_insufficient_data
                      ? "opacity-50"
                      : d.drift_detected
                      ? "bg-red-50/50 dark:bg-red-900/10"
                      : ""
                  }
                >
                  <td className="px-4 py-2 text-xs font-mono">
                    {d.report_date ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {d.features_tested ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {d.features_drifted ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {d.critical_features_drifted ?? 0}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {d.skipped_insufficient_data ? (
                      <span className="text-gray-400">{d.skip_reason ?? "skipped"}</span>
                    ) : d.feature_drift_detected ? (
                      <span className="text-red-600 font-semibold">detected</span>
                    ) : (
                      <span className="text-green-600">stable</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {d.skipped_insufficient_data ? (
                      <span className="text-gray-400">—</span>
                    ) : d.prediction_drift_detected ? (
                      <span className="text-red-600 font-semibold">detected</span>
                    ) : (
                      <span className="text-green-600">stable</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {d.current_sample_count?.toLocaleString() ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data.total}
            noun="drift reports"
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
