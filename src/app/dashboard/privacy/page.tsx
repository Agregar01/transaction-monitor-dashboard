"use client";

import { useState } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useGetPrivacyStatusQuery,
  useListDsarRequestsQuery,
  useCreateDsarRequestMutation,
  useCompleteDsarRequestMutation,
  useRejectDsarRequestMutation,
  useLazyExportCustomerDataQuery,
  useRequestErasureMutation,
} from "@/redux/slices/api/privacyApi";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { DsarType, DsarStatus } from "@/types/api";
import {
  FingerPrintIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

const STATUS_COLOR: Record<DsarStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

const TYPE_COLOR: Record<DsarType, string> = {
  ACCESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  ERASURE: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <LockClosedIcon className="h-8 w-8 text-gray-300 dark:text-navy-500" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        You don&apos;t have permission to view data-privacy requests.
      </p>
      <p className="text-xs text-gray-400 dark:text-navy-400">
        Requires the Data Protection Officer role or equivalent permissions.
      </p>
    </div>
  );
}

export default function PrivacyPage() {
  const { permissions } = useAppSelector((s) => s.auth);
  const canView = permissions.includes("view_dsar");
  const canManage = permissions.includes("manage_dsar");
  const canErase = permissions.includes("erase_pii");

  const { data: status } = useGetPrivacyStatusQuery(undefined, {
    skip: !(canView || canManage || canErase),
  });

  const [statusFilter, setStatusFilter] = useState("");
  const { data: list, isLoading } = useListDsarRequestsQuery(
    { status: statusFilter || undefined, page_size: 50 },
    { skip: !canView },
  );

  const [newId, setNewId] = useState("");
  const [newType, setNewType] = useState<DsarType>("ACCESS");
  const [newNotes, setNewNotes] = useState("");
  const [createReq, { isLoading: creating }] = useCreateDsarRequestMutation();

  const [exportId, setExportId] = useState("");
  const [triggerExport, { isFetching: exporting }] = useLazyExportCustomerDataQuery();

  const [eraseId, setEraseId] = useState("");
  const [requestErasure, { isLoading: erasing }] = useRequestErasureMutation();

  const [complete] = useCompleteDsarRequestMutation();
  const [reject] = useRejectDsarRequestMutation();

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim()) return;
    try {
      await createReq({
        customer_id: newId.trim(),
        request_type: newType,
        notes: newNotes.trim() || undefined,
      }).unwrap();
      showToast({ type: "success", title: "Request logged", message: `${newType} · ${newId.trim()}` });
      setNewId("");
      setNewNotes("");
    } catch (err) {
      showToast({ type: "error", title: "Could not log request", message: errorMessage(err) });
    }
  };

  const onExport = async () => {
    const id = exportId.trim();
    if (!id) return;
    try {
      const data = await triggerExport({ customer_id: id }).unwrap();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dsar-${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast({ type: "success", title: "DSAR exported", message: `Downloaded PII for ${id}` });
    } catch (err) {
      showToast({ type: "error", title: "Export failed", message: errorMessage(err) });
    }
  };

  const onErase = async () => {
    const id = eraseId.trim();
    if (!id) return;
    try {
      const res = await requestErasure({ customer_id: id }).unwrap();
      if (res.status === "ANONYMISED") {
        showToast({ type: "success", title: "PII erased", message: res.message });
      } else {
        showToast({
          type: "success",
          title: "Erasure requested",
          message: "Awaiting four-eyes approval — see the Approvals page.",
        });
      }
      setEraseId("");
    } catch (err) {
      // 409 = AML retention hold; the backend detail explains why.
      showToast({ type: "error", title: "Erasure blocked", message: errorMessage(err) });
    }
  };

  const onComplete = async (id: string) => {
    try {
      await complete({ id }).unwrap();
      showToast({ type: "success", title: "Marked completed", message: id });
    } catch (err) {
      showToast({ type: "error", title: "Failed", message: errorMessage(err) });
    }
  };

  const onReject = async (id: string) => {
    const notes = window.prompt("Rejection reason (optional):");
    if (notes === null) return; // cancelled
    try {
      await reject({ id, notes: notes || undefined }).unwrap();
      showToast({ type: "success", title: "Request rejected", message: id });
    } catch (err) {
      showToast({ type: "error", title: "Failed", message: errorMessage(err) });
    }
  };

  if (!canView && !canManage && !canErase) {
    return <PermissionDenied />;
  }

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FingerPrintIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Data privacy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Data-subject access requests, erasure (four-eyes), and compliance posture.
          </p>
        </div>
      </div>

      {/* Compliance posture banner */}
      {status && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.compliant
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold">{status.law}</span>
            <span>· {status.authority_name} ({status.authority_code})</span>
            <span>· DSAR response window: {status.dsar_response_days} days</span>
            <span>· Residency: {status.data_residency_location}</span>
            <span>{status.compliant ? "✓ compliant" : "⚠ action needed"}</span>
          </div>
          {status.gap && <p className="mt-1 text-xs">{status.gap}</p>}
        </div>
      )}

      {/* DSAR export + erasure action cards */}
      {(canManage || canErase) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {canManage && (
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">Export subject data (DSAR)</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Downloads all PII held for a customer across customers, transactions, alerts, cases, and reports.
              </p>
              <div className="flex gap-2">
                <input
                  value={exportId}
                  onChange={(e) => setExportId(e.target.value)}
                  placeholder="Customer ID"
                  className={inputCls}
                />
                <button
                  onClick={onExport}
                  disabled={exporting || !exportId.trim()}
                  className="shrink-0 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {exporting ? "Exporting…" : "Export"}
                </button>
              </div>
            </div>
          )}

          {canErase && (
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrashIcon className="h-5 w-5 text-red-600" />
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">Erase subject data</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Anonymises PII. Requires a second approver (four-eyes) and is blocked if the subject is under an
                active AML retention hold.
              </p>
              <div className="flex gap-2">
                <input
                  value={eraseId}
                  onChange={(e) => setEraseId(e.target.value)}
                  placeholder="Customer ID"
                  className={inputCls}
                />
                <button
                  onClick={onErase}
                  disabled={erasing || !eraseId.trim()}
                  className="shrink-0 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {erasing ? "Requesting…" : "Request erasure"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log a new request */}
      {canView && (
        <form
          onSubmit={onCreate}
          className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-3"
        >
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Log a data-subject request</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="Customer ID"
              className={`${inputCls} sm:col-span-2`}
            />
            <select value={newType} onChange={(e) => setNewType(e.target.value as DsarType)} className={inputCls}>
              <option value="ACCESS">Access</option>
              <option value="ERASURE">Erasure</option>
            </select>
            <button
              type="submit"
              disabled={creating || !newId.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {creating ? "Logging…" : "Log request"}
            </button>
          </div>
          <input
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Notes (optional)"
            className={inputCls}
          />
        </form>
      )}

      {/* Request queue */}
      {canView && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Requests</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 dark:border-navy-500 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
          ) : !list || list.items.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-navy-600">
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Requested by</th>
                    <th className="pb-2 pr-4">Created</th>
                    {canManage && <th className="pb-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {list.items.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-navy-800">
                      <td className="py-2 pr-4 font-mono text-gray-900 dark:text-white">{r.customer_id}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLOR[r.request_type]}`}>
                          {r.request_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{r.requested_by}</td>
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{fmtDate(r.created_at)}</td>
                      {canManage && (
                        <td className="py-2 text-right whitespace-nowrap">
                          {r.status === "PENDING" ? (
                            <span className="inline-flex gap-2">
                              <button
                                onClick={() => onComplete(r.id)}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => onReject(r.id)}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-navy-500 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-navy-700"
                              >
                                Reject
                              </button>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
