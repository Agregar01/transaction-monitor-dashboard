"use client";

import { useListModelsQuery } from "@/redux/slices/api/mlApi";
import { SkeletonCard } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";

export default function ModelsPage() {
  const { data, isLoading, error } = useListModelsQuery();

  if (isLoading) return <SkeletonCard />;

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">ML Models</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Champion / challenger registry.
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">Model registry endpoint not yet exposed</p>
          <p className="mt-1">
            The TMS backend has the <code className="font-mono">ModelRegistry</code> table but no
            <code className="font-mono">/api/v1/models</code> router yet. Tracked in
            <code className="font-mono"> docs/OPEN_ISSUES.md</code> (#1). This page activates once
            the router lands.
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
        No models registered yet.
      </div>
    );
  }

  // Group by model_type
  const byType = data.reduce<Record<string, typeof data>>((acc, m) => {
    if (!acc[m.model_type]) acc[m.model_type] = [];
    acc[m.model_type].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">ML Models</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Registry grouped by model family. Champions are highlighted in green.
        </p>
      </div>

      {Object.entries(byType).map(([type, models]) => (
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
                <th className="px-4 py-3 text-left">Version</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">F1</th>
                <th className="px-4 py-3 text-right">Precision</th>
                <th className="px-4 py-3 text-right">Recall</th>
                <th className="px-4 py-3 text-right">Samples</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Promoted</th>
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
                  <td className="px-4 py-3 font-mono text-xs">v{m.version}</td>
                  <td className="px-4 py-3">
                    <ActionBadge action={m.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {m.f1_score?.toFixed(3) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {m.precision?.toFixed(3) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {m.recall?.toFixed(3) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {m.training_samples.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {m.promoted_at ? new Date(m.promoted_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
