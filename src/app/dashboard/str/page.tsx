"use client";

import Link from "next/link";
import { useState } from "react";
import { useListSTRQuery } from "@/redux/slices/api/strApi";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import type { STRStatus } from "@/types/api";

const STATUSES: STRStatus[] = ["DRAFT", "FILED", "WITHDRAWN"];

export default function STRListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<STRStatus | "">("");
  const [jurisdictionId, setJurisdictionId] = useState("");

  const { data, isLoading, error } = useListSTRQuery({
    page,
    page_size: 20,
    status: status || undefined,
    jurisdiction_id: jurisdictionId || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">STR Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Suspicious Transaction Reports. Drafts can be edited; filing is a four-eyes action.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as STRStatus | "");
            }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Jurisdiction
          </label>
          <input
            type="text"
            value={jurisdictionId}
            onChange={(e) => {
              setPage(1);
              setJurisdictionId(e.target.value.toUpperCase());
            }}
            placeholder="GHA / NGA / KEN"
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load STR reports.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No STR reports match the filters. New reports are drafted from a case detail page.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Activity</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Filed</th>
                <th className="px-4 py-3 text-left">Filing ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/str/${r.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.subject_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.suspicious_activity_type ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.total_amount == null
                      ? "—"
                      : `${Number(r.total_amount).toLocaleString()} ${r.currency ?? ""}`}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {r.filed_at ? new Date(r.filed_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.filing_reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-navy-600 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {data.total} total · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
