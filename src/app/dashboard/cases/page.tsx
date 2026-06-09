"use client";

import Link from "next/link";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useListCasesQuery } from "@/redux/slices/api/casesApi";
import { useGetAnalyticsSummaryQuery } from "@/redux/slices/api/analyticsApi";
import ExportButton from "@/components/ExportButton";
import { API_V1 } from "@/config/api";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import DonutCard from "@/components/DonutCard";
import Pagination from "@/components/Pagination";
import UserPicker from "@/components/UserPicker";
import { useListAssignableUsersQuery } from "@/redux/slices/api/authApi";
import type { CaseStatus, CaseType, CasePriority } from "@/types/api";
import { PlusIcon } from "@heroicons/react/24/outline";

const STATUSES: CaseStatus[] = ["OPEN", "INVESTIGATING", "ESCALATED", "SAR_DRAFTED", "SAR_FILED", "CLOSED"];
const TYPES: CaseType[] = ["AML", "FRAUD", "SANCTIONS"];
const PRIORITIES: CasePriority[] = ["HIGH", "MEDIUM", "LOW"];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#94a3b8",
  ASSIGNED: "#60a5fa",
  IN_REVIEW: "#818cf8",
  INVESTIGATING: "#f59e0b",
  ESCALATED: "#f97316",
  SAR_DRAFTED: "#a855f7",
  SAR_FILED: "#10b981",
  CLOSED: "#64748b",
};
const TYPE_COLORS: Record<string, string> = {
  AML: "#2563eb",
  FRAUD: "#ec4899",
  SANCTIONS: "#f59e0b",
};

function CasesListInner() {
  // Seed the status filter from the URL so Overview deep links land pre-filtered.
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CaseStatus | "">((params.get("status") as CaseStatus | null) ?? "");
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

  // Resolve assignee user_id -> readable name for the table (falls back to a
  // short id if the roster isn't available to this role).
  const { data: roster } = useListAssignableUsersQuery();
  const nameFor = (id: string | null | undefined) => {
    if (!id) return "—";
    const u = roster?.find((r) => r.user_id === id);
    return u ? (u.full_name ?? u.email) : `${id.slice(0, 8)}…`;
  };

  // Breakdowns: status from the real population (analytics case_breakdown),
  // type from a recent sample (not available in the analytics summary).
  const { data: analytics } = useGetAnalyticsSummaryQuery({ period_days: 90 });
  const { data: sample } = useListCasesQuery({ page_size: 100 });

  const statusBreakdown = useMemo(() => {
    const bd = analytics?.case_breakdown ?? {};
    const keys = Object.keys(bd).filter((k) => bd[k] > 0);
    return {
      labels: keys.map((k) => k.replace(/_/g, " ")),
      series: keys.map((k) => bd[k]),
      colors: keys.map((k) => STATUS_COLORS[k] ?? "#94a3b8"),
      total: keys.reduce((s, k) => s + bd[k], 0),
    };
  }, [analytics]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of sample?.items ?? []) counts[c.case_type] = (counts[c.case_type] ?? 0) + 1;
    const labels = Object.keys(counts);
    return {
      labels,
      series: labels.map((l) => counts[l]),
      colors: labels.map((l) => TYPE_COLORS[l] ?? "#94a3b8"),
    };
  }, [sample]);

  const sampleSize = sample?.items.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cases</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Investigation cases. State machine enforced server-side.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            url={(() => {
              const p = new URLSearchParams();
              if (status) p.set("status", status);
              if (caseType) p.set("case_type", caseType);
              if (priority) p.set("priority", priority);
              const qs = p.toString();
              return `${API_V1}/export/cases${qs ? `?${qs}` : ""}`;
            })()}
            filename="cases.csv"
            requiredPermission="view_cases"
          />
          <Link
            href="/dashboard/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600"
          >
            <PlusIcon className="h-4 w-4" /> New case
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Status
          </label>
          <select
            aria-label="Filter by status"
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
            aria-label="Filter by case type"
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
            aria-label="Filter by priority"
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
          <div className="mt-1">
            <UserPicker
              valueField="user_id"
              value={assignedTo}
              onChange={(v) => {
                setPage(1);
                setAssignedTo(v);
              }}
              ariaLabel="Filter by assigned investigator"
              placeholder="Anyone"
            />
          </div>
        </div>
      </div>

      {(statusBreakdown.total > 0 || sampleSize > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutCard
            title="By status"
            subtitle="All cases · last 90 days"
            labels={statusBreakdown.labels}
            series={statusBreakdown.series}
            colors={statusBreakdown.colors}
          />
          <DonutCard
            title="By type"
            subtitle={`Recent ${sampleSize} cases`}
            labels={typeBreakdown.labels}
            series={typeBreakdown.series}
            colors={typeBreakdown.colors}
          />
        </div>
      )}

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
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2 text-left">Assigned</th>
                <th className="px-4 py-2 text-left">Due</th>
                <th className="px-4 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {c.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-900 dark:text-white">{c.title}</td>
                  <td className="px-4 py-2">
                    <ActionBadge action={c.case_type} />
                  </td>
                  <td className="px-4 py-2">
                    <ActionBadge action={c.status} />
                  </td>
                  <td className="px-4 py-2">
                    <ActionBadge action={c.priority} />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {nameFor(c.assigned_to)}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {c.due_date ? new Date(c.due_date).toLocaleDateString() : "—"}
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
            noun={isFetching ? "cases · refreshing…" : "cases"}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

export default function CasesListPage() {
  return (
    <Suspense fallback={null}>
      <CasesListInner />
    </Suspense>
  );
}
