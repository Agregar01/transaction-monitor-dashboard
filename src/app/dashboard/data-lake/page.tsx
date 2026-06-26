"use client";

import { useState } from "react";
import {
  useGetDataLakeStatusQuery,
  useTriggerDataLakeExportMutation,
} from "@/redux/slices/api/dataLakeApi";
import QueryState from "@/components/QueryState";
import {
  CircleStackIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

const ENTITIES = [
  { key: "transactions", label: "Transactions" },
  { key: "alerts",       label: "Alerts" },
  { key: "cases",        label: "Cases" },
  { key: "str_reports",  label: "STR Reports" },
  { key: "ctr_reports",  label: "CTR Reports" },
  { key: "audit_logs",   label: "Audit Logs" },
] as const;

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircleIcon className="w-3.5 h-3.5" />
        All entities exported
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
      <ExclamationCircleIcon className="w-3.5 h-3.5" />
      {errors.length} error{errors.length > 1 ? "s" : ""}
    </span>
  );
}

export default function DataLakePage() {
  const { data, isLoading, isError, error, refetch } = useGetDataLakeStatusQuery();
  const [trigger, { isLoading: isTriggering }] = useTriggerDataLakeExportMutation();
  const [backfillDate, setBackfillDate] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function handleTrigger() {
    try {
      const res = await trigger({ export_date: backfillDate || undefined }).unwrap();
      setToast(`Export queued — task ${res.task_id.slice(0, 8)}…`);
      setBackfillDate("");
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast("Failed to queue export.");
      setTimeout(() => setToast(null), 4000);
    }
  }

  const hasRun = data?.status === "ok";
  const results = data?.results ?? {} as Record<string, number>;
  const errors = data?.errors ?? [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CircleStackIcon className="w-6 h-6 text-indigo-500" />
            Data Lake
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Nightly S3 export — NDJSON partitioned by entity/year/month/day, queryable with Athena.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <QueryState isLoading={isLoading} isError={isError} error={error}>

        {/* Last export summary */}
        {!hasRun && (
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No export has run yet. Use the manual trigger below to run the first export.
          </div>
        )}

        {hasRun && (
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 divide-y divide-gray-100 dark:divide-navy-600">

            {/* Summary row */}
            <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Last export:{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data?.export_date}
                  </span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Run at:{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data?.last_run ? fmtDate(data.last_run) : "—"}
                  </span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Total rows:{" "}
                  <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                    {fmt(data?.total_rows ?? 0)}
                  </span>
                </span>
              </div>
              <StatusBadge errors={errors} />
            </div>

            {/* Per-entity table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-navy-600">
                    <th className="px-5 py-2.5 font-medium">Entity</th>
                    <th className="px-5 py-2.5 font-medium text-right">Rows exported</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-navy-600">
                  {ENTITIES.map(({ key, label }) => {
                    const count = results[key] ?? 0;
                    const failed = errors.includes(key);
                    return (
                      <tr key={key} className="hover:bg-gray-50 dark:hover:bg-navy-600/50">
                        <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">
                          {label}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {failed ? "—" : fmt(count)}
                        </td>
                        <td className="px-5 py-3">
                          {failed ? (
                            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                              <ExclamationCircleIcon className="w-4 h-4" />
                              Error
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircleIcon className="w-4 h-4" />
                              {count === 0 ? "No data" : "OK"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Destination info */}
            <div className="px-5 py-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <CloudArrowUpIcon className="w-4 h-4 shrink-0" />
              <span>
                s3://<span className="font-mono">{data?.bucket}</span> ·{" "}
                {data?.region} · partitioned by{" "}
                <span className="font-mono">entity/year=YYYY/month=MM/day=DD/</span>
              </span>
            </div>
          </div>
        )}

        {/* Manual trigger */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Manual export
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Platform admins only. Leave date blank to export yesterday&apos;s data, or specify a
            date to backfill.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="date"
              value={backfillDate}
              onChange={(e) => setBackfillDate(e.target.value)}
              className="text-sm border border-gray-200 dark:border-navy-500 rounded-lg px-3 py-2 bg-white dark:bg-navy-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="YYYY-MM-DD"
            />
            <button
              onClick={handleTrigger}
              disabled={isTriggering}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTriggering ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <CloudArrowUpIcon className="w-4 h-4" />
              )}
              {isTriggering ? "Queuing…" : "Run export"}
            </button>
          </div>
        </div>

      </QueryState>
    </div>
  );
}
