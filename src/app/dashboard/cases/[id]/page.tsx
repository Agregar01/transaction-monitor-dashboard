"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useGetCaseQuery,
  useGetCaseAlertsQuery,
  useGetCaseHistoryQuery,
  useGetCaseNotesQuery,
  useAddCaseNoteMutation,
  useDeleteCaseNoteMutation,
  useUpdateCaseMutation,
  useReassignCaseMutation,
  useRequestSarFilingMutation,
  useLinkAlertToCaseMutation,
  useGetCaseDeviceHistoryQuery,
  useGetCaseTransactionChainQuery,
} from "@/redux/slices/api/casesApi";
import {
  useListAttachmentsQuery,
  useUploadAttachmentMutation,
} from "@/redux/slices/api/attachmentsApi";
import { useListAssignableUsersQuery } from "@/redux/slices/api/authApi";
import { useAppSelector } from "@/redux/store";
import { SkeletonCard } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import UserPicker from "@/components/UserPicker";
import CaseTimeline from "@/components/CaseTimeline";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { CaseStatus } from "@/types/api";

type Tab = "overview" | "devices" | "chain";

/** Valid workflow transitions. ASSIGNED and IN_REVIEW were added in Tier 2. */
const NEXT_STATES: Record<CaseStatus, CaseStatus[]> = {
  OPEN: ["ASSIGNED", "INVESTIGATING", "CLOSED"],
  ASSIGNED: ["IN_REVIEW", "INVESTIGATING", "CLOSED"],
  IN_REVIEW: ["INVESTIGATING", "CLOSED"],
  INVESTIGATING: ["ESCALATED", "SAR_DRAFTED", "CLOSED"],
  ESCALATED: ["SAR_DRAFTED", "CLOSED"],
  SAR_DRAFTED: ["SAR_FILED", "CLOSED"],
  SAR_FILED: ["CLOSED"],
  CLOSED: [],
};

function slaColor(due: string | null): string {
  if (!due) return "";
  const diff = new Date(due).getTime() - Date.now();
  if (diff < 0) return "text-red-600 font-semibold";
  if (diff < 86_400_000) return "text-orange-500 font-semibold"; // < 1 day
  if (diff < 86_400_000 * 3) return "text-amber-500"; // < 3 days
  return "text-gray-900 dark:text-white";
}

