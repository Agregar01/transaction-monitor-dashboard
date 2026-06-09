"use client";

import { useState } from "react";
import { useListModelsQuery } from "@/redux/slices/api/mlApi";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import Pagination from "@/components/Pagination";
import type { ModelRegistryEntry } from "@/types/api";

function MetricCell({ metrics, key_ }: { metrics: Record<string, unknown> | null; key_: string }) {
  if (!metrics) return <span className="text-gray-400">—</span>;
  const v = metrics[key_];
  if (v == null) return <span className="text-gray-400">—</span>;
  return <span>{Number(v).toFixed(3)}</span>;
}

function byType(items: ModelRegistryEntry[]) {
  const groups: Record<string, ModelRegistryEntry[]> = {};
  for (const m of items) {
    const key = m.model_type ?? "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return groups;
}

export default function ModelsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useListModelsQuery({ page, page_size: 50 });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">ML Models</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Champion / challenger registry grouped by model family.
        </p>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load models.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No models registered yet.
        </div>
      ) : (
        <>
          {Object.entries(byType(data.items)).map(([type, models]) => (
            <section
              key={type}
              className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden"
            >
              <header className="px-4 py-3 border-b border-gray-100 dark:border-navy-600">
                <h2 className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {type}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {models.length} {models.length === 1 ? "version" : "versions"}
                </p>
              </header>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Version</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">F1</th>
                    <th className="px-4 py-2 text-right">Precision</th>
                    <th className="px-4 py-2 text-right">Recall</th>
                    <th className="px-4 py-2 text-right">Samples</th>
                    <th className="px-4 py-2 text-left">Trained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {models.map((m) => (
                    <tr
                      key={m.id}
                      className={
                        m.status === "CHAMPION"
                          ? "bg-green-50/40 dark:bg-green-900/10"
                          : m.status === "RETIRED"
                          ? "opacity-60"
                          : ""
                      }
                    >
                      <td className="px-4 py-2 font-mono text-xs">v{m.version}</td>
                      <td className="px-4 py-2">
                        <ActionBadge action={m.status ?? "UNKNOWN"} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        <MetricCell metrics={m.metrics} key_="f1_score" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        <MetricCell metrics={m.metrics} key_="precision" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        <MetricCell metrics={m.metrics} key_="recall" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {m.sample_count?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {m.trained_at ? new Date(m.trained_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data.total}
            noun="models"
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
