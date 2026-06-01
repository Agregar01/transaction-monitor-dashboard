"use client";

import { useState } from "react";
import { useListAuditChangesQuery } from "@/redux/slices/api/auditApi";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import type { AuditAction, AuditEntry } from "@/types/api";

const ACTIONS: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "LOGIN", "LOGOUT"];
const PAGE_SIZE = 50;

function DiffPanel({ before, after }: { before: unknown; after: unknown }) {
  const left = before && typeof before === "object" ? (before as Record<string, unknown>) : {};
  const right = after && typeof after === "object" ? (after as Record<string, unknown>) : {};
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
  if (keys.length === 0) return <p className="text-xs text-gray-400">no structured diff</p>;
  return (
    <ul className="text-xs font-mono space-y-0.5">
      {keys.map((k) => {
        const lv = JSON.stringify(left[k]);
        const rv = JSON.stringify(right[k]);
        if (lv === rv) return null;
        return (
          <li key={k} className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 w-40 truncate">{k}</span>
            <span className="text-red-600 dark:text-red-300 line-through">{lv ?? "—"}</span>
            <span>→</span>
            <span className="text-green-700 dark:text-green-300">{rv ?? "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Row({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-gray-50 dark:hover:bg-navy-600 cursor-pointer"
      >
        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
          {new Date(entry.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <ActionBadge action={entry.action} />
        </td>
        <td className="px-4 py-3 text-xs">{entry.resource_type}</td>
        <td className="px-4 py-3 font-mono text-xs">
          {entry.resource_id ? `${entry.resource_id.slice(0, 8)}…` : "—"}
        </td>
        <td className="px-4 py-3 text-xs font-mono">
          {entry.changed_by ? `${entry.changed_by.slice(0, 8)}…` : "—"}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{entry.notes ?? "—"}</td>
      </tr>
      {open && (
        <tr className="bg-gray-50 dark:bg-navy-800">
          <td colSpan={6} className="px-4 py-3">
            <DiffPanel before={entry.previous_value} after={entry.new_value} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | "">("");
  const [resourceType, setResourceType] = useState("");
  const [changedBy, setChangedBy] = useState("");

  const { data, isLoading, error } = useListAuditChangesQuery({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    action: action || undefined,
    resource_type: resourceType || undefined,
    changed_by: changedBy || undefined,
  });

  // Backend doesn't return a total. We can only tell "more exists" by whether
  // this page came back full. First page also resets when filters change.
  const hasMore = (data?.length ?? 0) >= PAGE_SIZE;

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Audit Trail</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Append-only change log. Click a row to expand the before/after diff.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={action}
          onChange={(e) => {
            resetPage();
            setAction(e.target.value as AuditAction | "");
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        >
          <option value="">Any action</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          value={resourceType}
          onChange={(e) => {
            resetPage();
            setResourceType(e.target.value);
          }}
          placeholder="Resource type (e.g. CASE, RULE, STR)"
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
        <input
          value={changedBy}
          onChange={(e) => {
            resetPage();
            setChangedBy(e.target.value);
          }}
          placeholder="Changed by (user UUID)"
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={10} cols={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load audit trail.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No audit entries match the filters.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Resource</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">By</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-navy-600 text-xs text-gray-500 dark:text-gray-400">
            <span>
              page {page} · {data.length} {data.length === 1 ? "entry" : "entries"}
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
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
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
