"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useGetRuleQuery,
  usePromoteRuleMutation,
  useArchiveRuleMutation,
} from "@/redux/slices/api/rulesApi";
import { SkeletonCard } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import RuleBuilderForm from "@/components/RuleBuilderForm";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { useAppSelector } from "@/redux/store";

export default function RuleDetailPage() {
  const params = useParams<{ rule_id: string }>();
  const router = useRouter();
  const ruleId = params.rule_id;
  const [editing, setEditing] = useState(false);

  const { data: rule, isLoading, error } = useGetRuleQuery(ruleId);
  const [promote, { isLoading: promoting }] = usePromoteRuleMutation();
  const [archive, { isLoading: archiving }] = useArchiveRuleMutation();
  const { roles } = useAppSelector((s) => s.auth);
  const canEdit = roles.some((r) => ["SYSTEM_ADMIN", "ML_ENGINEER"].includes(r));

  if (isLoading) return <SkeletonCard />;
  if (error || !rule) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        Failed to load rule {ruleId}.
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
          >
            ← Cancel edit
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            Edit rule <span className="font-mono text-lg">{ruleId}</span>
          </h1>
        </div>
        <RuleBuilderForm
          existing={rule}
          onSuccess={() => {
            setEditing(false);
            showToast({ type: "success", title: "Saved", message: `${ruleId} updated.` });
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const onPromote = async () => {
    try {
      const res = (await promote({ rule_id: ruleId }).unwrap()) as { approval_id?: string };
      if (res.approval_id) {
        showToast({
          type: "info",
          title: "Awaiting approval",
          message: `${rule.status} → next state queued for review.`,
        });
        router.push("/dashboard/approvals");
      } else {
        showToast({ type: "success", title: "Promoted", message: `Rule advanced from ${rule.status}.` });
      }
    } catch (e) {
      showToast({ type: "error", title: "Promotion failed", message: errorMessage(e) });
    }
  };

  const onArchive = async () => {
    if (!confirm("Archive this rule? Archived rules stop evaluating against new transactions.")) {
      return;
    }
    try {
      await archive({ rule_id: ruleId }).unwrap();
      showToast({ type: "success", title: "Archived", message: ruleId });
    } catch (e) {
      showToast({ type: "error", title: "Archive failed", message: errorMessage(e) });
    }
  };

  const conditions = (rule.rule_logic.conditions ?? []) as Array<{ field: string; op: string; value: unknown }>;
  const operator = rule.rule_logic.operator ?? "AND";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Rule</p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{rule.rule_name}</h1>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
            {ruleId} · v{rule.version}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBadge action={rule.rule_category} />
          <ActionBadge action={rule.severity} />
          <ActionBadge action={rule.status} />
          {rule.enabled ? (
            <span className="text-xs text-green-600 font-semibold">● enabled</span>
          ) : (
            <span className="text-xs text-gray-400">○ disabled</span>
          )}
          {canEdit && rule.status === "DRAFT" && rule.logic_type === "dsl" && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs font-medium border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {rule.description && (
        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Description
          </h2>
          <p className="text-sm text-gray-900 dark:text-white">{rule.description}</p>
        </section>
      )}

      {rule.explain_template && (
        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Why this rule fires <span className="normal-case font-normal text-gray-400">(shown on every alert)</span>
          </h2>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{rule.explain_template}</p>
        </section>
      )}

      {rule.logic_type === "python" ? (
        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Detection logic
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This is a <span className="font-medium">built-in {rule.rule_category}</span> rule maintained
            in the detection engine. Its logic runs server-side rather than as editable conditions —
            the rationale above is what an investigator sees on each alert it raises.
          </p>
        </section>
      ) : (
      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Conditions ({operator})
        </h2>
        {conditions.length === 0 ? (
          <p className="text-sm text-gray-400">No conditions defined.</p>
        ) : (
          <ul className="space-y-1.5 font-mono text-sm text-gray-900 dark:text-white">
            {conditions.map((c, i) => (
              <li key={i} className="px-3 py-1.5 rounded bg-gray-50 dark:bg-navy-800">
                <span className="text-primary">{c.field}</span>{" "}
                <span className="text-gray-500 dark:text-gray-400">{c.op}</span>{" "}
                <span>{JSON.stringify(c.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Raw JSON
        </h2>
        <pre className="text-xs bg-gray-50 dark:bg-navy-800 border border-gray-200 dark:border-navy-500 rounded-lg p-3 overflow-x-auto font-mono text-gray-900 dark:text-white">
          {JSON.stringify(rule.rule_logic, null, 2)}
        </pre>
      </section>

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Lifecycle</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {rule.status === "DRAFT" && "Promote DRAFT → SHADOW to start observing live traffic."}
            {rule.status === "SHADOW" &&
              "Promote SHADOW → PRODUCTION through a four-eyes approval to take effect."}
            {rule.status === "PRODUCTION" && "Rule is live. Archive to stop evaluating it."}
            {rule.status === "ARCHIVED" && "Rule is archived and no longer evaluated."}
          </p>
        </div>
        <div className="flex gap-2">
          {rule.status !== "ARCHIVED" && (
            <button
              onClick={onArchive}
              disabled={archiving}
              className="px-3 py-2 text-sm font-medium border border-gray-200 dark:border-navy-500 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 text-gray-900 dark:text-white disabled:opacity-50"
            >
              {archiving ? "Archiving…" : "Archive"}
            </button>
          )}
          {(rule.status === "DRAFT" || rule.status === "SHADOW") && (
            <button
              onClick={onPromote}
              disabled={promoting}
              className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {promoting ? "Promoting…" : rule.status === "DRAFT" ? "Promote to SHADOW" : "Promote to PRODUCTION"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
