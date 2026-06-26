"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useGetAlertQuery,
  useAssignAlertMutation,
  useAddAlertNoteMutation,
  useResolveAlertMutation,
  useEscalateAlertMutation,
} from "@/redux/slices/api/alertsApi";
import { useListAssignableUsersQuery } from "@/redux/slices/api/authApi";
import { useAppSelector } from "@/redux/store";
import { SkeletonCard } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import UserPicker from "@/components/UserPicker";
import { showToast } from "@/components/Toast";
import type { AlertResolution, TriggeredRuleDetail } from "@/types/api";
import { resolutionLabels } from "@/config/constants";
import { errorMessage } from "@/lib/errors";

// Assigning / reassigning an alert is a supervisory action.
const CAN_ASSIGN_ROLES = ["SYSTEM_ADMIN", "SENIOR_ANALYST", "COMPLIANCE_OFFICER"];

function TriggeredRuleRow({ rule }: { rule: TriggeredRuleDetail }) {
  // Show the explanation only when it adds information beyond the rule name —
  // many are boilerplate like "Python-backed rule: <name>" that just repeats it.
  const expl = rule.explanation?.trim();
  const redundant =
    !expl ||
    expl === rule.rule_name ||
    expl.toLowerCase() === `python-backed rule: ${rule.rule_name}`.toLowerCase();

  return (
    <li className="flex items-baseline gap-3 py-2">
      <span className="font-mono text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0 tabular-nums">
        {rule.rule_id}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-900 dark:text-white">{rule.rule_name}</span>
          <ActionBadge action={rule.severity} />
        </div>
        {!redundant && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{expl}</p>
        )}
      </div>
      {rule.risk_contribution > 0 && (
        <span className="text-xs font-semibold text-primary tabular-nums shrink-0">
          +{rule.risk_contribution}
        </span>
      )}
    </li>
  );
}

