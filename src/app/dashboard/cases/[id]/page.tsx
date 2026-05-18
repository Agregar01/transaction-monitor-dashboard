"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGetCaseDetailQuery, useResolveCaseMutation } from "@/redux/slices/api/casesApi";
import { useCreateCaseNoteMutation } from "@/redux/slices/api/customersApi";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import TierBadge from "@/components/TierBadge";
import { SkeletonCard } from "@/components/Skeleton";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  ShieldCheckIcon,
  UserIcon,
  XMarkIcon,
  DocumentArrowUpIcon,
  ShieldExclamationIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    RESOLVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ESCALATED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const icons: Record<string, React.ReactNode> = {
    OPEN: <ClockIcon className="h-4 w-4" />,
    RESOLVED: <CheckCircleIcon className="h-4 w-4" />,
    ESCALATED: <ExclamationTriangleIcon className="h-4 w-4" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.OPEN}`}>
      {icons[status]} {status}
    </span>
  );
}

const noteTypeColors: Record<string, string> = {
  GENERAL: "bg-gray-100 text-gray-600 dark:bg-navy-600 dark:text-gray-400",
  INVESTIGATION: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ESCALATION: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  EDD: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RESOLUTION: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

// ─── Case Timeline ────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  type: "created" | "note" | "resolved" | "escalated";
  label: string;
  description: string | null;
  actor: string | null;
  timestamp: string;
}

function buildTimeline(caseData: import("@/types/api").CaseDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: "created",
    type: "created",
    label: "Case Opened",
    description: caseData.reason || null,
    actor: null,
    timestamp: caseData.created_at,
  });

  for (const note of [...caseData.notes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )) {
    events.push({
      id: note.id,
      type: "note",
      label: note.note_type === "ESCALATION" ? "Escalation Note" : `${note.note_type.charAt(0)}${note.note_type.slice(1).toLowerCase()} Note`,
      description: note.content,
      actor: note.author_email,
      timestamp: note.created_at,
    });
  }

  if (caseData.resolution_status !== "OPEN" && caseData.resolved_at) {
    events.push({
      id: "resolution",
      type: caseData.resolution_status === "ESCALATED" ? "escalated" : "resolved",
      label: caseData.resolution_status === "ESCALATED" ? "Case Escalated" : "Case Resolved",
      description: caseData.resolution_note || null,
      actor: caseData.resolved_by || null,
      timestamp: caseData.resolved_at,
    });
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

const timelineIconMap = {
  created: { Icon: ListBulletIcon, bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-600 dark:text-blue-400" },
  note: { Icon: ChatBubbleLeftEllipsisIcon, bg: "bg-gray-100 dark:bg-navy-600", color: "text-gray-600 dark:text-gray-400" },
  resolved: { Icon: CheckCircleIcon, bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" },
  escalated: { Icon: ShieldExclamationIcon, bg: "bg-red-100 dark:bg-red-900/30", color: "text-red-600 dark:text-red-400" },
} as const;

function CaseTimeline({ caseData }: { caseData: import("@/types/api").CaseDetail }) {
  const events = buildTimeline(caseData);

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <DocumentArrowUpIcon className="h-5 w-5" />
        Case Timeline
        <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-navy-600 text-xs text-gray-600 dark:text-gray-400">
          {events.length}
        </span>
      </h2>

      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 dark:bg-navy-600" aria-hidden="true" />

        <ol className="space-y-5">
          {events.map((event) => {
            const { Icon, bg, color } = timelineIconMap[event.type];
            return (
              <li key={event.id} className="relative flex gap-4">
                {/* Icon bubble */}
                <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{event.label}</span>
                    {event.actor && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">by {event.actor}</span>
                    )}
                    <time className="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </time>
                  </div>
                  {event.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{event.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  useEffect(() => { document.title = `Case ${id?.slice(0, 12)} | Deferred KYC`; }, [id]);

  const { data: caseData, isLoading } = useGetCaseDetailQuery(id);
  const [resolveCase, { isLoading: resolving }] = useResolveCaseMutation();
  const [createNote, { isLoading: creatingNote }] = useCreateCaseNoteMutation();

  const [showResolve, setShowResolve] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState("RESOLVED");
  const [resolutionNote, setResolutionNote] = useState("");
  const [newAction, setNewAction] = useState("");
  const [resolveError, setResolveError] = useState("");

  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("REVIEW");

  const handleResolve = async () => {
    if (!resolutionNote.trim()) return;
    setResolveError("");
    try {
      await resolveCase({
        decision_id: id,
        resolution_status: resolutionStatus,
        resolution_note: resolutionNote,
        new_action: newAction || undefined,
      }).unwrap();
      setShowResolve(false);
      setResolutionNote("");
      setNewAction("");
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setResolveError(e?.data?.detail || "Failed to resolve case");
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !caseData?.customer_external_id) return;
    try {
      await createNote({
        external_id: caseData.customer_external_id,
        content: noteContent,
        note_type: noteType,
        decision_id: id,
      }).unwrap();
      setNoteContent("");
    } catch {
      // RTK handles
    }
  };

  if (isLoading) return <div className="space-y-6"><SkeletonCard /><SkeletonCard /></div>;
  if (!caseData) return <div className="text-red-500">Case not found</div>;

  return (
    <ClientGuard>
      <RoleGuard allowedRoles={["OWNER", "ADMIN", "COMPLIANCE", "SUPERVISOR", "OPERATIONS"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/cases" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Case {caseData.decision_id.slice(0, 12)}...
                </h1>
                <StatusBadge status={caseData.resolution_status} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{caseData.reason}</p>
            </div>
          </div>
          {caseData.resolution_status === "OPEN" && (
            <button
              onClick={() => setShowResolve(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors self-start sm:self-auto"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Resolve Case
            </button>
          )}
        </div>

        {/* Summary cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Decision Info */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4" /> Decision
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Action</span>
                <ActionBadge action={caseData.action} />
              </div>
              {caseData.workflow && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Workflow</span>
                  <span className="text-gray-900 dark:text-white font-medium">{caseData.workflow}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Risk Level</span>
                <RiskBadge level={caseData.risk_level} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Risk Score</span>
                <span className="text-gray-900 dark:text-white font-mono">{caseData.risk_score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tier at Decision</span>
                <TierBadge tier={caseData.customer_tier_at_decision} />
              </div>
              {caseData.target_tier && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Target Tier</span>
                  <TierBadge tier={caseData.target_tier} />
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Processing</span>
                <span className="text-gray-900 dark:text-white">{caseData.processing_time_ms}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-gray-900 dark:text-white text-xs">{new Date(caseData.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> Customer
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">External ID</span>
                {caseData.customer_external_id ? (
                  <Link
                    href={`/dashboard/customers/${caseData.customer_external_id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {caseData.customer_external_id}
                  </Link>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Entity Type</span>
                <span className="text-gray-900 dark:text-white">{caseData.customer_entity_type || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Current Tier</span>
                {caseData.customer_tier ? <TierBadge tier={caseData.customer_tier} /> : <span className="text-gray-400">—</span>}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Current Risk</span>
                {caseData.customer_risk_level ? <RiskBadge level={caseData.customer_risk_level} /> : <span className="text-gray-400">—</span>}
              </div>
              {caseData.customer_created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Registered</span>
                  <span className="text-gray-900 dark:text-white text-xs">{new Date(caseData.customer_created_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Resolution Info */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4" /> Resolution
            </h3>
            {caseData.resolution_status === "OPEN" ? (
              <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <ClockIcon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Awaiting review</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <StatusBadge status={caseData.resolution_status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Resolved By</span>
                  <span className="text-gray-900 dark:text-white text-xs">{caseData.resolved_by}</span>
                </div>
                {caseData.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Resolved At</span>
                    <span className="text-gray-900 dark:text-white text-xs">{new Date(caseData.resolved_at).toLocaleString()}</span>
                  </div>
                )}
                {caseData.resolution_note && (
                  <div className="pt-2 border-t dark:border-navy-600">
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Resolution Note</p>
                    <p className="text-gray-900 dark:text-white text-sm">{caseData.resolution_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Triggered Rules */}
        {caseData.triggered_rules && caseData.triggered_rules.length > 0 && (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-navy-600">
              <h2 className="font-semibold text-gray-900 dark:text-white">Triggered Rules</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800">
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-2 font-medium text-xs">Rule Code</th>
                    <th className="px-6 py-2 font-medium text-xs">Name</th>
                    <th className="px-6 py-2 font-medium text-xs">Condition</th>
                    <th className="px-6 py-2 font-medium text-xs">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {caseData.triggered_rules.map((rule, i) => (
                    <tr key={i} className="border-t dark:border-navy-600">
                      <td className="px-6 py-2 font-mono text-xs text-primary font-semibold">{rule.trigger_code}</td>
                      <td className="px-6 py-2 text-gray-900 dark:text-white">{rule.rule_name}</td>
                      <td className="px-6 py-2 text-gray-600 dark:text-gray-300 text-xs">{rule.condition_matched}</td>
                      <td className="px-6 py-2 text-gray-600 dark:text-gray-300 text-xs">{rule.contribution_to_decision}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Decision Details (raw JSON) */}
        {caseData.details && Object.keys(caseData.details).length > 0 && (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Decision Details</h2>
            <pre className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-64">
              {JSON.stringify(caseData.details, null, 2)}
            </pre>
          </div>
        )}

        {/* Case Notes */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
            Case Notes
            {caseData.notes.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-navy-600 text-xs text-gray-600 dark:text-gray-400">
                {caseData.notes.length}
              </span>
            )}
          </h2>

          {/* Add note form */}
          {caseData.customer_external_id && (
            <div className="mb-4 flex gap-2">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              >
                <option value="REVIEW">Review</option>
                <option value="INVESTIGATION">Investigation</option>
                <option value="ESCALATION">Escalation</option>
                <option value="EDD">Enhanced Due Diligence</option>
                <option value="RESOLUTION">Resolution</option>
                <option value="GENERAL">General</option>
              </select>
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note about this case..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
              />
              <button
                onClick={handleAddNote}
                disabled={creatingNote || !noteContent.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {creatingNote ? "..." : "Add"}
              </button>
            </div>
          )}

          {caseData.notes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No case notes yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {caseData.notes.map((note) => (
                <div key={note.id} className="border border-gray-100 dark:border-navy-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${noteTypeColors[note.note_type] || noteTypeColors.GENERAL}`}>
                      {note.note_type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{note.author_email}</span>
                    {note.author_role && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">({note.author_role})</span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Case Timeline */}
        <CaseTimeline caseData={caseData} />

        {/* Resolve Modal */}
        {showResolve && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resolve Case</h2>
                <button onClick={() => { setShowResolve(false); setResolveError(""); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution</label>
                  <select
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value)}
                    className="w-full border dark:border-navy-500 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="RESOLVED">Resolved</option>
                    <option value="ESCALATED">Escalated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Change Action (optional)
                  </label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    className="w-full border dark:border-navy-500 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Keep current ({caseData.action})</option>
                    <option value="ALLOW">Change to ALLOW</option>
                    <option value="BLOCK">Change to BLOCK</option>
                    <option value="FREEZE">Change to FREEZE</option>
                    <option value="REVIEW">Change to REVIEW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution Note *
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Describe the resolution, findings, or reason for escalation..."
                    rows={4}
                    className="w-full border dark:border-navy-500 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {resolveError && (
                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{resolveError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowResolve(false); setResolveError(""); }}
                    className="flex-1 border dark:border-navy-500 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={resolving || !resolutionNote.trim()}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                      resolutionStatus === "ESCALATED"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {resolving ? "Resolving..." : resolutionStatus === "ESCALATED" ? "Escalate" : "Resolve"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </RoleGuard>
    </ClientGuard>
  );
}