// Mirror the backend evidence limits (EVIDENCE_MAX_FILE_SIZE_MB / EVIDENCE_ALLOWED_EXTENSIONS).
const MAX_EVIDENCE_MB = 25;
const MAX_EVIDENCE_BYTES = MAX_EVIDENCE_MB * 1024 * 1024;
const EVIDENCE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.csv,.txt,.eml,.msg,.mp4,.mov,.avi,.mkv,.webm";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = params.id;

  const currentUserId = useAppSelector((s) => s.auth.userId);
  const roles = useAppSelector((s) => s.auth.roles);
  const permissions = useAppSelector((s) => s.auth.permissions);
  // Assigning an investigator is a supervisory action (mirrors the backend
  // assign_cases permission: SYSTEM_ADMIN / SENIOR_ANALYST / COMPLIANCE_OFFICER).
  const canAssign = roles.some((r) =>
    ["SYSTEM_ADMIN", "SENIOR_ANALYST", "COMPLIANCE_OFFICER"].includes(r),
  );
  // Both Level 1 (ANALYST) and Level 2 (SENIOR_ANALYST) hold UPLOAD_EVIDENCE;
  // backend POST /cases/{id}/attachments enforces it for real.
  const canUploadEvidence = permissions.includes("upload_evidence");

  const { data: kase, isLoading, error } = useGetCaseQuery(caseId);
  const { data: users } = useListAssignableUsersQuery();
  const { data: alerts } = useGetCaseAlertsQuery(caseId);
  const { data: history } = useGetCaseHistoryQuery(caseId);
  const { data: notes } = useGetCaseNotesQuery(caseId);
  const { data: attachments } = useListAttachmentsQuery(caseId);
  const { data: deviceHistory } = useGetCaseDeviceHistoryQuery(caseId);
  const { data: txnChain } = useGetCaseTransactionChainQuery({ case_id: caseId });

  const [updateCase, { isLoading: transitioning }] = useUpdateCaseMutation();
  const [reassignCase, { isLoading: assigning }] = useReassignCaseMutation();
  const [requestSarFiling, { isLoading: filingSar }] = useRequestSarFilingMutation();
  const [linkAlert, { isLoading: linking }] = useLinkAlertToCaseMutation();
  const [addNote, { isLoading: addingNote }] = useAddCaseNoteMutation();
  const [deleteNote] = useDeleteCaseNoteMutation();
  const [uploadAttachment, { isLoading: uploadingEvidence }] = useUploadAttachmentMutation();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [linkAlertId, setLinkAlertId] = useState("");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [assignTo, setAssignTo] = useState(kase?.assigned_to ?? "");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDesc, setEvidenceDesc] = useState("");

  if (isLoading) return <SkeletonCard />;
  if (error || !kase) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        Failed to load case {caseId}.
      </div>
    );
  }

  const onTransition = async (to: CaseStatus) => {
    try {
      if (to === "SAR_FILED") {
        await requestSarFiling({ case_id: caseId }).unwrap();
        showToast({
          type: "info",
          title: "Pending approval",
          message: "SAR filing requires four-eyes approval. Check the Approvals queue.",
        });
      } else {
        await updateCase({
          id: caseId,
          to_status: to,
          assigned_to: assignTo.trim() || undefined,
          notes: transitionNotes || undefined,
        }).unwrap();
        showToast({
          type: "success",
          title: "Transitioned",
          message: `Case moved to ${to.replace(/_/g, " ")}.`,
        });
      }
      setTransitionNotes("");
    } catch (e) {
      showToast({ type: "error", title: "Transition failed", message: errorMessage(e) });
    }
  };

  const onAssign = async () => {
    if (!assignTo.trim()) return;
    try {
      // Assignment uses the dedicated /assign endpoint, NOT a status transition.
      await reassignCase({ id: caseId, assigned_to: assignTo.trim() }).unwrap();
      showToast({ type: "success", title: "Assigned", message: assignTo.trim() });
    } catch (e) {
      showToast({ type: "error", title: "Assign failed", message: errorMessage(e) });
    }
  };

  const onAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote({ case_id: caseId, body: newNote.trim() }).unwrap();
      setNewNote("");
    } catch (e) {
      showToast({ type: "error", title: "Could not add note", message: errorMessage(e) });
    }
  };

  const onDeleteNote = async (noteId: string) => {
    try {
      await deleteNote({ case_id: caseId, note_id: noteId }).unwrap();
    } catch (e) {
      showToast({ type: "error", title: "Could not delete note", message: errorMessage(e) });
    }
  };

  const onUploadEvidence = async () => {
    if (!evidenceFile) return;
    if (evidenceFile.size > MAX_EVIDENCE_BYTES) {
      showToast({
        type: "error",
        title: "File too large",
        message: `Maximum evidence file size is ${MAX_EVIDENCE_MB} MB.`,
      });
      return;
    }
    try {
      await uploadAttachment({
        case_id: caseId,
        file: evidenceFile,
        description: evidenceDesc.trim() || undefined,
      }).unwrap();
      showToast({ type: "success", title: "Evidence uploaded", message: evidenceFile.name });
      setEvidenceFile(null);
      setEvidenceDesc("");
    } catch (e) {
      showToast({ type: "error", title: "Upload failed", message: errorMessage(e) });
    }
  };

  const onLinkAlert = async () => {
    if (!linkAlertId.trim()) return;
    try {
      await linkAlert({ case_id: caseId, alert_id: linkAlertId.trim() }).unwrap();
      showToast({ type: "success", title: "Alert linked", message: linkAlertId });
      setLinkAlertId("");
    } catch (e) {
      showToast({ type: "error", title: "Link failed", message: errorMessage(e) });
    }
  };

  const validNext = NEXT_STATES[kase.status] ?? [];
  const slaCls = slaColor(kase.due_date);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Case</p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{kase.title}</h1>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{caseId}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBadge action={kase.case_type} />
          <ActionBadge action={kase.status} />
          <ActionBadge action={kase.priority} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-navy-700 rounded-lg p-1 w-fit" role="tablist">
        {(["overview", "devices", "chain"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={activeTab === t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              activeTab === t
                ? "bg-white dark:bg-navy-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t === "chain" ? "Txn chain" : t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Overview tab ─────────────────────────────────────────────── */}
          {activeTab === "overview" && (<>

          {/* Linked alerts */}
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Linked alerts
            </h2>
            {!alerts || alerts.length === 0 ? (
              <p className="text-sm text-gray-400">No alerts linked yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-navy-600">
                {alerts.map((link) => (
                  <li key={link.id} className="py-2 flex items-center justify-between">
                    <Link
                      href={`/dashboard/alerts/${link.alert_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {link.alert_id.slice(0, 12)}…
                    </Link>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      linked {new Date(link.added_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                aria-label="Alert UUID to link"
                value={linkAlertId}
                onChange={(e) => setLinkAlertId(e.target.value)}
                placeholder="Alert UUID to link"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
              <button
                onClick={onLinkAlert}
                disabled={linking || !linkAlertId.trim()}
                className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                Link
              </button>
            </div>
          </section>

          {/* Investigation notes */}
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Investigation notes
            </h2>
            {!notes || notes.length === 0 ? (
              <p className="text-sm text-gray-400">No notes yet. Add the first one below.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="group rounded-lg bg-gray-50 dark:bg-navy-800 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap flex-1">
                        {n.body}
                      </p>
                      {n.author_id === currentUserId && (
                        <button
                          onClick={() => onDeleteNote(n.id)}
                          className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          aria-label="Delete note"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5 font-mono">
                      {n.author_id ? `${n.author_id.slice(0, 8)}…` : "system"} ·{" "}
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 space-y-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an investigation note…"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
              <div className="flex justify-end">
                <button
                  onClick={onAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  Add note
                </button>
              </div>
            </div>
          </section>

          {/* Evidence files (F8) */}
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Evidence files
            </h2>
            {!attachments || attachments.length === 0 ? (
              <p className="text-sm text-gray-400">No evidence files attached yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-navy-600">
                {attachments.map((att) => (
                  <li key={att.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {att.filename}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatBytes(att.file_size)} · {att.content_type} ·{" "}
                        {new Date(att.uploaded_at).toLocaleDateString()}
                      </p>
                      {att.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                          {att.description}
                        </p>
                      )}
                    </div>
                    {att.download_url && (
                      <a
                        href={att.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-medium text-primary hover:underline"
                      >
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canUploadEvidence && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-navy-600 space-y-3">
                <label
                  htmlFor="evidence-file"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Add evidence
                </label>
                <input
                  id="evidence-file"
                  type="file"
                  accept={EVIDENCE_ACCEPT}
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                <input
                  type="text"
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">
                    Max {MAX_EVIDENCE_MB} MB · PDF, images, Office docs, CSV, email, video.
                  </p>
                  <button
                    onClick={onUploadEvidence}
                    disabled={!evidenceFile || uploadingEvidence}
                    className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {uploadingEvidence ? "Uploading…" : "Upload evidence"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Status timeline (F7) */}
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              Case timeline
            </h2>
            <CaseTimeline entries={history ?? []} />
          </section>

          {kase.narrative && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Narrative
              </h2>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{kase.narrative}</p>
            </section>
          )}

          </>)} {/* end overview tab */}

          {/* ── Device history tab (F9) ───────────────────────────────────── */}
          {activeTab === "devices" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                Device history
              </h2>
              {!deviceHistory || deviceHistory.devices.length === 0 ? (
                <p className="text-sm text-gray-400">No device fingerprints found for transactions in this case.</p>
              ) : (
                <div className="space-y-4">
                  {deviceHistory.devices.map((dev) => (
                    <div
                      key={dev.device_id}
                      className="rounded-lg border border-gray-100 dark:border-navy-600 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className="font-mono text-xs text-primary break-all">{dev.device_id}</p>
                        <div className="flex gap-2 shrink-0">
                          {dev.is_rooted && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Rooted
                            </span>
                          )}
                          {dev.sim_swap_detected && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              SIM swap
                            </span>
                          )}
                          {dev.imei_change_detected && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              IMEI change
                            </span>
                          )}
                          {dev.distinct_customer_count > 1 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              {dev.distinct_customer_count} customers
                            </span>
                          )}
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                        {[
                          ["OS", `${dev.last_os_type ?? "—"} ${dev.last_os_version ?? ""}`],
                          ["MNO", dev.last_mno ?? "—"],
                          ["IMEI", dev.last_imei ?? "—"],
                          ["ICCID", dev.last_iccid ?? "—"],
                          ["Txns", String(dev.transaction_count)],
                          ["First seen", dev.first_seen_at ? new Date(dev.first_seen_at).toLocaleDateString() : "—"],
                          ["Last seen", dev.last_seen_at ? new Date(dev.last_seen_at).toLocaleDateString() : "—"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                            <dd className="font-medium text-gray-900 dark:text-white truncate">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Transaction chain tab (F10) ───────────────────────────────── */}
          {activeTab === "chain" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Transaction chain
                </h2>
                {txnChain && (
                  <span className="text-xs text-gray-400">
                    {txnChain.total_nodes} customers · {txnChain.total_edges} transactions
                  </span>
                )}
              </div>
              {!txnChain || txnChain.edges.length === 0 ? (
                <p className="text-sm text-gray-400">No transaction chain data for this case.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-navy-600">
                        <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Txn ID</th>
                        <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">From</th>
                        <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">To</th>
                        <th className="text-right py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                        <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-navy-700">
                      {txnChain.edges.map((edge) => (
                        <tr key={edge.transaction_id} className="hover:bg-gray-50 dark:hover:bg-navy-800">
                          <td className="py-2 pr-3 font-mono text-primary">
                            <Link
                              href={`/dashboard/transactions/${edge.transaction_id}`}
                              className="hover:underline"
                            >
                              {edge.transaction_id.slice(0, 10)}…
                            </Link>
                          </td>
                          <td className="py-2 pr-3 font-mono text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                            {edge.from ? `${edge.from.slice(0, 10)}…` : "—"}
                          </td>
                          <td className="py-2 pr-3 font-mono text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                            {edge.to ? `${edge.to.slice(0, 10)}…` : "—"}
                          </td>
                          <td className="py-2 pr-3 text-right text-gray-900 dark:text-white">
                            {edge.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2 text-gray-500 dark:text-gray-400">
                            {edge.created_at ? new Date(edge.created_at).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Transition */}
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Transition
            </h3>
            {validNext.length === 0 ? (
              <p className="text-sm text-gray-400">Case is closed.</p>
            ) : (
              <>
                <textarea
                  rows={2}
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                />
                <div className="flex flex-col gap-2">
                  {validNext.map((s) => (
                    <button
                      key={s}
                      onClick={() => onTransition(s)}
                      disabled={transitioning || filingSar}
                      className="px-3 py-2 text-sm font-medium border border-gray-200 dark:border-navy-500 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 text-gray-900 dark:text-white disabled:opacity-50 text-left"
                    >
                      → {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Assignment (F13) */}
          {canAssign && kase.status !== "CLOSED" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Assign investigator
              </h3>
              <UserPicker
                valueField="user_id"
                value={assignTo}
                onChange={setAssignTo}
                ariaLabel="Assign investigator"
                placeholder="Select an investigator…"
              />
              <button
                onClick={onAssign}
                disabled={assigning || !assignTo.trim()}
                className="w-full px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                Assign
              </button>
            </section>
          )}

          {/* STR filing */}
          {kase.status !== "CLOSED" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Filing
              </h3>
              <button
                onClick={() => router.push(`/dashboard/str/new?case_id=${caseId}`)}
                className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600"
              >
                Draft STR from this case
              </button>
            </section>
          )}

          {/* Meta + SLA (F13) */}
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Meta
            </h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Jurisdiction</dt>
                <dd className="text-gray-900 dark:text-white">{kase.jurisdiction_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Assigned to</dt>
                <dd className="text-gray-900 dark:text-white text-xs">
                  {kase.assigned_to
                    ? (users?.find((u) => u.user_id === kase.assigned_to)?.full_name
                        ?? users?.find((u) => u.user_id === kase.assigned_to)?.email
                        ?? `${kase.assigned_to.slice(0, 8)}…`)
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between items-start">
                <dt className="text-gray-500 dark:text-gray-400">SLA due</dt>
                <dd className={`text-right text-xs ${slaCls}`}>
                  {kase.due_date ? (
                    <>
                      {new Date(kase.due_date).toLocaleDateString()}
                      {Date.now() > new Date(kase.due_date).getTime() && (
                        <span className="ml-1 text-red-600">⚠ overdue</span>
                      )}
                    </>
                  ) : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(kase.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
