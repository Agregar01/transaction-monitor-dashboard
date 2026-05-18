"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useGetCaseQuery,
  useGetCaseAlertsQuery,
  useGetCaseHistoryQuery,
  useUpdateCaseMutation,
  useLinkAlertToCaseMutation,
} from "@/redux/slices/api/casesApi";
import { SkeletonCard } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import { showToast } from "@/components/Toast";
import type { CaseStatus } from "@/types/api";

/**
 * Valid transitions out of each state. SAR_DRAFTED → SAR_FILED goes via
 * four-eyes server-side; we still surface it here.
 */
const NEXT_STATES: Record<CaseStatus, CaseStatus[]> = {
  OPEN: ["INVESTIGATING", "CLOSED"],
  INVESTIGATING: ["ESCALATED", "SAR_DRAFTED", "CLOSED"],
  ESCALATED: ["SAR_DRAFTED", "CLOSED"],
  SAR_DRAFTED: ["SAR_FILED", "CLOSED"],
  SAR_FILED: ["CLOSED"],
  CLOSED: [],
};

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = params.id;

  const { data: kase, isLoading, error } = useGetCaseQuery(caseId);
  const { data: alerts } = useGetCaseAlertsQuery(caseId);
  const { data: history } = useGetCaseHistoryQuery(caseId);

  const [updateCase, { isLoading: transitioning }] = useUpdateCaseMutation();
  const [linkAlert, { isLoading: linking }] = useLinkAlertToCaseMutation();

  const [linkAlertId, setLinkAlertId] = useState("");
  const [transitionNotes, setTransitionNotes] = useState("");

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
      await updateCase({ id: caseId, to_status: to, notes: transitionNotes || undefined }).unwrap();
      if (to === "SAR_FILED") {
        showToast({
          type: "info",
          title: "Pending approval",
          message: "SAR filing requires four-eyes approval. Check the Approvals queue.",
        });
      } else {
        showToast({
          type: "success",
          title: "Transitioned",
          message: `Case moved to ${to.replace(/_/g, " ")}.`,
        });
      }
      setTransitionNotes("");
    } catch (e) {
      showToast({ type: "error", title: "Transition failed", message: String(e) });
    }
  };

  const onLinkAlert = async () => {
    if (!linkAlertId.trim()) return;
    try {
      await linkAlert({ case_id: caseId, alert_id: linkAlertId.trim() }).unwrap();
      showToast({ type: "success", title: "Alert linked", message: linkAlertId });
      setLinkAlertId("");
    } catch (e) {
      showToast({ type: "error", title: "Link failed", message: String(e) });
    }
  };

  const validNext = NEXT_STATES[kase.status] ?? [];

  return (
    <div className="space-y-6">
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
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Linked alerts
            </h2>
            {!alerts || alerts.items.length === 0 ? (
              <p className="text-sm text-gray-400">No alerts linked yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-navy-600">
                {alerts.items.map((a) => (
                  <li key={a.alert_id} className="py-2 flex items-center justify-between">
                    <Link
                      href={`/dashboard/alerts/${a.alert_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {a.alert_id.slice(0, 8)}…
                    </Link>
                    <div className="flex items-center gap-2">
                      <ActionBadge action={a.priority} />
                      <RiskBadge score={a.risk_score} bandOnly />
                    </div>
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

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Status history
            </h2>
            {!history || history.length === 0 ? (
              <p className="text-sm text-gray-400">No transitions recorded.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {h.from_status ? `${h.from_status} → ` : ""}
                      <strong>{h.to_status.replace(/_/g, " ")}</strong>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {h.changed_by} · {new Date(h.changed_at).toLocaleString()}
                    </p>
                    {h.notes && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{h.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
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

        <aside className="space-y-6">
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
                      disabled={transitioning}
                      className="px-3 py-2 text-sm font-medium border border-gray-200 dark:border-navy-500 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      → {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

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

          <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Meta
            </h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Jurisdiction</dt>
                <dd className="text-gray-900 dark:text-white">{kase.jurisdiction_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Assigned to</dt>
                <dd className="text-gray-900 dark:text-white truncate">{kase.assigned_to ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Due</dt>
                <dd className="text-gray-900 dark:text-white">
                  {kase.due_date ? new Date(kase.due_date).toLocaleDateString() : "—"}
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
