"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useListPoliciesQuery,
  useActivatePolicyMutation,
  useDeactivatePolicyMutation,
  useCreatePolicyMutation,
  useDeletePolicyMutation,
  useToggleRuleMutation,
  useUpdateRuleMutation,
  useGetPolicyHistoryQuery,
} from "@/redux/slices/api/policiesApi";
import type { Policy, PolicyRule, PolicyCreateRule, PolicyRuleCondition } from "@/redux/slices/api/policiesApi";
import { PlusIcon, TrashIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon, ClockIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import RoleGuard from "@/components/RoleGuard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  INACTIVE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const categoryColors: Record<string, string> = {
  TRANSACTION: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACTION: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  BEHAVIORAL: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  RISK: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TIME: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  REGULATORY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  EXTERNAL: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  BUSINESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const actionColors: Record<string, string> = {
  BLOCK: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  FREEZE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ALLOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REVIEW: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  UPGRADE_REQUIRED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STEP_UP: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const CATEGORIES = ["TRANSACTION", "ACTION", "BEHAVIORAL", "RISK", "TIME", "REGULATORY", "EXTERNAL", "BUSINESS"];
const actionOptions = ["ALLOW", "BLOCK", "REVIEW", "UPGRADE_REQUIRED", "STEP_UP", "FREEZE"];
const operatorOptions = ["eq", "ne", "gt", "gte", "lt", "lte", "in", "not_in", "contains"];
const conditionTypes = ["threshold", "composite", "pattern", "exists", "time_based"];

/** Human-readable summary of a rule condition regardless of type. */
function describeCondition(cond: PolicyRuleCondition | undefined): string {
  if (!cond) return "";
  switch (cond.type) {
    case "threshold":
      return `${cond.field || ""} ${cond.operator || ""} ${String(cond.value ?? "")}`;
    case "composite":
      return `Composite (${(cond.logic || "and").toUpperCase()}, ${cond.conditions?.length ?? 0} sub-rules)`;
    case "pattern":
      return `Pattern: ${cond.pattern_type || ""}${cond.action_type ? ` [${cond.action_type}]` : ""}`;
    case "exists":
      return `${cond.field || ""} ${cond.should_exist ? "exists" : "not exists"}`;
    case "time_based":
      return `${cond.time_type || "time"}${cond.days ? ` (${cond.days}d)` : ""}${cond.warning_days ? ` (${cond.warning_days}d warning)` : ""}`;
    default:
      return cond.field ? `${cond.field} ${cond.operator || ""} ${String(cond.value ?? "")}` : cond.type || "";
  }
}

const TIER_OPTIONS = ["T0", "T1", "T2", "T3", "B0", "B1", "B2", "B3"];
const WORKFLOW_OPTIONS = [
  { value: "W1", label: "W1 - Auto-approve (OTP)" },
  { value: "W2", label: "W2 - ID + Selfie + Liveness" },
  { value: "W3", label: "W3 - Video KYC with Agent" },
  { value: "W4", label: "W4 - Video KYC + Supervisor" },
  { value: "W5", label: "W5 - Full Enhanced Due Diligence" },
  { value: "BW1", label: "BW1 - Business Registration" },
  { value: "BW2", label: "BW2 - UBO Identification" },
  { value: "BW3", label: "BW3 - Enhanced Business DD" },
  { value: "BW4", label: "BW4 - Full Business EDD" },
];

function emptyRule(): PolicyCreateRule {
  return {
    name: "",
    condition: { type: "threshold", field: "", operator: "gt", value: 0 },
    action: "REVIEW",
    priority: 100,
    is_enabled: true,
    applicable_tiers: [],
    workflow: undefined,
    target_tier: undefined,
  };
}

/* ── Policy Card ── */
function PolicyCard({
  policy,
  isAdmin,
  onToggle,
  onDelete,
  onToggleRule,
  onEditRule,
  onShowHistory,
}: {
  policy: Policy;
  isAdmin: boolean;
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onToggleRule: (policyId: string, ruleId: string, enabled: boolean) => void;
  onEditRule: (policyId: string, rule: PolicyRule) => void;
  onShowHistory: (policyId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ruleCount = policy.rule_count ?? policy.rules?.length ?? 0;

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </button>
            <h3 className="font-semibold text-gray-900 dark:text-white">{policy.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[policy.status] || ""}`}>
              {policy.status}
            </span>
            {policy.is_system && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-navy-100 text-navy-700 dark:bg-navy-600 dark:text-navy-200">
                System
              </span>
            )}
            {policy.category && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[policy.category] || "bg-gray-100 text-gray-700"}`}>
                {policy.category}
              </span>
            )}
          </div>
          {policy.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-6">{policy.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1 ml-6">{ruleCount} rules &middot; Priority {policy.priority}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button
            onClick={() => onShowHistory(policy.id)}
            title="Version History"
            className="p-1.5 text-gray-400 hover:text-primary rounded transition-colors"
          >
            <ClockIcon className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => onToggle(policy.id, policy.status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                policy.status === "ACTIVE"
                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                  : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
              }`}
            >
              {policy.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          )}
          {isAdmin && !policy.is_system && policy.status !== "ACTIVE" && (
            <button
              onClick={() => onDelete(policy.id)}
              title="Delete Policy"
              className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {expanded && policy.rules && policy.rules.length > 0 && (
        <div className="mt-4 border-t dark:border-navy-600 pt-4 ml-6">
          <div className="space-y-2">
            {policy.rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between bg-gray-50 dark:bg-navy-600 rounded-lg px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isAdmin ? (
                    <button
                      onClick={() => onToggleRule(policy.id, rule.id, !rule.is_enabled)}
                      className={`w-7 h-4 rounded-full transition-colors relative shrink-0 ${
                        rule.is_enabled ? "bg-green-400" : "bg-gray-300 dark:bg-navy-500"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          rule.is_enabled ? "left-3.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${rule.is_enabled ? "bg-green-400" : "bg-gray-300"}`} />
                  )}
                  {rule.code && (
                    <span className="font-mono text-gray-400 dark:text-gray-500 shrink-0">{rule.code}</span>
                  )}
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{rule.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                    {describeCondition(rule.condition)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {rule.applicable_tiers && rule.applicable_tiers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-navy-700 hidden md:inline">
                      {rule.applicable_tiers.join(",")}
                    </span>
                  )}
                  {rule.workflow && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hidden lg:inline">
                      {rule.workflow}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${actionColors[rule.action] || "bg-gray-100 text-gray-700"}`}>
                    {rule.action}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => onEditRule(policy.id, rule)}
                      title="Edit rule"
                      className="p-1 text-gray-400 hover:text-primary rounded transition-colors"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create Policy Modal (same as before, for custom policies) ── */
function CreatePolicyModal({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const [create, { isLoading }] = useCreatePolicyMutation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(100);
  const [rules, setRules] = useState<PolicyCreateRule[]>([emptyRule()]);
  const [error, setError] = useState("");

  if (!open) return null;

  const updateRule = (idx: number, patch: Partial<PolicyCreateRule>) => {
    setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const updateCondition = (idx: number, patch: Partial<PolicyRuleCondition>) => {
    setRules(rules.map((r, i) => (i === idx ? { ...r, condition: { ...r.condition, ...patch } } : r)));
  };

  const removeRule = (idx: number) => {
    if (rules.length > 1) setRules(rules.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Policy name is required"); return; }
    if (rules.some((r) => !r.name.trim())) { setError("All rules must have a name"); return; }
    if (rules.some((r) => r.condition.type === "threshold" && !r.condition.field?.trim())) { setError("All threshold rules must have a condition field"); return; }
    try {
      await create({
        client_id: clientId,
        name,
        description: description || undefined,
        priority,
        rules: rules.map((r) => ({
          ...r,
          condition: {
            ...r.condition,
            value: isNaN(Number(r.condition.value)) ? r.condition.value : Number(r.condition.value),
          },
        })),
      }).unwrap();
      setName("");
      setDescription("");
      setPriority(100);
      setRules([emptyRule()]);
      onClose();
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e?.data?.detail || "Failed to create policy");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <h2 className="text-lg font-semibold dark:text-white">Create Custom Policy</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Custom Transaction Limits" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="What does this policy enforce?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <input type="number" min={1} max={1000} value={priority} onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Rules</h3>
              <button type="button" onClick={() => setRules([...rules, emptyRule()])}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium">
                <PlusIcon className="h-3.5 w-3.5" /> Add Rule
              </button>
            </div>
            <div className="space-y-4">
              {rules.map((rule, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-navy-600 rounded-lg p-4 space-y-3 relative">
                  {rules.length > 1 && (
                    <button type="button" onClick={() => removeRule(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rule Name *</label>
                      <input required value={rule.name} onChange={(e) => updateRule(idx, { name: e.target.value })}
                        className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm" placeholder="e.g., High value transaction" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Condition Type</label>
                      <select value={rule.condition.type} onChange={(e) => updateCondition(idx, { type: e.target.value })}
                        className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm">
                        {conditionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Field *</label>
                      <input required value={rule.condition.field} onChange={(e) => updateCondition(idx, { field: e.target.value })}
                        className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm" placeholder="e.g., amount" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Operator</label>
                      <select value={rule.condition.operator} onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                        className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm">
                        {operatorOptions.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Value *</label>
                      <input required value={String(rule.condition.value ?? "")} onChange={(e) => updateCondition(idx, { value: e.target.value })}
                        className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm" placeholder="e.g., 1000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Action *</label>
                      <select value={rule.action} onChange={(e) => updateRule(idx, { action: e.target.value })}
                        className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm">
                        {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                      <input type="number" min={1} max={1000} value={rule.priority}
                        onChange={(e) => updateRule(idx, { priority: Number(e.target.value) })}
                        className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Applicable Tiers</label>
                      <div className="flex flex-wrap gap-2">
                        {TIER_OPTIONS.map((tier) => (
                          <label key={tier} className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                            <input type="checkbox"
                              checked={rule.applicable_tiers?.includes(tier) || false}
                              onChange={(e) => {
                                const tiers = rule.applicable_tiers || [];
                                updateRule(idx, {
                                  applicable_tiers: e.target.checked
                                    ? [...tiers, tier]
                                    : tiers.filter((t) => t !== tier),
                                });
                              }}
                              className="rounded border-gray-300 dark:border-navy-500"
                            />
                            {tier}
                          </label>
                        ))}
                      </div>
                    </div>
                    {rule.action === "UPGRADE_REQUIRED" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Workflow</label>
                          <select value={rule.workflow || ""} onChange={(e) => updateRule(idx, { workflow: e.target.value || undefined })}
                            className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm">
                            <option value="">Select workflow</option>
                            {WORKFLOW_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Target Tier</label>
                          <select value={rule.target_tier || ""} onChange={(e) => updateRule(idx, { target_tier: e.target.value || undefined })}
                            className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded px-2.5 py-1.5 text-sm">
                            <option value="">Select target tier</option>
                            {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-navy-500 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
              {isLoading ? "Creating..." : "Create Policy (Draft)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit Rule Modal ── */
function EditRuleModal({
  open,
  onClose,
  policyId,
  policyStatus,
  rule,
}: {
  open: boolean;
  onClose: () => void;
  policyId: string;
  policyStatus: string;
  rule: PolicyRule | null;
}) {
  const [updateRule, { isLoading }] = useUpdateRuleMutation();
  const [name, setName] = useState("");
  const [action, setAction] = useState("");
  const [priority, setPriority] = useState(100);
  const [condType, setCondType] = useState("threshold");
  const [condField, setCondField] = useState("");
  const [condOp, setCondOp] = useState("");
  const [condValue, setCondValue] = useState("");
  const [applicableTiers, setApplicableTiers] = useState<string[]>([]);
  const [workflow, setWorkflow] = useState("");
  const [targetTier, setTargetTier] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setAction(rule.action);
      setPriority(rule.priority);
      setCondType(rule.condition?.type || "threshold");
      setCondField(rule.condition?.field || rule.condition?.pattern_type || rule.condition?.time_type || "");
      setCondOp(rule.condition?.operator || "");
      setCondValue(String(rule.condition?.value ?? rule.condition?.days ?? rule.condition?.warning_days ?? rule.condition?.should_exist ?? ""));
      setApplicableTiers(rule.applicable_tiers || []);
      setWorkflow(rule.workflow || "");
      setTargetTier(rule.target_tier || "");
    }
  }, [rule]);

  if (!open || !rule) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <h2 className="text-lg font-semibold dark:text-white">Edit Rule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        {policyStatus === "ACTIVE" && (
          <div className="mx-6 mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <strong>Warning:</strong> This rule belongs to an ACTIVE policy. Changes will take effect immediately on all future evaluations and increment the policy version.
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              // Build condition object based on type
              let condition: Record<string, unknown> = { type: condType };
              if (condType === "threshold") {
                condition = { type: "threshold", field: condField, operator: condOp, value: isNaN(Number(condValue)) ? condValue : Number(condValue) };
              } else if (condType === "exists") {
                condition = { type: "exists", field: condField, should_exist: condValue === "true" || condValue === "1" };
              } else if (condType === "pattern") {
                condition = { ...rule.condition, type: "pattern", pattern_type: condField };
              } else if (condType === "time_based") {
                condition = { ...rule.condition, type: "time_based", time_type: condField, days: isNaN(Number(condValue)) ? undefined : Number(condValue) };
              } else if (condType === "composite") {
                // Composite: preserve the original sub-conditions, only update if user didn't change
                condition = rule.condition ? { ...rule.condition } : { type: "composite", logic: "and", conditions: [] };
              }
              const body: Partial<PolicyCreateRule> = {
                name,
                action,
                priority,
                condition: condition as unknown as PolicyRuleCondition,
                applicable_tiers: applicableTiers.length > 0 ? applicableTiers : undefined,
                workflow: workflow || undefined,
                target_tier: targetTier || undefined,
              };
              await updateRule({ policy_id: policyId, rule_id: rule.id, body }).unwrap();
              showToast({ type: "success", title: "Rule Updated", message: "Rule saved successfully" });
              onClose();
            } catch (err: unknown) {
              const e = err as { data?: { detail?: string } };
              setError(e?.data?.detail || "Failed to update rule");
            }
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)}
                className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm">
                {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <input type="number" min={1} max={1000} value={priority} onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition Type</label>
              <select value={condType} onChange={(e) => setCondType(e.target.value)}
                className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm">
                {conditionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {condType === "composite" ? (
              <div className="bg-gray-50 dark:bg-navy-600 rounded-lg px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                Composite conditions must be edited via API. Sub-conditions are preserved.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {condType === "pattern" ? "Pattern Type" : condType === "time_based" ? "Time Type" : "Field"}
                  </label>
                  <input value={condField} onChange={(e) => setCondField(e.target.value)}
                    className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm"
                    placeholder={condType === "pattern" ? "e.g., first_time" : condType === "time_based" ? "e.g., dormancy" : "e.g., amount"} />
                </div>
                {(condType === "threshold") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operator</label>
                    <select value={condOp} onChange={(e) => setCondOp(e.target.value)}
                      className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm">
                      {operatorOptions.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {condType === "exists" ? "Should Exist" : condType === "time_based" ? "Days" : "Value"}
                  </label>
                  {condType === "exists" ? (
                    <select value={condValue} onChange={(e) => setCondValue(e.target.value)}
                      className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm">
                      <option value="true">Yes (exists)</option>
                      <option value="false">No (not exists)</option>
                    </select>
                  ) : (
                    <input value={condValue} onChange={(e) => setCondValue(e.target.value)}
                      className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm" />
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applicable Tiers</label>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map((tier) => (
                <label key={tier} className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox"
                    checked={applicableTiers.includes(tier)}
                    onChange={(e) => {
                      setApplicableTiers(e.target.checked
                        ? [...applicableTiers, tier]
                        : applicableTiers.filter((t) => t !== tier));
                    }}
                    className="rounded border-gray-300 dark:border-navy-500"
                  />
                  {tier}
                </label>
              ))}
            </div>
          </div>
          {action === "UPGRADE_REQUIRED" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workflow</label>
                <select value={workflow} onChange={(e) => setWorkflow(e.target.value)}
                  className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Select workflow</option>
                  {WORKFLOW_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Tier</label>
                <select value={targetTier} onChange={(e) => setTargetTier(e.target.value)}
                  className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Select tier</option>
                  {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-navy-500 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Policy History Modal ── */
function PolicyHistoryModal({ open, onClose, policyId }: { open: boolean; onClose: () => void; policyId: string }) {
  const { data, isLoading } = useGetPolicyHistoryQuery(policyId, { skip: !open });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <h2 className="text-lg font-semibold dark:text-white">
            Version History {data && <span className="text-sm text-gray-400 font-normal">(v{data.current_version})</span>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : data?.history && data.history.length > 0 ? (
            <div className="space-y-3">
              {data.history.map((entry, i) => (
                <div key={i} className="bg-gray-50 dark:bg-navy-600 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{String(entry.action || "Change")}</span>
                      {entry.resource_type ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-navy-500 text-gray-500 dark:text-gray-400">
                          {String(entry.resource_type)}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-gray-400">{entry.timestamp ? new Date(String(entry.timestamp)).toLocaleString() : ""}</span>
                  </div>
                  {entry.details ? (
                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No version history available</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function PoliciesPage() {
  useEffect(() => { document.title = "Policies | Deferred KYC"; }, []);
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const isAdmin = useAppSelector((s) => s.auth.isAdmin);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data: policies, isLoading } = useListPoliciesQuery({
    client_id: clientId,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  });
  const [activate] = useActivatePolicyMutation();
  const [deactivate] = useDeactivatePolicyMutation();
  const [deletePolicy] = useDeletePolicyMutation();
  const [toggleRule] = useToggleRuleMutation();

  const handleToggle = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === "ACTIVE") await deactivate(id).unwrap();
      else await activate(id).unwrap();
      showToast({ type: "success", title: "Success", message: `Policy ${currentStatus === "ACTIVE" ? "deactivated" : "activated"} successfully` });
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      showToast({ type: "error", title: "Error", message: e?.data?.detail || "Failed to update policy status" });
    }
  };

  const [editRule, setEditRule] = useState<{ policyId: string; rule: PolicyRule; policyStatus: string } | null>(null);
  const [historyPolicyId, setHistoryPolicyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePolicy(confirmDelete).unwrap();
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      showToast({ type: "error", title: "Delete Failed", message: e?.data?.detail || "Failed to delete policy" });
    }
    setConfirmDelete(null);
  };

  const handleToggleRule = async (policyId: string, ruleId: string, enabled: boolean) => {
    try {
      await toggleRule({ policy_id: policyId, rule_id: ruleId, enabled }).unwrap();
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      showToast({ type: "error", title: "Error", message: e?.data?.detail || "Failed to toggle rule" });
    }
  };

  // Separate system and custom policies
  const systemPolicies = policies?.filter((p) => p.is_system) ?? [];
  const customPolicies = policies?.filter((p) => !p.is_system) ?? [];

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policies</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {policies?.length ?? 0} policies governing decision-making
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Create Policy
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-gray-400">Loading...</div>
      ) : (
        <>
          {/* System Policies */}
          {systemPolicies.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                System Policies ({systemPolicies.length})
              </h2>
              <div className="space-y-3">
                {systemPolicies.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} isAdmin={isAdmin} onToggle={handleToggle} onDelete={handleDelete} onToggleRule={handleToggleRule} onEditRule={(pid, r) => setEditRule({ policyId: pid, rule: r, policyStatus: policy.status })} onShowHistory={(pid) => setHistoryPolicyId(pid)} />
                ))}
              </div>
            </div>
          )}

          {/* Custom Policies */}
          {customPolicies.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Custom Policies ({customPolicies.length})
              </h2>
              <div className="space-y-3">
                {customPolicies.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} isAdmin={isAdmin} onToggle={handleToggle} onDelete={handleDelete} onToggleRule={handleToggleRule} onEditRule={(pid, r) => setEditRule({ policyId: pid, rule: r, policyStatus: policy.status })} onShowHistory={(pid) => setHistoryPolicyId(pid)} />
                ))}
              </div>
            </div>
          )}

          {policies && policies.length === 0 && (
            <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-gray-400">
              No policies found. Create one to start defining business rules.
            </div>
          )}
        </>
      )}

      {/* Export Button */}
      {policies && policies.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              const rows: string[] = [];
              for (const p of policies) {
                if (p.rules) {
                  for (const r of p.rules) {
                    const tiers = r.applicable_tiers?.join(";") || "ALL";
                    const cond = describeCondition(r.condition).replace(/,/g, ";");
                    rows.push([p.name, p.category || "", p.status, r.code || "", r.name, r.action, r.is_enabled ? "Y" : "N", r.priority, tiers, r.workflow || "", r.target_tier || "", cond].join(","));
                  }
                } else {
                  rows.push([p.name, p.category || "", p.status, "", "", "", "", p.priority, "", "", "", ""].join(","));
                }
              }
              const csv = ["policy,category,status,rule_code,rule_name,action,enabled,priority,tiers,workflow,target_tier,condition", ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "policies.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      )}

      <CreatePolicyModal open={showCreate} onClose={() => setShowCreate(false)} clientId={clientId} />
      <EditRuleModal
        open={!!editRule}
        onClose={() => setEditRule(null)}
        policyId={editRule?.policyId || ""}
        policyStatus={editRule?.policyStatus || ""}
        rule={editRule?.rule || null}
      />
      <PolicyHistoryModal
        open={!!historyPolicyId}
        onClose={() => setHistoryPolicyId(null)}
        policyId={historyPolicyId || ""}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Policy"
        message="Only DRAFT/INACTIVE policies can be deleted. Are you sure?"
        confirmLabel="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
    </RoleGuard>
  );
}
