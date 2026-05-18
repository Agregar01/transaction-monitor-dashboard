"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import { useGetDecisionHistoryQuery } from "@/redux/slices/api/decisionsApi";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { SkeletonTable } from "@/components/Skeleton";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";

export default function DecisionsPage() {
  useEffect(() => { document.title = "Decisions | Deferred KYC"; }, []);
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const [actionFilter, setActionFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data, isLoading } = useGetDecisionHistoryQuery({
    client_id: clientId,
    action: actionFilter || undefined,
    event_type: eventFilter || undefined,
    limit,
    offset,
  });

  const decisions = data || [];

  const [searchQuery, setSearchQuery] = useState("");

  const exportCsv = () => {
    if (!decisions.length) return;
    const headers = ["Decision ID", "Customer", "Event Type", "Action", "Risk Level", "Risk Score", "Processing Time (ms)", "Timestamp"];
    const rows = decisions.map((d) => [
      d.decision_id,
      d.customer_external_id,
      d.event_type,
      d.action,
      d.risk_level,
      d.risk_score,
      d.processing_time_ms,
      d.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decisions-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ClientGuard>
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "COMPLIANCE", "RISK", "EXECUTIVE"]}>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Decisions</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">History of all evaluated events</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!decisions.length}
          className="flex items-center gap-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Search + Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
        <input
          type="text"
          placeholder="Search by decision ID or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm sm:col-span-2 lg:flex-1 lg:min-w-[200px]"
        />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Actions</option>
          <option value="ALLOW">Allow</option>
          <option value="BLOCK">Block</option>
          <option value="REVIEW">Review</option>
          <option value="UPGRADE_REQUIRED">Upgrade Required</option>
          <option value="STEP_UP">Step Up</option>
          <option value="FREEZE">Freeze</option>
        </select>
        <select
          value={eventFilter}
          onChange={(e) => { setEventFilter(e.target.value); setOffset(0); }}
          className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Event Types</option>
          <option value="TRANSACTION">Transaction</option>
          <option value="ACTION">Action</option>
          <option value="LOGIN">Login</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="EXTERNAL">External</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-navy-800">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="px-6 py-3 font-medium">Decision ID</th>
              <th className="px-6 py-3 font-medium">Customer</th>
              <th className="px-6 py-3 font-medium">Event</th>
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">Risk</th>
              <th className="px-6 py-3 font-medium">Score</th>
              <th className="px-6 py-3 font-medium">Latency</th>
              <th className="px-6 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-0"><SkeletonTable rows={5} cols={6} /></td></tr>
            ) : decisions.length > 0 ? (
              decisions
                .filter((d) => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return d.decision_id.toLowerCase().includes(q) || d.customer_external_id.toLowerCase().includes(q);
                })
                .map((d) => (
                <Link
                  key={d.decision_id}
                  href={`/dashboard/decisions/${d.decision_id}`}
                  className="contents"
                >
                  <tr className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600 cursor-pointer">
                    <td className="px-6 py-3 font-mono text-xs text-primary font-semibold">{d.decision_id.slice(0, 12)}...</td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{d.customer_external_id}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{d.event_type}</td>
                    <td className="px-6 py-3"><ActionBadge action={d.action} /></td>
                    <td className="px-6 py-3"><RiskBadge level={d.risk_level} /></td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{d.risk_score}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{d.processing_time_ms}ms</td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{new Date(d.created_at).toLocaleString()}</td>
                  </tr>
                </Link>
              ))
            ) : (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">No decisions found</td></tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t dark:border-navy-600 bg-gray-50 dark:bg-navy-800">
          <span className="text-sm text-gray-500">
            Showing {offset + 1}–{offset + decisions.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white"
            >
              Previous
            </button>
            <button
              disabled={decisions.length < limit}
              onClick={() => setOffset(offset + limit)}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
    </RoleGuard>
    </ClientGuard>
  );
}
