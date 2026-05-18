"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import {
  useGetComplianceAlertsQuery,
  useGetReviewQueueQuery,
  useLazyGenerateSarQuery,
} from "@/redux/slices/api/complianceApi";
import { useOverrideDecisionMutation, useGetDecisionQuery } from "@/redux/slices/api/decisionsApi";
import { useGetCaseDetailQuery } from "@/redux/slices/api/casesApi";
import { useGetAuditLogsQuery } from "@/redux/slices/api/auditLogsApi";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import RoleGuard from "@/components/RoleGuard";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldExclamationIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  FireIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  UserIcon,
  ListBulletIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

// ─── Decision Panel ───────────────────────────────────────────────────────────

function DecisionPanel({
  decisionId,
  clientId,
  onComplete,
}: {
  decisionId: string;
  clientId: string;
  onComplete: () => void;
}) {
  const { data: decision, isLoading: decisionLoading } = useGetDecisionQuery(
    { decision_id: decisionId, client_id: clientId },
    { skip: !decisionId || !clientId }
  );
  const { data: caseDetail } = useGetCaseDetailQuery(decisionId, {
    skip: !decisionId,
  });
  const [override] = useOverrideDecisionMutation();
  const [generateSar] = useLazyGenerateSarQuery();
  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string } | null>(null);
  const [reason, setReason] = useState("");

  const handleOverride = async (newAction: string) => {
    if (!reason.trim() || reason.length < 5) {
      showToast({ type: "error", title: "Validation", message: "Reason must be at least 5 characters" });
      return;
    }
    try {
      await override({ decision_id: decisionId, new_action: newAction, reason }).unwrap();
      showToast({ type: "success", title: "Decision Updated", message: `Changed to ${newAction}` });
      setReason("");
      setConfirmAction(null);
      onComplete();
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to override decision" });
    }
  };

  const handleEscalateToRegulator = async () => {
    try {
      await generateSar({ client_id: clientId }).unwrap();
      showToast({ type: "success", title: "SAR Generated", message: "Suspicious Activity Report sent to regulator queue." });
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to generate SAR. Check your permissions." });
    }
  };

  if (decisionLoading || !decision) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Loading decision...</div>;
  }

  const contributionColors: Record<string, string> = {
    BLOCK: "text-red-600 dark:text-red-400",
    FREEZE: "text-orange-600 dark:text-orange-400",
    REVIEW: "text-amber-600 dark:text-amber-400",
    FLAG: "text-yellow-600 dark:text-yellow-400",
    ALLOW: "text-green-600 dark:text-green-400",
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[680px]">
      {/* Customer Profile */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5" aria-hidden="true" /> Customer Profile
        </p>
        <div className="grid grid-cols-2 gap-2.5 bg-gray-50 dark:bg-navy-800 rounded-lg p-3">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Customer ID</p>
            {decision.customer_external_id ? (
              <Link
                href={`/dashboard/customers/${decision.customer_external_id}`}
                className="text-xs text-primary hover:text-primary-600 font-medium flex items-center gap-1"
              >
                {decision.customer_external_id}
                <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{decision.customer_id?.slice(0, 12)}…</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Tier at Decision</p>
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{decision.customer_tier_at_decision || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Target Tier</p>
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{decision.target_tier || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Submitted</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{new Date(decision.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Decision Summary */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> Decision Summary
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Action</p>
            <ActionBadge action={decision.action} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Risk Level</p>
            <RiskBadge level={decision.risk_level} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Risk Score</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{decision.risk_score.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Processing</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{decision.processing_time_ms}ms</p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-navy-800 rounded-lg p-2.5 mt-2">
          <p className="text-[10px] text-gray-400 mb-0.5">Escalation Reason</p>
          <p className="text-xs text-gray-700 dark:text-gray-300">{decision.reason}</p>
        </div>
      </div>

      {/* Verification Results */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ExclamationCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Verification Results
        </p>
        {decision.triggered_rules?.length > 0 ? (
          <div className="space-y-1.5">
            {decision.triggered_rules.map((rule, i: number) => (
              <div key={i} className="bg-gray-50 dark:bg-navy-800 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{rule.rule_name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{rule.condition_matched}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-navy-600 text-gray-700 dark:text-gray-300 text-[10px] rounded font-mono">
                      {rule.trigger_code}
                    </span>
                    <span className={`text-[10px] font-semibold ${contributionColors[rule.contribution_to_decision] || "text-gray-500"}`}>
                      → {rule.contribution_to_decision}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No verification rules triggered.</p>
        )}
      </div>

      {/* Compliance Investigation Notes */}
      {caseDetail && caseDetail.notes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" aria-hidden="true" /> Compliance Notes
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {caseDetail.notes.map((note) => (
              <div key={note.id} className="bg-gray-50 dark:bg-navy-800 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-primary">{note.note_type}</span>
                  <span className="text-[10px] text-gray-400">{note.author_email}</span>
                  <span className="ml-auto text-[10px] text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supervisor Decision Buttons */}
      <div className="border-t border-gray-200 dark:border-navy-600 pt-3 space-y-2">
        <p className="text-xs font-semibold text-gray-900 dark:text-white">Supervisor Decision</p>
        <textarea
          placeholder="Reason for decision (min 5 chars)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white resize-none"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setConfirmAction({ action: "ALLOW", label: "Approve" })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Approve
          </button>
          <button
            onClick={() => setConfirmAction({ action: "STEP_UP", label: "Approve with Step-Up" })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> Step-Up
          </button>
          <button
            onClick={() => setConfirmAction({ action: "BLOCK", label: "Reject" })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <XCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Reject
          </button>
          <button
            onClick={() => setConfirmAction({ action: "REVIEW", label: "Further Investigation" })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Investigate
          </button>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleEscalateToRegulator}
            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-medium"
          >
            <DocumentTextIcon className="h-3.5 w-3.5" aria-hidden="true" /> Escalate to Regulator (SAR)
          </button>
          <Link
            href={`/dashboard/compliance/${decisionId}`}
            className="text-xs text-primary hover:text-primary-600"
          >
            Full investigation →
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={`Confirm: ${confirmAction?.label}`}
        message={`Are you sure you want to ${confirmAction?.label?.toLowerCase()} this case? This will change the action to ${confirmAction?.action}.`}
        confirmLabel={confirmAction?.label || "Confirm"}
        variant={confirmAction?.action === "BLOCK" ? "danger" : undefined}
        onConfirm={async () => { if (confirmAction) await handleOverride(confirmAction.action); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

// ─── Supervisor Page ──────────────────────────────────────────────────────────

export default function SupervisorPage() {
  const { clientId } = useAppSelector((s) => s.auth);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Supervisor / Approval | Deferred KYC";
  }, []);

  const { data: alerts, isLoading: alertsLoading, refetch } = useGetComplianceAlertsQuery(
    { client_id: clientId!, limit: 100 },
    { skip: !clientId }
  );

  const { data: reviewQueue, isLoading: reviewLoading } = useGetReviewQueueQuery(
    { client_id: clientId!, limit: 50 },
    { skip: !clientId }
  );

  const { data: auditLogs, isLoading: auditLoading } = useGetAuditLogsQuery(
    { resource_type: "decision", page_size: 30 },
    { skip: !clientId }
  );

  const allAlerts = alerts?.items || [];
  // Include BLOCK, FREEZE, and REVIEW — all cases that need supervisor attention
  const escalatedCases = allAlerts.filter(
    (a) => a.action === "BLOCK" || a.action === "FREEZE" || a.action === "REVIEW"
  );
  const criticalHighCases = allAlerts.filter(
    (a) => a.risk_level === "CRITICAL" || a.risk_level === "VERY_HIGH" || a.risk_level === "HIGH"
  );
  const resolvedCases = allAlerts.filter((a) => a.action === "ALLOW");

  const auditEntries = auditLogs?.items || [];

  const actionIconMap: Record<string, string> = {
    CREATE: "🟢",
    UPDATE: "🔵",
    DELETE: "🔴",
    OVERRIDE: "🟠",
    LOGIN: "⚪",
    APPROVE: "🟢",
    REJECT: "🔴",
  };

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "SUPERVISOR"]}>
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supervisor / Approval Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review escalated cases, approve or reject onboarding decisions
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {/* Stats */}
      {alertsLoading ? (
        <SkeletonStats count={5} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Escalated</p>
              <ShieldExclamationIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">{escalatedCases.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Block + Freeze + Review</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending Review</p>
              <EyeIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-amber-500 mt-1">{reviewQueue?.count || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Awaiting decision</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Critical/High</p>
              <FireIcon className="h-5 w-5 text-orange-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-orange-500 mt-1">{criticalHighCases.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">High risk flagged</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
              <CheckBadgeIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-green-500 mt-1">{resolvedCases.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Approved / cleared</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Flagged</p>
              <ExclamationTriangleIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{alerts?.count || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">All alerts</p>
          </div>
        </div>
      )}

      {/* 1. Escalated Case Queue (2/3) + 2. Decision Review Panel (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Escalated Cases Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Escalated Cases ({escalatedCases.length})
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Cases flagged by compliance officers requiring supervisor decision</p>
          </div>
          {alertsLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Case ID</th>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium">Risk Score</th>
                    <th className="px-4 py-2.5 font-medium">Compliance Rec.</th>
                    <th className="px-4 py-2.5 font-medium">Escalation Reason</th>
                    <th className="px-4 py-2.5 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {escalatedCases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No escalated cases. All clear.</td>
                    </tr>
                  )}
                  {escalatedCases.map((c) => (
                    <tr
                      key={c.decision_id}
                      onClick={() => setSelectedCase(c.decision_id)}
                      className={`cursor-pointer transition-colors ${
                        selectedCase === c.decision_id
                          ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-gray-50 dark:hover:bg-navy-600"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-primary font-semibold">{c.decision_id.slice(0, 10)}…</td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                        {c.customer_name || c.customer_external_id || (
                          <span className="text-gray-400 font-mono">{c.customer_id.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-gray-900 dark:text-white">{c.risk_score.toFixed(1)}</span>
                        <span className="ml-1"><RiskBadge level={c.risk_level} /></span>
                      </td>
                      <td className="px-4 py-2.5"><ActionBadge action={c.action} /></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 max-w-[160px] truncate">{c.reason}</td>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. Decision Review Panel */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Decision Review</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Select a case to view details and take action</p>
          </div>
          {selectedCase && clientId ? (
            <div className="p-4">
              <DecisionPanel
                decisionId={selectedCase}
                clientId={clientId}
                onComplete={() => { refetch(); setSelectedCase(null); }}
              />
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-gray-400">
              <ShieldExclamationIcon className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              <p className="text-xs">Select a case from the queue to review</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Queue */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Review Queue ({reviewQueue?.count || 0})
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Decisions flagged for manual review</p>
        </div>
        {reviewLoading ? (
          <SkeletonTable rows={3} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Decision ID</th>
                  <th className="px-4 py-2.5 font-medium">Risk</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Reason</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {!reviewQueue?.items.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No items pending review.</td>
                  </tr>
                )}
                {reviewQueue?.items.map((item) => (
                  <tr key={item.decision_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-white">{item.decision_id.slice(0, 12)}...</td>
                    <td className="px-4 py-2.5"><RiskBadge level={item.risk_level} /></td>
                    <td className="px-4 py-2.5 text-gray-900 dark:text-white">{item.risk_score.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 max-w-xs truncate">{item.reason}</td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setSelectedCase(item.decision_id)}
                        className="text-primary hover:text-primary-600 text-xs font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Compliance Audit Trail */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600 flex items-center gap-2">
          <ListBulletIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Compliance Audit Trail
            </h2>
            <p className="text-[11px] text-gray-400">Verification steps, compliance officer actions, and supervisor decisions</p>
          </div>
        </div>
        {auditLoading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Timestamp</th>
                  <th className="px-4 py-2.5 font-medium">Actor</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Resource</th>
                  <th className="px-4 py-2.5 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {auditEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No audit events found.</td>
                  </tr>
                )}
                {auditEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                      {entry.actor_email || (
                        <span className="text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1">
                        <span>{actionIconMap[entry.action] || "⚫"}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{entry.action}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                      <span className="font-mono text-[10px] bg-gray-100 dark:bg-navy-600 px-1.5 py-0.5 rounded">
                        {entry.resource_type}
                      </span>
                      {entry.resource_id && (
                        <span className="ml-1 text-gray-400 font-mono">{entry.resource_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                      {entry.details && Object.keys(entry.details).length > 0
                        ? Object.entries(entry.details)
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")
                        : <span className="italic text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </RoleGuard>
  );
}
