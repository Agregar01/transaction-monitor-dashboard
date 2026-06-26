"use client";

import { useState } from "react";
import { useUpdateRuleMutation } from "@/redux/slices/api/rulesApi";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { Rule } from "@/types/api";

/**
 * Tenant-facing rule tuning. Works for any rule — including the preconfigured
 * Python rules that have no editable conditions — by editing the universally
 * safe knobs (on/off, risk weight, description). The backend scopes the change
 * to the caller's institution, so a tenant's edits never affect other tenants.
 */
export default function RuleSettings({ rule }: { rule: Rule }) {
  const [updateRule, { isLoading }] = useUpdateRuleMutation();
  const [enabled, setEnabled] = useState(rule.enabled);
  const [risk, setRisk] = useState<number>(rule.risk_contribution);
  const [description, setDescription] = useState(rule.description ?? "");

  const dirty =
    enabled !== rule.enabled ||
    risk !== rule.risk_contribution ||
    description !== (rule.description ?? "");

  const save = async () => {
    try {
      await updateRule({
        rule_id: rule.rule_id,
        enabled,
        risk_contribution: risk,
        description: description.trim() || undefined,
      }).unwrap();
      showToast({ type: "success", title: "Saved", message: `${rule.rule_id} updated for your institution.` });
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: errorMessage(e) });
    }
  };

  return (
    <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Rule settings
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Tune this rule for your institution. Changes apply only to your tenant.
        </p>
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-900 dark:text-white">
          Enabled
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            Evaluate this rule against incoming transactions.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-gray-300 dark:bg-navy-500"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </label>

      <div>
        <label htmlFor="risk-contribution" className="block text-sm text-gray-900 dark:text-white">
          Risk contribution
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            How many points this rule adds to a transaction&apos;s risk score when it fires.
          </span>
        </label>
        <input
          id="risk-contribution"
          type="number"
          min={0}
          max={300}
          value={risk}
          onChange={(e) => setRisk(Number(e.target.value))}
          className="mt-1.5 w-32 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="rule-description" className="block text-sm text-gray-900 dark:text-white">
          Description
        </label>
        <textarea
          id="rule-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this rule looks for"
          className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={!dirty || isLoading}
          className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          {isLoading ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}
