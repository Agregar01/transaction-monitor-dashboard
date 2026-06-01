"use client";

import Link from "next/link";
import { useState } from "react";
import { useListCasesQuery } from "@/redux/slices/api/casesApi";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import type { CaseStatus, CaseType, CasePriority } from "@/types/api";
import { PlusIcon } from "@heroicons/react/24/outline";

const STATUSES: CaseStatus[] = ["OPEN", "INVESTIGATING", "ESCALATED", "SAR_DRAFTED", "SAR_FILED", "CLOSED"];
const TYPES: CaseType[] = ["AML", "FRAUD", "SANCTIONS"];
const PRIORITIES: CasePriority[] = ["HIGH", "MEDIUM", "LOW"];

export default function CasesListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [caseType, setCaseType] = useState<CaseType | "">("");
  const [priority, setPriority] = useState<CasePriority | "">("");
  const [assignedTo, setAssignedTo] = useState("");

  const { data, isLoading, isFetching, error } = useListCasesQuery({
    page,
    page_size: 20,
    status: status || undefined,
    case_type: caseType || undefined,
    priority: priority || undefined,
    assigned_to: assignedTo || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cases</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Investigation cases. State machine enforced server-side.
          </p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600"
        >
          <PlusIcon className="h-4 w-4" /> New case
        </Link>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as CaseStatus | "");
            }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Type
          </label>
          <select
            value={caseType}
            onChange={(e) => {
              setPage(1);
              setCaseType(e.target.value as CaseType | "");
            }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">Any</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => {
              setPage(1);
              setPriority(e.target.value as CasePriority | "");
            }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="">Any</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Assigned to
          </label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => {
              setPage(1);
              setAssignedTo(e.target.value);
            }}
            placeholder="analyst@autheo.test"
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load cases.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No cases match the current filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Assigned</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {c.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{c.title}</td>
                  <td className="px-4 py-3">
                    <ActionBadge action={c.case_type} />
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={c.priority} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    {c.assigned_to ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {c.due_date ? new Date(c.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-navy-600 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {data.total} total · page {page} of {totalPages}
              {isFetching && " · refreshing…"}
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
