"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import { useGetDecisionQuery, useOverrideDecisionMutation } from "@/redux/slices/api/decisionsApi";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import TierBadge from "@/components/TierBadge";
import { ArrowLeftIcon, UserIcon } from "@heroicons/react/24/outline";
import ClientGuard from "@/components/ClientGuard";

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const [showOverride, setShowOverride] = useState(false);
  const [overrideAction, setOverrideAction] = useState("ALLOW");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideDecision, { isLoading: overriding }] = useOverrideDecisionMutation();

  const { data: decision, isLoading, error } = useGetDecisionQuery({
    decision_id: id,
    client_id: clientId,
  });

  if (isLoading) return <div className="text-gray-400 dark:text-gray-500 p-8">Loading...</div>;
  if (error || !decision) return <div className="text-red-500 p-8">Decision not found</div>;

  return (
    <ClientGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/decisions" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Decision Detail</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-mono">{decision.decision_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {decision.customer_external_id && (
            <Link
              href={`/dashboard/customers/${decision.customer_external_id}`}
              className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              View Customer
            </Link>
          )}
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            Override Decision
          </button>
        </div>
      </div>

      {/* Override Form */}
      {showOverride && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-4">Override Decision</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Action</label>
              <select
                value={overrideAction}
                onChange={(e) => setOverrideAction(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-navy-500 bg-white dark:bg-navy-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
              >
                <option value="ALLOW">ALLOW</option>
                <option value="BLOCK">BLOCK</option>
                <option value="FREEZE">FREEZE</option>
                <option value="REVIEW">REVIEW</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Provide a reason for the override..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-navy-500 bg-white dark:bg-navy-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={async () => {
                if (!overrideReason.trim()) return;
                await overrideDecision({
                  decision_id: id,
                  new_action: overrideAction,
                  reason: overrideReason,
                });
                setShowOverride(false);
                setOverrideReason("");
              }}
              disabled={overriding || !overrideReason.trim()}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {overriding ? "Submitting..." : "Submit Override"}
            </button>
            <button
              onClick={() => { setShowOverride(false); setOverrideReason(""); }}
              className="bg-gray-200 dark:bg-navy-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-navy-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Action</p>
          <ActionBadge action={decision.action} />
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risk Level</p>
          <RiskBadge level={decision.risk_level} />
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risk Score</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{decision.risk_score}</p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Latency</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{decision.processing_time_ms}ms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Info */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Event Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Event ID</span>
              <span className="font-mono text-xs text-gray-900 dark:text-gray-200">{decision.event_id}</span>
            </div>
            {decision.customer_external_id && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Customer</span>
                <Link
                  href={`/dashboard/customers/${decision.customer_external_id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {decision.customer_external_id}
                </Link>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Tier at Decision</span>
              <TierBadge tier={decision.customer_tier_at_decision} />
            </div>
            {decision.target_tier && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Target Tier</span>
                <TierBadge tier={decision.target_tier} />
              </div>
            )}
            {decision.workflow && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Workflow</span>
                <span className="font-mono text-xs text-primary font-semibold">{decision.workflow}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Created</span>
              <span className="text-gray-900 dark:text-gray-200">{new Date(decision.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Decision Reason</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{decision.reason}</p>
          {decision.details && Object.keys(decision.details).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Details</p>
              <pre className="bg-gray-50 dark:bg-navy-800 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                {JSON.stringify(decision.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Triggered Rules */}
      {decision.triggered_rules && decision.triggered_rules.length > 0 && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Triggered Rules ({decision.triggered_rules.length})
          </h2>
          <div className="space-y-3">
            {decision.triggered_rules.map((rule) => (
              <div
                key={rule.rule_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 dark:bg-navy-800 rounded-lg px-4 py-3 gap-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.rule_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{rule.trigger_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{rule.condition_matched}</p>
                  <p className="text-xs font-semibold text-primary">{rule.contribution_to_decision}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </ClientGuard>
  );
}
