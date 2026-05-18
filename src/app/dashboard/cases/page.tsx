"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useListCasesQuery, useGetCaseSummaryQuery } from "@/redux/slices/api/casesApi";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import TierBadge from "@/components/TierBadge";
import { SkeletonTable } from "@/components/Skeleton";
import {
  FunnelIcon,
  ChatBubbleLeftEllipsisIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import RoleGuard from "@/components/RoleGuard";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    RESOLVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ESCALATED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.OPEN}`}>
      {status}
    </span>
  );
}

function SummaryCard({
  label,
  count,
  icon: Icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  useEffect(() => { document.title = "Cases | Deferred KYC"; }, []);

  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [actionFilter, setActionFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter, actionFilter, riskFilter, debouncedSearch]);

  const { data: summary } = useGetCaseSummaryQuery();
  const { data, isLoading, isFetching } = useListCasesQuery({
    resolution_status: statusFilter || undefined,
    action: actionFilter || undefined,
    risk_level: riskFilter || undefined,
    search: debouncedSearch || undefined,
    page,
    page_size: pageSize,
  });

  const cases = data?.items || [];
  const total = data?.total || 0;
  const pages = data?.pages || 0;

  return (
      <RoleGuard allowedRoles={["OWNER", "ADMIN", "COMPLIANCE", "SUPERVISOR", "OPERATIONS"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Case Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Review and resolve FREEZE, BLOCK, REVIEW, and UPGRADE decisions
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Open Cases" count={summary.total_open} icon={ClockIcon} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            <SummaryCard label="Resolved" count={summary.total_resolved} icon={CheckCircleIcon} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
            <SummaryCard label="Escalated" count={summary.total_escalated} icon={ExclamationTriangleIcon} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            <SummaryCard
              label="Total Cases"
              count={summary.total_open + summary.total_resolved + summary.total_escalated}
              icon={FunnelIcon}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            />
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
          <input
            type="text"
            placeholder="Search by decision ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm sm:col-span-2 lg:flex-1 lg:min-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ESCALATED">Escalated</option>
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Actions</option>
            <option value="REVIEW">Review</option>
            <option value="BLOCK">Block</option>
            <option value="FREEZE">Freeze</option>
            <option value="UPGRADE_REQUIRED">Upgrade Required</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Risk Levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="VERY_HIGH">Very High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
          {isFetching && !isLoading && (
            <div className="px-6 py-1 bg-primary/10 flex items-center gap-2 text-xs text-primary">
              <ArrowPathIcon className="h-3 w-3 animate-spin" /> Updating...
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-3 font-medium">Decision</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Tier</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Risk</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <SkeletonTable rows={5} cols={8} />
                    </td>
                  </tr>
                ) : cases.length > 0 ? (
                  cases.map((c) => (
                    <Link
                      key={c.decision_id}
                      href={`/dashboard/cases/${c.decision_id}`}
                      className="contents"
                    >
                      <tr className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600 cursor-pointer">
                        <td className="px-6 py-3 font-mono text-xs text-primary font-semibold">
                          {c.decision_id.slice(0, 12)}...
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                          {c.customer_external_id || "—"}
                        </td>
                        <td className="px-6 py-3">
                          {c.customer_tier ? <TierBadge tier={c.customer_tier} /> : "—"}
                        </td>
                        <td className="px-6 py-3">
                          <ActionBadge action={c.action} />
                        </td>
                        <td className="px-6 py-3">
                          <RiskBadge level={c.risk_level} />
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={c.resolution_status} />
                        </td>
                        <td className="px-6 py-3">
                          {c.note_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                              {c.note_count}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-400 text-xs">
                          {new Date(c.created_at).toLocaleString()}
                        </td>
                      </tr>
                    </Link>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      No cases found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t dark:border-navy-600 bg-gray-50 dark:bg-navy-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {total > 0
                ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
                : "No results"}
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
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border dark:border-navy-600 rounded text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-navy-600 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      </RoleGuard>
  );
}
