"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import { useGetDecisionQuery, useOverrideDecisionMutation } from "@/redux/slices/api/decisionsApi";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import TierBadge from "@/components/TierBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import RoleGuard from "@/components/RoleGuard";
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

const RULE_CATEGORIES: Record<string, { label: string; color: string }> = {
  TXN: { label: "Transaction", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  ACT: { label: "Action", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  BEH: { label: "Behavioral", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  RSK: { label: "Risk", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  TIM: { label: "Time-based", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  REG: { label: "Regulatory", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  EXT: { label: "External", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  BIZ: { label: "Business", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

function getRuleCategory(code: string) {
  const prefix = code.split("_")[0];
  return RULE_CATEGORIES[prefix] || { label: "Other", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
}

export default function InvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const decisionId = params.id as string;
  const { clientId, isAdmin } = useAppSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState<"overview" | "rules" | "context" | "audit">("overview");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideAction, setOverrideAction] = useState("ALLOW");
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    document.title = `Investigation: ${decisionId} | Deferred KYC`;
  }, [decisionId]);

  const { data: decision, isLoading, error } = useGetDecisionQuery(
    { decision_id: decisionId, client_id: clientId ?? "" },
    { skip: (!clientId && !isAdmin) || !decisionId }
  );

  const [override, { isLoading: overriding }] = useOverrideDecisionMutation();

  const handleOverride = async () => {
    if (!overrideReason.trim() || overrideReason.length < 5) {
      showToast({ type: "error", title: "Validation Error", message: "Reason must be at least 5 characters" });
      return;
    }
    try {
      await override({
        decision_id: decisionId,
        new_action: overrideAction,
        reason: overrideReason,
      }).unwrap();
      showToast({ type: "success", title: "Override Applied", message: "Decision overridden successfully" });
      setOverrideOpen(false);
      setOverrideReason("");
    } catch {
      showToast({ type: "error", title: "Override Failed", message: "Failed to override decision" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonCard /></div>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="text-center py-20">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-500 dark:text-gray-400">Decision not found</p>
        <Link href="/dashboard/compliance" className="text-primary hover:text-primary-600 text-sm mt-2 inline-block">
          Back to Compliance
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "rules" as const, label: `Rules (${(decision.triggered_rules || []).length})` },
    { id: "context" as const, label: "Context & Details" },
    { id: "audit" as const, label: "Audit Trail" },
  ];

  const overrides = (decision.details?.overrides as Array<Record<string, string>>) || [];

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "COMPLIANCE", "SUPERVISOR", "PLATFORM_ADMIN"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/compliance")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investigation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{decisionId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ActionBadge action={decision.action} />
          <RiskBadge level={decision.risk_level} />
          {decision.action !== "ALLOW" && (
            <button
              onClick={() => setOverrideOpen(!overrideOpen)}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Override Decision
            </button>
          )}
        </div>
      </div>

      {/* Override Panel */}
      {overrideOpen && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">Override Decision</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={overrideAction}
              onChange={(e) => setOverrideAction(e.target.value)}
              className="px-3 py-2 text-sm border border-amber-200 dark:border-amber-700 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            >
              <option value="ALLOW">ALLOW</option>
              <option value="BLOCK">BLOCK</option>
              <option value="REVIEW">REVIEW</option>
              <option value="FREEZE">FREEZE</option>
            </select>
            <input
              type="text"
              placeholder="Reason for override (min 5 characters)..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-amber-200 dark:border-amber-700 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleOverride}
              disabled={overriding || overrideReason.length < 5}
              className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {overriding ? "Overriding..." : "Confirm Override"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-navy-600">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Decision Summary */}
          <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
              Decision Summary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Action</p>
                <div className="mt-1"><ActionBadge action={decision.action} /></div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Risk Level</p>
                <div className="mt-1"><RiskBadge level={decision.risk_level} /></div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Risk Score</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{decision.risk_score.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Processing Time</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{decision.processing_time_ms}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tier at Decision</p>
                <div className="mt-1"><TierBadge tier={decision.customer_tier_at_decision} /></div>
              </div>
              {decision.target_tier && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Target Tier</p>
                  <div className="mt-1"><TierBadge tier={decision.target_tier} /></div>
                </div>
              )}
              {decision.workflow && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Workflow</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{decision.workflow}</p>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-navy-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{decision.reason}</p>
            </div>
          </div>

          {/* Customer & Event Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserIcon className="h-4 w-4" aria-hidden="true" />
                Customer
              </h3>
              {decision.customer_external_id && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">External ID</p>
                  <Link
                    href={`/dashboard/customers/${decision.customer_external_id}`}
                    className="text-sm text-primary hover:text-primary-600 font-mono"
                  >
                    {decision.customer_external_id}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Internal ID</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{decision.customer_id}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ClockIcon className="h-4 w-4" aria-hidden="true" />
                Timeline
              </h3>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Event ID</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{decision.event_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-sm text-gray-900 dark:text-white">{new Date(decision.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TagIcon className="h-5 w-5" aria-hidden="true" />
              Triggered Rules
            </h2>
          </div>
          {!decision.triggered_rules?.length ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              No rules were triggered for this decision.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-navy-600">
              {decision.triggered_rules.map((rule, i) => {
                const cat = getRuleCategory(rule.trigger_code);
                return (
                  <div key={i} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{rule.trigger_code}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}>{cat.label}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rule.rule_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Condition: {rule.condition_matched}</p>
                      </div>
                      <ActionBadge action={rule.contribution_to_decision} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "context" && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
            Decision Context
          </h2>
          <pre className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto font-mono">
            {JSON.stringify(decision.details, null, 2)}
          </pre>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Trail</h2>
          </div>
          {!overrides.length ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              No overrides or manual actions on this decision.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-navy-600">
              {overrides.map((o, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{o.overridden_by}</span> changed{" "}
                        <ActionBadge action={o.old_action} /> to <ActionBadge action={o.new_action} />
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {o.reason} &middot; {new Date(o.overridden_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