export default function AlertDetailPage() {
  const params = useParams<{ alert_id: string }>();
  const router = useRouter();
  const alertId = params.alert_id;

  const { data: alert, isLoading, error } = useGetAlertQuery(alertId);
  const { data: users } = useListAssignableUsersQuery();
  const roles = useAppSelector((s) => s.auth.roles);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canAssign = roles.some((r) => CAN_ASSIGN_ROLES.includes(r));
  // L1 analysts (and above) hold close_alerts — they may escalate to a supervisor.
  const canEscalate = permissions.includes("close_alerts");

  const [assignAlert, { isLoading: assigning }] = useAssignAlertMutation();
  const [addNote, { isLoading: addingNote }] = useAddAlertNoteMutation();
  const [resolveAlert, { isLoading: resolving }] = useResolveAlertMutation();
  const [escalateAlert] = useEscalateAlertMutation();

  const [assignTo, setAssignTo] = useState("");
  const [showReassign, setShowReassign] = useState(false);
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState<AlertResolution>("FALSE_POSITIVE");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [sarFiled, setSarFiled] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalating, setEscalating] = useState(false);

  if (isLoading) return <SkeletonCard />;
  if (error || !alert) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        Failed to load alert {alertId}.
      </div>
    );
  }

  const customer = alert.customer_context;
  const transaction = alert.transaction_context;

  // "Who's working on it" — derived from the analysts who've logged notes,
  // since we record activity rather than auto-claiming the alert.
  const workedBy = Array.from(
    new Set((alert.investigation_notes ?? []).map((n) => n.analyst).filter(Boolean)),
  );

  // Escalate to a Level 2 supervisor via the backend's atomic endpoint: it
  // creates a case, links this alert, and drives OPEN → INVESTIGATING →
  // ESCALATED in a single commit (idempotent), then returns the case.
  const onEscalate = async () => {
    if (!escalateReason.trim()) {
      showToast({ type: "warning", title: "Reason required", message: "Add a reason before escalating." });
      return;
    }
    setEscalating(true);
    try {
      const kase = await escalateAlert({ alert_id: alertId, reason: escalateReason.trim() }).unwrap();
      showToast({ type: "success", title: "Escalated", message: "Case opened for supervisor review." });
      router.push(`/dashboard/cases/${kase.id}`);
    } catch (e) {
      showToast({ type: "error", title: "Escalation failed", message: errorMessage(e) });
    } finally {
      setEscalating(false);
    }
  };

  const onAssign = async () => {
    if (!assignTo) return;
    try {
      await assignAlert({ alert_id: alertId, analyst_id: assignTo }).unwrap();
      showToast({ type: "success", title: "Assigned", message: `Alert assigned to ${assignTo}` });
      setAssignTo("");
      setShowReassign(false);
    } catch (e) {
      showToast({ type: "error", title: "Assign failed", message: errorMessage(e) });
    }
  };

  const onAddNote = async () => {
    if (!note.trim()) return;
    try {
      await addNote({ alert_id: alertId, note, note_type: "investigation" }).unwrap();
      showToast({ type: "success", title: "Note added", message: "Investigation note recorded." });
      setNote("");
    } catch (e) {
      showToast({ type: "error", title: "Note failed", message: errorMessage(e) });
    }
  };

  const onResolve = async () => {
    if (!resolutionNotes.trim()) {
      showToast({ type: "warning", title: "Notes required", message: "Add resolution notes before closing." });
      return;
    }
    try {
      await resolveAlert({
        alert_id: alertId,
        resolution,
        resolution_notes: resolutionNotes,
        sar_filed: sarFiled,
      }).unwrap();
      showToast({
        type: "success",
        title: "Resolved",
        message: `Alert closed (${resolutionLabels[resolution] ?? resolution}).`,
      });
      router.push("/dashboard/alerts");
    } catch (e) {
      showToast({ type: "error", title: "Resolve failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Alert</p>
          <h1 className="font-mono text-lg text-gray-900 dark:text-white">{alertId}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date(alert.alert_timestamp).toLocaleString()}
          </p>
          <p className="text-xs mt-1">
            <span className="text-gray-500 dark:text-gray-400">Assigned to: </span>
            {alert.assigned_to ? (
              <span className="font-medium text-gray-900 dark:text-white">
                {users?.find((u) => u.email === alert.assigned_to || u.user_id === alert.assigned_to)?.full_name
                  ?? alert.assigned_to}
              </span>
            ) : (
              <span className="text-gray-400">Unassigned</span>
            )}
          </p>
          {workedBy.length > 0 && (
            <p className="text-xs mt-1">
              <span className="text-gray-500 dark:text-gray-400">Worked by: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {workedBy
                  .map(
                    (a) =>
                      users?.find((u) => u.email === a || u.user_id === a)?.full_name ?? a,
                  )
                  .join(", ")}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBadge action={alert.priority} />
          <ActionBadge action={alert.status} />
          <RiskBadge score={alert.risk_score} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Triggered rules
            </h2>
            {alert.triggered_rules.length === 0 ? (
              <p className="text-sm text-gray-400">No rules recorded.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-navy-600">
                {alert.triggered_rules.map((r) => (
                  <TriggeredRuleRow key={r.rule_id} rule={r} />
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Transaction
            </h2>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">ID</dt>
              <dd className="font-mono text-xs">
                <Link
                  href={`/dashboard/transactions/${transaction.transaction_id}`}
                  className="text-primary hover:underline"
                >
                  {transaction.transaction_id}
                </Link>
              </dd>
              <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
              <dd className="text-gray-900 dark:text-white font-mono">
                {transaction.amount.toLocaleString()}
              </dd>
              <dt className="text-gray-500 dark:text-gray-400">Type / channel</dt>
              <dd className="text-gray-900 dark:text-white">
                {transaction.transaction_type} · {transaction.channel}
              </dd>
              <dt className="text-gray-500 dark:text-gray-400">Combined score</dt>
              <dd>
                <RiskBadge score={transaction.combined_risk_score} />
              </dd>
            </dl>
          </section>

          {Object.keys(alert.baseline_comparisons ?? {}).length > 0 && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Baseline deviations
              </h2>
              <dl className="grid grid-cols-3 gap-y-2 gap-x-6 text-sm">
                {Object.entries(alert.baseline_comparisons).map(([metric, cmp]) => (
                  <div key={metric} className="contents">
                    <dt className="text-gray-500 dark:text-gray-400">{metric}</dt>
                    <dd className="font-mono text-xs">
                      {cmp.current_value.toLocaleString()} vs {cmp.baseline_value.toLocaleString()}
                    </dd>
                    <dd
                      className={`text-xs font-mono text-right ${
                        cmp.is_anomalous ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {cmp.deviation_percentage.toFixed(1)}%
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Investigation notes
            </h2>
            {alert.investigation_notes.length === 0 ? (
              <p className="text-sm text-gray-400">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {alert.investigation_notes.map((n) => (
                  <li key={n.note_id} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm text-gray-900 dark:text-white">{n.content}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {n.analyst} · {new Date(n.timestamp).toLocaleString()} · {n.note_type}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Customer
            </h3>
            <Link
              href={`/dashboard/customers/${alert.customer_id}`}
              className="font-mono text-xs text-primary hover:underline break-all"
            >
              {alert.customer_id}
            </Link>
            <dl className="mt-3 text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Risk level</dt>
                <dd className="text-gray-900 dark:text-white">{customer.risk_level}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Risk score</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs">
                  {customer.risk_score}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">PEP</dt>
                <dd className="text-gray-900 dark:text-white">{customer.is_pep ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Open alerts</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs">
                  {customer.open_alerts}
                </dd>
              </div>
            </dl>
          </section>

          {canAssign && (!alert.assigned_to || showReassign) && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {alert.assigned_to ? "Reassign" : "Assign"}
                </h3>
                {showReassign && (
                  <button
                    onClick={() => {
                      setShowReassign(false);
                      setAssignTo("");
                    }}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <UserPicker
                valueField="email"
                value={assignTo}
                onChange={setAssignTo}
                ariaLabel="Assign to analyst"
                placeholder="Select an analyst…"
              />
              <button
                onClick={onAssign}
                disabled={assigning || !assignTo}
                className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                {assigning ? "Assigning…" : alert.assigned_to ? "Reassign" : "Assign"}
              </button>
            </section>
          )}
          {canAssign && alert.assigned_to && !showReassign && alert.status !== "CLOSED" && (
            <button
              onClick={() => setShowReassign(true)}
              className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline py-1"
            >
              Reassign this alert
            </button>
          )}

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Add note
            </h3>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you find?"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={onAddNote}
              disabled={addingNote || !note.trim()}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              {addingNote ? "Saving…" : "Save note"}
            </button>
          </section>

          {canEscalate && alert.status !== "CLOSED" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Escalate to supervisor
              </h3>
              {!showEscalate ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Opens an investigation case from this alert and routes it to a Level 2 supervisor.
                  </p>
                  <button
                    onClick={() => setShowEscalate(true)}
                    className="w-full bg-amber-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-600"
                  >
                    Escalate
                  </button>
                </>
              ) : (
                <>
                  <textarea
                    rows={3}
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Why are you escalating this? (required)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowEscalate(false);
                        setEscalateReason("");
                      }}
                      disabled={escalating}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onEscalate}
                      disabled={escalating || !escalateReason.trim()}
                      className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                      {escalating ? "Escalating…" : "Confirm escalation"}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {alert.status !== "CLOSED" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Resolve
              </h3>
              <select
                aria-label="Resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value as AlertResolution)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              >
                <option value="FALSE_POSITIVE">{resolutionLabels.FALSE_POSITIVE}</option>
                <option value="LEGITIMATE">{resolutionLabels.LEGITIMATE}</option>
                <option value="SAR_FILED">{resolutionLabels.SAR_FILED}</option>
                <option value="RESTRICTED">{resolutionLabels.RESTRICTED}</option>
              </select>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Resolution narrative"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={sarFiled}
                  onChange={(e) => setSarFiled(e.target.checked)}
                />
                Mark as SAR filed
              </label>
              <button
                onClick={onResolve}
                disabled={resolving}
                className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {resolving ? "Closing…" : "Close alert"}
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
