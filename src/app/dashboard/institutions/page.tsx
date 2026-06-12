"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useListInstitutionsQuery,
  useApproveInstitutionMutation,
  useRejectInstitutionMutation,
  useSuspendInstitutionMutation,
  useReactivateInstitutionMutation,
  useResendVerificationMutation,
  type Institution,
  type InstitutionStatus,
} from "@/redux/slices/api/institutionsApi";
import AgregarAdminGuard from "@/components/AgregarAdminGuard";
import QueryState from "@/components/QueryState";
import Pagination from "@/components/Pagination";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";

const PAGE_SIZE = 20;

const STATUS_TABS: { key: "ALL" | InstitutionStatus; label: string }[] = [
  { key: "PENDING_APPROVAL", label: "Pending approval" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "REGISTERED", label: "Awaiting email" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

const STATUS_STYLE: Record<InstitutionStatus, string> = {
  REGISTERED: "bg-gray-100 text-gray-600 dark:bg-navy-600 dark:text-gray-300",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TYPE_LABEL: Record<string, string> = {
  BANK: "Bank",
  FINTECH: "Fintech",
  MOMO_PROVIDER: "Mobile Money",
  REGULATOR: "Regulator",
};

const VALID_TABS = STATUS_TABS.map((t) => t.key);

function InstitutionsInner() {
  useEffect(() => {
    document.title = "Institutions | Transaction Monitor";
  }, []);

  // Deep-link support: PlatformOverview cards link with ?status=… so a card
  // click lands on the matching tab (not always Pending approval).
  const params = useSearchParams();
  const initialTab = (() => {
    const s = params.get("status");
    return s && VALID_TABS.includes(s as never) ? (s as "ALL" | InstitutionStatus) : "PENDING_APPROVAL";
  })();

  const [tab, setTab] = useState<"ALL" | InstitutionStatus>(initialTab);
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState<Institution | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Institution | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Institution | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Institution | null>(null);

  const { data, isLoading, isError, error, isFetching } = useListInstitutionsQuery({
    status: tab === "ALL" ? undefined : tab,
    page,
    page_size: PAGE_SIZE,
  });

  const [approve, approveState] = useApproveInstitutionMutation();
  const [reject, rejectState] = useRejectInstitutionMutation();
  const [suspend] = useSuspendInstitutionMutation();
  const [reactivate] = useReactivateInstitutionMutation();
  const [resend, resendState] = useResendVerificationMutation();

  const doResend = async (inst: Institution) => {
    try {
      await resend({ contact_email: inst.contact_email }).unwrap();
      showToast({
        type: "success",
        title: "Verification email sent",
        message: `A fresh link was sent to ${inst.contact_email}.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Resend failed", message: errorMessage(e) });
    }
  };

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const selectTab = (k: "ALL" | InstitutionStatus) => {
    setTab(k);
    setPage(1);
  };

  const doSuspend = async () => {
    if (!suspendTarget) return;
    try {
      await suspend(suspendTarget.id).unwrap();
      showToast({ type: "success", title: "Suspended", message: `${suspendTarget.name} access blocked.` });
    } catch (e) {
      showToast({ type: "error", title: "Suspend failed", message: errorMessage(e) });
    } finally {
      setSuspendTarget(null);
    }
  };

  const doReactivate = async () => {
    if (!reactivateTarget) return;
    try {
      await reactivate(reactivateTarget.id).unwrap();
      showToast({ type: "success", title: "Reactivated", message: `${reactivateTarget.name} restored.` });
    } catch (e) {
      showToast({ type: "error", title: "Reactivate failed", message: errorMessage(e) });
    } finally {
      setReactivateTarget(null);
    }
  };

  return (
    <AgregarAdminGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Institutions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review signup requests and manage tenant access across the platform.
          </p>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-navy-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={items.length === 0}
            emptyMessage="No institutions in this view."
            cols={6}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Institution</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Jurisdiction</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Submitted</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {items.map((inst) => (
                    <tr key={inst.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BuildingOffice2Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{inst.name}</p>
                            <p className="text-xs text-gray-400 truncate">{inst.contact_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {TYPE_LABEL[inst.institution_type] ?? inst.institution_type}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{inst.jurisdiction_code}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[inst.status]}`}>
                          {inst.status.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(inst.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {inst.status === "PENDING_APPROVAL" && (
                            <>
                              <button
                                onClick={() => setApproveTarget(inst)}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(inst)}
                                className="px-3 py-1 rounded-lg text-xs font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {inst.status === "ACTIVE" && (
                            <button
                              onClick={() => setSuspendTarget(inst)}
                              className="px-3 py-1 rounded-lg text-xs font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                          {inst.status === "SUSPENDED" && (
                            <button
                              onClick={() => setReactivateTarget(inst)}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-600 transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                          {inst.status === "REGISTERED" && (
                            <button
                              onClick={() => doResend(inst)}
                              disabled={resendState.isLoading}
                              title="They must verify their email before you can approve them"
                              className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
                            >
                              Resend email
                            </button>
                          )}
                          {inst.status === "REJECTED" && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={data?.total}
                noun="institutions"
                onPageChange={setPage}
              />
            )}
          </QueryState>
          {isFetching && !isLoading && (
            <div className="px-6 py-2 text-xs text-gray-400">Updating…</div>
          )}
        </div>
      </div>

      {/* Approve modal */}
      {approveTarget && (
        <ApproveModal
          institution={approveTarget}
          busy={approveState.isLoading}
          onClose={() => setApproveTarget(null)}
          onConfirm={async (admin_email, admin_name) => {
            try {
              await approve({ id: approveTarget.id, admin_email, admin_name: admin_name || undefined }).unwrap();
              showToast({
                type: "success",
                title: "Institution approved",
                message: `Invite sent to ${admin_email}.`,
              });
              setApproveTarget(null);
            } catch (e) {
              showToast({ type: "error", title: "Approval failed", message: errorMessage(e) });
            }
          }}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          institution={rejectTarget}
          busy={rejectState.isLoading}
          onClose={() => setRejectTarget(null)}
          onConfirm={async (reason) => {
            try {
              await reject({ id: rejectTarget.id, reason }).unwrap();
              showToast({ type: "success", title: "Institution rejected", message: "The contact was notified." });
              setRejectTarget(null);
            } catch (e) {
              showToast({ type: "error", title: "Rejection failed", message: errorMessage(e) });
            }
          }}
        />
      )}

      <ConfirmDialog
        open={!!suspendTarget}
        title="Suspend institution?"
        message={`All users at ${suspendTarget?.name ?? ""} will be blocked from logging in until reactivated.`}
        confirmLabel="Suspend"
        variant="danger"
        onConfirm={doSuspend}
        onCancel={() => setSuspendTarget(null)}
      />
      <ConfirmDialog
        open={!!reactivateTarget}
        title="Reactivate institution?"
        message={`Restore access for all users at ${reactivateTarget?.name ?? ""}.`}
        confirmLabel="Reactivate"
        variant="warning"
        onConfirm={doReactivate}
        onCancel={() => setReactivateTarget(null)}
      />
    </AgregarAdminGuard>
  );
}

// useSearchParams (for ?status= deep-links) must sit under a Suspense boundary.
export default function InstitutionsPage() {
  return (
    <Suspense fallback={null}>
      <InstitutionsInner />
    </Suspense>
  );
}

function ApproveModal({
  institution,
  busy,
  onClose,
  onConfirm,
}: {
  institution: Institution;
  busy: boolean;
  onClose: () => void;
  onConfirm: (adminEmail: string, adminName: string) => void;
}) {
  const [adminEmail, setAdminEmail] = useState(institution.contact_email);
  const [adminName, setAdminName] = useState(institution.contact_name ?? "");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Approve {institution.name}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This creates a CLIENT_ADMIN account and emails them an invite to set their password.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin email</label>
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin name</label>
          <input
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Kwame Mensah"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(adminEmail.trim(), adminName.trim())}
            disabled={busy || !adminEmail.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {busy ? "Approving…" : "Approve & invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  institution,
  busy,
  onClose,
  onConfirm,
}: {
  institution: Institution;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reject {institution.name}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The contact is emailed this reason. They must submit a fresh signup to re-apply.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Incomplete regulatory registration documentation."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || !reason.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
