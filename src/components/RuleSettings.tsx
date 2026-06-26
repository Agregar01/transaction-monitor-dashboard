"use client";

import { useState } from "react";
import { useUpdateRuleMutation } from "@/redux/slices/api/rulesApi";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { Rule } from "@/types/api";

type ParamValue = number | string | boolean;

const humanize = (k: string) => {
  const s = k.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const fmtDefault = (v: ParamValue) =>
  typeof v === "number" && Math.abs(v) >= 1000 ? v.toLocaleString() : String(v);

/**
 * Tenant-facing rule tuning. Edits the universally safe knobs (on/off, risk
 * weight, description) plus any per-rule tunable thresholds the engine exposes
 * via default_parameters. All writes go to PUT /rules/{id}, which the backend
 * persists as a per-institution override — a tenant's edits never affect others.
 */
export default function RuleSettings({ rule }: { rule: Rule }) {
  const [updateRule, { isLoading }] = useUpdateRuleMutation();
  const [enabled, setEnabled] = useState(rule.enabled);
  const [risk, setRisk] = useState<number>(rule.risk_contribution);
  const [description, setDescription] = useState(rule.description ?? "");

  const defaults = rule.default_parameters ?? {};
  const paramKeys = Object.keys(defaults);
  const hasParams = paramKeys.length > 0;

  // Effective value = this institution's override if set, else the engine default.
  const effective = (k: string): ParamValue => rule.parameters?.[k] ?? defaults[k];
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(paramKeys.map((k) => [k, String(effective(k))])),
  );

  const coerce = (k: string, raw: string): ParamValue => {
    const t = typeof defaults[k];
    if (t === "number") return Number(raw);
    if (t === "boolean") return raw === "true";
    return raw;
  };

  const paramsChanged = paramKeys.some((k) => coerce(k, params[k]) !== effective(k));
  const dirty =
    enabled !== rule.enabled ||
    risk !== rule.risk_contribution ||
    description !== (rule.description ?? "") ||
    paramsChanged;

  const save = async () => {
    const body: Parameters<typeof updateRule>[0] = { rule_id: rule.rule_id };
    if (enabled !== rule.enabled) body.enabled = enabled;
    if (risk !== rule.risk_contribution) body.risk_contribution = risk;
    if (description !== (rule.description ?? "")) body.description = description.trim() || undefined;
    if (hasParams && paramsChanged) {
      body.parameters = Object.fromEntries(paramKeys.map((k) => [k, coerce(k, params[k])]));
    }
    try {
      await updateRule(body).unwrap();
      showToast({ type: "success", title: "Saved", message: `${rule.rule_id} tuned for your institution.` });
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: errorMessage(e) });
    }
  };

  const resetParams = () =>
    setParams(Object.fromEntries(paramKeys.map((k) => [k, String(defaults[k])])));

  return (
    <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Rule settings
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tune this rule for your institution. Changes apply only to your tenant.
          </p>
        </div>
        {rule.has_institution_override && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary whitespace-nowrap">
            Tuned for your institution
          </span>
        )}
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
            Points this rule adds to a transaction&apos;s risk score when it fires.
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

      {hasParams && (
        <div className="space-y-3 border-t border-gray-100 dark:border-navy-600 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Thresholds
            </p>
            <button
              type="button"
              onClick={resetParams}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary"
            >
              Reset to defaults
            </button>
          </div>
          {paramKeys.map((k) => {
            const isBool = typeof defaults[k] === "boolean";
            return (
              <div key={k} className="flex items-center justify-between gap-3">
                <label htmlFor={`param-${k}`} className="text-sm text-gray-900 dark:text-white">
                  {humanize(k)}
                  <span className="block text-xs text-gray-400">default: {fmtDefault(defaults[k])}</span>
                </label>
                {isBool ? (
                  <select
                    id={`param-${k}`}
                    value={params[k]}
                    onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-32 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    id={`param-${k}`}
                    type={typeof defaults[k] === "number" ? "number" : "text"}
                    value={params[k]}
                    onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-32 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

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
