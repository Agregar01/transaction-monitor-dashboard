"use client";

import { useState } from "react";
import {
  useListApprovalsQuery,
  useApproveActionMutation,
  useRejectActionMutation,
} from "@/redux/slices/api/approvalsApi";
import { useAppSelector } from "@/redux/store";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";
import type { ApprovalStatus, PendingApproval } from "@/types/api";

const STATUSES: ApprovalStatus[] = ["PENDING", "APPROVED", "REJECTED", "EXPIRED"];

function Countdown({ to }: { to: string }) {
  const remaining = Math.max(0, new Date(to).getTime() - Date.now());
  if (remaining <= 0) return <span className="text-red-600">expired</span>;
  const mins = Math.floor(remaining / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    return <span>{days}d {hrs % 24}h</span>;
  }
  if (hrs >= 1) return <span>{hrs}h {mins % 60}m</span>;
  return <span className="text-amber-600">{mins}m</span>;
}

export default function ApprovalsPage() {
  const currentEmail = useAppSelector((s) => s.auth.email);
  const [status, setStatus] = useState<ApprovalStatus>("PENDING");
  const [selected, setSelected] = useState<PendingApproval | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const pollingInterval = useVisiblePolling(15000);
  const { data, isLoading, error } = useListApprovalsQuery(
    { status, page_size: 50 },
    { pollingInterval },
  );

  const [approveAction, { isLoading: approving }] = useApproveActionMutation();
  const [rejectAction, { isLoading: rejecting }] = useRejectActionMutation();

  const isSelf = selected && currentEmail && selected.requested_by === currentEmail;

  const onApprove = async () => {
    if (!selected) return;
    try {
      await approveAction({ id: selected.id, notes: reviewNotes || undefined }).unwrap();
      showToast({ type: "success", title: "Approved", message: `${selected.action_type} approved.` });
      setSelected(null);
      setReviewNotes("");
    } catch (e) {
      showToast({ type: "error", title: "Approve failed", message: errorMessage(e) });
    }
  };

  const onReject = async () => {
    if (!selected) return;
    try {
      await rejectAction({ id: selected.id, notes: reviewNotes || undefined }).unwrap();
      showToast({ type: "success", title: "Rejected", message: `${selected.action_type} rejected.` });
      setSelected(null);
      setReviewNotes("");
    } catch (e) {
      showToast({ type: "error", title: "Reject failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Approvals</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Four-eyes maker-checker queue. Refreshes every 15s.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              status === s
                ? "bg-primary text-white"
                : "border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load approvals.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No {status.toLowerCase()} approvals.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Requested by</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Expires in</th>
                <th className="px-4 py-3 text-left">Reviewer</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3">
                    <ActionBadge action={a.action_type.replace(/_/g, " ")} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                    {a.requested_by}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                    <Countdown to={a.expires_at} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {a.reviewed_by ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(a)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Approval
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selected.action_type.replace(/_/g, " ")}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Requested by {selected.requested_by} ·{" "}
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <ActionBadge action={selected.status} />
            </div>

            {isSelf && (
              <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs">
                You are the requester. Only a different reviewer can approve or reject this.
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Payload
              </h3>
              <pre className="text-xs bg-gray-50 dark:bg-navy-800 border border-gray-200 dark:border-navy-500 rounded-lg p-3 overflow-x-auto font-mono text-gray-900 dark:text-white">
                {JSON.stringify(selected.payload, null, 2)}
              </pre>
            </div>

            {selected.status === "PENDING" && (
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional review notes"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelected(null);
                  setReviewNotes("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
              >
                Close
              </button>
              {selected.status === "PENDING" && (
                <>
                  <button
                    onClick={onReject}
                    disabled={rejecting || !!isSelf}
                    className="px-4 py-2 text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    {rejecting ? "Rejecting…" : "Reject"}
                  </button>
                  <button
                    onClick={onApprove}
                    disabled={approving || !!isSelf}
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {approving ? "Approving…" : "Approve"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
