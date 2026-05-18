"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useListSignupRequestsQuery,
  useApproveSignupRequestMutation,
  useRejectSignupRequestMutation,
} from "@/redux/slices/api/signupRequestsApi";
import type { ApproveResponse } from "@/redux/slices/api/signupRequestsApi";
import { showToast } from "@/components/Toast";
import AdminGuard from "@/components/AdminGuard";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

type StatusFilter = "" | "pending_verification" | "pending" | "approved" | "rejected";

export default function SignupRequestsPage() {
  useEffect(() => { document.title = "Signup Requests | Deferred KYC"; }, []);
  const isAdmin = useAppSelector((s) => s.auth.isAdmin);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedResult, setApprovedResult] = useState<ApproveResponse | null>(null);

  const { data, isLoading } = useListSignupRequestsQuery(
    { status: statusFilter || undefined },
    { pollingInterval: 60000 }
  );

  const [approve, { isLoading: approving }] = useApproveSignupRequestMutation();
  const [reject, { isLoading: rejecting }] = useRejectSignupRequestMutation();

  if (!isAdmin) {
    return (
      <div className="text-center py-20 text-gray-500">
        This page is only available to administrators.
      </div>
    );
  }

  const handleApprove = async () => {
    if (!approvingId) return;
    try {
      const result = await approve(approvingId).unwrap();
      setApprovingId(null);
      setApprovedResult(result);
      showToast({ type: "success", title: "Application Approved", message: `API credentials created for ${result.client_name}` });
    } catch {
      setApprovingId(null);
      showToast({ type: "error", title: "Approval Failed", message: "Could not approve this request." });
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    try {
      await reject({ id: rejectingId, reason: rejectReason }).unwrap();
      setRejectingId(null);
      setRejectReason("");
      showToast({ type: "info", title: "Application Rejected", message: "Rejection notification sent." });
    } catch {
      showToast({ type: "error", title: "Rejection Failed", message: "Could not reject this request." });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({ type: "success", title: "Copied", message: `${label} copied to clipboard` });
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending_verification":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><EnvelopeIcon className="h-3 w-3" />Awaiting Verification</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><ClockIcon className="h-3 w-3" />Pending Review</span>;
      case "approved":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircleIcon className="h-3 w-3" />Approved</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircleIcon className="h-3 w-3" />Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Signup Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Review and approve client applications
          </p>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-navy-600 rounded-lg self-start flex-wrap">
          {([
            { value: "" as StatusFilter, label: "All" },
            { value: "pending_verification" as StatusFilter, label: "Awaiting Verification" },
            { value: "pending" as StatusFilter, label: "Pending Review" },
            { value: "approved" as StatusFilter, label: "Approved" },
            { value: "rejected" as StatusFilter, label: "Rejected" },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === value
                  ? "bg-white dark:bg-navy-500 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-navy-600 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-navy-600 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-navy-600 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : !data?.items?.length ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-12 text-center">
          <ClockIcon className="h-12 w-12 text-gray-300 dark:text-navy-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {statusFilter ? `No ${statusFilter} requests` : "No signup requests yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {req.company_name}
                    </h3>
                    {statusBadge(req.status)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{req.contact_name}</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(req.created_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <span className="inline-flex items-center gap-1.5">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                  {req.email}
                </span>
                {req.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                    {req.phone}
                  </span>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Use Case</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{req.use_case}</p>
              </div>

              {req.status === "rejected" && req.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{req.rejection_reason}</p>
                </div>
              )}

              {req.status === "approved" && req.api_client_id && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Client ID</p>
                  <p className="text-sm text-green-800 dark:text-green-300 font-mono">{req.api_client_id}</p>
                </div>
              )}

              {req.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setApprovingId(req.id)}
                    disabled={approving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    {approving ? "Approving..." : "Approve & Send Credentials"}
                  </button>
                  <button
                    onClick={() => setRejectingId(req.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-navy-600 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Application</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Provide a reason for rejection. The applicant will be notified via email.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
              placeholder="e.g., Incomplete use case description, unsupported industry..."
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejecting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {rejecting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approved Credentials Modal */}
      {approvedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="text-center">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Client Approved!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                API credentials have been created for <strong>{approvedResult.client_name}</strong>
                {approvedResult.welcome_email_sent
                  ? " and sent via email."
                  : ". Email delivery failed — share credentials manually."}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Client ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-gray-800 dark:text-gray-200 font-mono flex-1 break-all">
                    {approvedResult.client_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(approvedResult.client_id, "Client ID")}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">API Key</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-gray-800 dark:text-gray-200 font-mono flex-1 break-all">
                    {approvedResult.api_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(approvedResult.api_key, "API Key")}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {!approvedResult.welcome_email_sent && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
                Welcome email could not be sent. Please share the credentials above with the client manually.
              </div>
            )}

            <button
              onClick={() => setApprovedResult(null)}
              className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={!!approvingId}
        title="Approve Application"
        message="This will create an API client, generate credentials, and send a welcome email to the applicant. Continue?"
        confirmLabel="Approve & Send Credentials"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleApprove}
        onCancel={() => setApprovingId(null)}
      />
    </div>
    </AdminGuard>
  );
}
