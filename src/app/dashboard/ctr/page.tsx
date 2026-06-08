"use client";

import { useState } from "react";
import { useListCTRQuery, useExemptCTRMutation, ctrXmlUrl } from "@/redux/slices/api/ctrApi";
import { API_V1 } from "@/config/api";
import { SkeletonTable } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { CTRStatus } from "@/types/api";

const STATUSES: CTRStatus[] = ["DRAFT", "FILED", "EXEMPT"];

export default function CTRListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CTRStatus | "">("");
  const [exemptDialog, setExemptDialog] = useState<{ id: string } | null>(null);
  const [exemptReason, setExemptReason] = useState("");

  const { data, isLoading, error } = useListCTRQuery({
    page,
    page_size: 20,
    status: status || undefined,
  });

  const [exemptCTR, { isLoading: exempting }] = useExemptCTRMutation();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const submitExemption = async () => {
    if (!exemptDialog || !exemptReason.trim()) return;
    try {
      const res = (await exemptCTR({ id: exemptDialog.id, reason: exemptReason }).unwrap()) as {
        approval_id?: string;
      };
      showToast({
        type: "info",
        title: "Exemption requested",
        message: res.approval_id ? `Approval ${res.approval_id.slice(0, 8)}…` : "Exemption recorded.",
      });
      setExemptDialog(null);
      setExemptReason("");
    } catch (e) {
      showToast({ type: "error", title: "Exemption failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">CTR Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Currency Transaction Reports. Auto-generated when amounts cross jurisdiction thresholds.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Status
        </label>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as CTRStatus | "");
          }}
          className="mt-1 w-full md:w-64 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        >
          <option value="">Any</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load CTR reports.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No CTR reports match the filters.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Transaction</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Filed</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.transaction_id.slice(0, 10)}…</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.amount.toLocaleString()} {r.currency}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.transaction_type}
                    {r.is_cash && (
                      <span className="ml-2 text-[10px] uppercase font-semibold text-amber-600">
                        cash
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {r.filed_at ? new Date(r.filed_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs space-x-2">
                    {r.status === "FILED" && (
                      <a
                        href={ctrXmlUrl(r.id)}
                        download
                        className="text-primary hover:underline"
                      >
                        XML
                      </a>
                    )}
                    <a
                      href={`${API_V1}/export/ctr/${r.id}/pdf`}
                      download
                      className="text-primary hover:underline"
                    >
                      PDF
                    </a>
                    {r.status !== "EXEMPT" && r.status !== "FILED" && (
                      <button
                        onClick={() => setExemptDialog({ id: r.id })}
                        className="text-amber-600 hover:underline"
                      >
                        Exempt
                      </button>
                    )}
                  </td>
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

      {exemptDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request CTR exemption</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                CTR exemptions trigger a four-eyes approval. The exemption only takes effect after
                another compliance officer confirms.
              </p>
            </div>
            <textarea
              rows={4}
              value={exemptReason}
              onChange={(e) => setExemptReason(e.target.value)}
              placeholder="Reason for the exemption"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setExemptDialog(null);
                  setExemptReason("");
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitExemption}
                disabled={exempting || !exemptReason.trim()}
                className="px-3 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {exempting ? "Submitting…" : "Request exemption"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
