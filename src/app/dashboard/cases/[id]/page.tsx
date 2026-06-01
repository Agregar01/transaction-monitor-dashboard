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
  useRequestSarFilingMutation,
  useLinkAlertToCaseMutation,
} from "@/redux/slices/api/casesApi";
import { useListAttachmentsQuery } from "@/redux/slices/api/attachmentsApi";
import { useAppSelector } from "@/redux/store";
import { SkeletonCard } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import CaseTimeline from "@/components/CaseTimeline";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { CaseStatus } from "@/types/api";

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

  const { data: kase, isLoading, error } = useGetCaseQuery(caseId);
  const { data: alerts } = useGetCaseAlertsQuery(caseId);
  const { data: history } = useGetCaseHistoryQuery(caseId);
  const { data: notes } = useGetCaseNotesQuery(caseId);
  const { data: attachments } = useListAttachmentsQuery(caseId);

  const [updateCase, { isLoading: transitioning }] = useUpdateCaseMutation();
  const [requestSarFiling, { isLoading: filingSar }] = useRequestSarFilingMutation();
  const [linkAlert, { isLoading: linking }] = useLinkAlertToCaseMutation();
  const [addNote, { isLoading: addingNote }] = useAddCaseNoteMutation();
  const [deleteNote] = useDeleteCaseNoteMutation();

  const [linkAlertId, setLinkAlertId] = useState("");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [assignTo, setAssignTo] = useState(kase?.assigned_to ?? "");

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
      await updateCase({
        id: caseId,
        to_status: kase.status,
        assigned_to: assignTo.trim(),
      }).unwrap();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
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
              <p className="text-sm text-gray-400">
                No evidence files attached.{" "}
                <span className="italic">
                  (Upload via the API — S3 storage must be enabled on this deployment.)
                </span>
              </p>
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
          {kase.status !== "CLOSED" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Assign investigator
              </h3>
              <input
                type="text"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                placeholder="User UUID or email"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
              <button
                onClick={onAssign}
                disabled={transitioning || !assignTo.trim()}
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
                <dd className="text-gray-900 dark:text-white font-mono text-xs">
                  {kase.assigned_to ? `${kase.assigned_to.slice(0, 8)}…` : "—"}
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
