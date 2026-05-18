"use client";

import { useState, useEffect } from "react";
import { useGetAuditLogsQuery } from "@/redux/slices/api/auditLogsApi";
import AdminGuard from "@/components/AdminGuard";
import { SkeletonTable } from "@/components/Skeleton";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  approve: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reject: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  login: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "gdpr.forget": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "gdpr.retention_purge": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function ActionBadge({ action }: { action: string }) {
  const baseAction = action.split(".")[0];
  const color = ACTION_COLORS[action] || ACTION_COLORS[baseAction] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {action}
    </span>
  );
}

export default function AuditLogsPage() {
  useEffect(() => { document.title = "Audit Logs | Deferred KYC"; }, []);

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const pageSize = 25;

  const { data, isLoading } = useGetAuditLogsQuery({
    action: actionFilter || undefined,
    resource_type: resourceFilter || undefined,
    page,
    page_size: pageSize,
  });

  const logs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const exportCsv = () => {
    if (!logs.length) return;
    const headers = ["Timestamp", "Action", "Resource Type", "Resource ID", "Actor Email", "IP Address", "Details"];
    const rows = logs.map((l) => [
      l.created_at,
      l.action,
      l.resource_type,
      l.resource_id || "",
      l.actor_email || "",
      l.ip_address || "",
      JSON.stringify(l.details),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Immutable record of all admin actions
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!logs.length}
          className="flex items-center gap-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="login">Login</option>
          <option value="gdpr.forget">GDPR Forget</option>
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Resources</option>
          <option value="signup_request">Signup Requests</option>
          <option value="client">Clients</option>
          <option value="policy">Policies</option>
          <option value="policy_rule">Policy Rules</option>
          <option value="webhook">Webhooks</option>
          <option value="customer">Customers</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Resource</th>
                <th className="px-6 py-3 font-medium">Resource ID</th>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-0"><SkeletonTable rows={5} cols={6} /></td></tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600 cursor-pointer"
                  >
                    <td className="px-6 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3"><ActionBadge action={log.action} /></td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{log.resource_type}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      {log.resource_id ? `${log.resource_id.slice(0, 12)}...` : "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{log.actor_email || "system"}</td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{log.ip_address || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No audit logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded details */}
        {expandedRow && logs.find((l) => l.id === expandedRow) && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-navy-800 border-t dark:border-navy-600">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Details</h4>
            <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-navy-700 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(logs.find((l) => l.id === expandedRow)?.details, null, 2)}
            </pre>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t dark:border-navy-600 bg-gray-50 dark:bg-navy-800">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages || 1} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border dark:border-navy-600 rounded text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-navy-600 dark:text-gray-300"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border dark:border-navy-600 rounded text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-navy-600 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
    </AdminGuard>
  );
}
