"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useGetAlertQuery,
  useAssignAlertMutation,
  useAddAlertNoteMutation,
  useResolveAlertMutation,
} from "@/redux/slices/api/alertsApi";
import { useGetTransactionQuery } from "@/redux/slices/api/transactionsApi";
import {
  useGetCustomerRiskProfileQuery,
  useGetCustomerBaselineQuery,
} from "@/redux/slices/api/customersApi";
import { useGetRuleQuery } from "@/redux/slices/api/rulesApi";
import { SkeletonCard } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { showToast } from "@/components/Toast";
import type { AlertResolution } from "@/types/api";

function TriggeredRulePill({ ruleId }: { ruleId: string }) {
  const { data: rule } = useGetRuleQuery(ruleId);
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-navy-600">
      <span className="font-mono text-gray-500 dark:text-gray-400">{ruleId}</span>
      <span className="text-gray-900 dark:text-white">{rule?.rule_name ?? "…"}</span>
      {rule && <ActionBadge action={rule.severity} />}
    </span>
  );
}

export default function AlertDetailPage() {
  const params = useParams<{ alert_id: string }>();
  const router = useRouter();
  const alertId = params.alert_id;

  const { data: alert, isLoading, error } = useGetAlertQuery(alertId);

  const customerId = alert?.customer_id;
  const transactionId = alert?.transaction_id;

  const { data: profile } = useGetCustomerRiskProfileQuery(customerId ?? "", { skip: !customerId });
  const { data: baseline } = useGetCustomerBaselineQuery(customerId ?? "", { skip: !customerId });
  const { data: transaction } = useGetTransactionQuery(transactionId ?? "", { skip: !transactionId });

  const [assignAlert, { isLoading: assigning }] = useAssignAlertMutation();
  const [addNote, { isLoading: addingNote }] = useAddAlertNoteMutation();
  const [resolveAlert, { isLoading: resolving }] = useResolveAlertMutation();

  const [assignTo, setAssignTo] = useState("");
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState<AlertResolution>("False_positive");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [sarFiled, setSarFiled] = useState(false);

  if (isLoading) return <SkeletonCard />;
  if (error || !alert) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        Failed to load alert {alertId}.
      </div>
    );
  }

  const onAssign = async () => {
    if (!assignTo) return;
    try {
      await assignAlert({ alert_id: alertId, analyst_id: assignTo }).unwrap();
      showToast({ type: "success", title: "Assigned", message: `Alert assigned to ${assignTo}` });
      setAssignTo("");
    } catch (e) {
      showToast({ type: "error", title: "Assign failed", message: String(e) });
    }
  };

  const onAddNote = async () => {
    if (!note.trim()) return;
    try {
      await addNote({ alert_id: alertId, note, note_type: "investigation" }).unwrap();
      showToast({ type: "success", title: "Note added", message: "Investigation note recorded." });
      setNote("");
    } catch (e) {
      showToast({ type: "error", title: "Note failed", message: String(e) });
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
      showToast({ type: "success", title: "Resolved", message: `Alert closed (${resolution}).` });
      router.push("/dashboard/alerts");
    } catch (e) {
      showToast({ type: "error", title: "Resolve failed", message: String(e) });
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
              <div className="flex flex-wrap gap-2">
                {alert.triggered_rules.map((rid) => (
                  <TriggeredRulePill key={rid} ruleId={rid} />
                ))}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Transaction
            </h2>
            {!transaction ? (
              <p className="text-sm text-gray-400">Loading transaction…</p>
            ) : (
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
                  {transaction.amount.toLocaleString()} {transaction.currency}
                </dd>
                <dt className="text-gray-500 dark:text-gray-400">Type / channel</dt>
                <dd className="text-gray-900 dark:text-white">
                  {transaction.type} · {transaction.channel}
                </dd>
                <dt className="text-gray-500 dark:text-gray-400">Combined score</dt>
                <dd>
                  <RiskBadge score={transaction.combined_risk_score} />
                </dd>
              </dl>
            )}
          </section>

          {baseline && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Customer baseline ({baseline.period_days}d)
              </h2>
              <dl className="grid grid-cols-3 gap-y-2 gap-x-6 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Avg amount</dt>
                <dd className="col-span-2 font-mono">{baseline.avg_amount.toLocaleString()}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Std dev</dt>
                <dd className="col-span-2 font-mono">{baseline.std_amount.toLocaleString()}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Daily count</dt>
                <dd className="col-span-2 font-mono">{baseline.daily_count}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Channels</dt>
                <dd className="col-span-2 text-xs">{baseline.channels.join(", ")}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Countries</dt>
                <dd className="col-span-2 text-xs">{baseline.countries.join(", ")}</dd>
              </dl>
            </section>
          )}

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Investigation notes
            </h2>
            {alert.notes.length === 0 ? (
              <p className="text-sm text-gray-400">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {alert.notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm text-gray-900 dark:text-white">{n.note}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {n.author} · {new Date(n.timestamp).toLocaleString()} · {n.note_type}
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
            {profile && (
              <dl className="mt-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Risk level</dt>
                  <dd className="text-gray-900 dark:text-white">{profile.risk_level}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">PEP</dt>
                  <dd className="text-gray-900 dark:text-white">{profile.is_pep ? "Yes" : "No"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">KYC quality</dt>
                  <dd className="text-gray-900 dark:text-white">{profile.kyc_quality ?? "—"}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Assign
            </h3>
            <input
              type="email"
              placeholder="analyst@autheo.test"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={onAssign}
              disabled={assigning || !assignTo}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              {assigning ? "Assigning…" : "Assign"}
            </button>
          </section>

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

          {alert.status !== "CLOSED" && (
            <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Resolve
              </h3>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as AlertResolution)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              >
                <option value="False_positive">False positive</option>
                <option value="Legitimate">Legitimate</option>
                <option value="SAR_filed">SAR filed</option>
                <option value="Restricted">Restricted</option>
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
