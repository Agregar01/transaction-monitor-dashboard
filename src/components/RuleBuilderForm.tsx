"use client";

import { useState, useCallback } from "react";
import {
  useGetRuleSchemaQuery,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  useValidateRuleMutation,
  type RuleFieldMeta,
} from "@/redux/slices/api/rulesApi";
import type { Rule, RuleCategory, RuleSeverity, RuleCondition } from "@/types/api";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";

interface Props {
  /** Pass an existing rule to enter edit mode. Omit for create mode. */
  existing?: Rule;
  onSuccess: (rule: Rule) => void;
  onCancel: () => void;
}

interface ConditionRow {
  field: string;
  op: string;
  /** raw string representation — parsed to correct type on submit */
  rawValue: string;
}

const EMPTY_CONDITION: ConditionRow = { field: "", op: "==", rawValue: "" };

function parseValue(raw: string, meta?: RuleFieldMeta, op?: string): unknown {
  if (!meta) return raw;
  if (op === "in" || op === "not_in") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (meta.type === "number") return parseFloat(raw) || 0;
  if (meta.type === "boolean") return raw === "true";
  return raw;
}

function conditionToRow(c: RuleCondition): ConditionRow {
  let rawValue: string;
  if (Array.isArray(c.value)) {
    rawValue = (c.value as unknown[]).join(", ");
  } else {
    rawValue = String(c.value ?? "");
  }
  return { field: c.field, op: c.op, rawValue };
}

// ── ValueInput ───────────────────────────────────────────────────────────────

function ValueInput({
  row,
  meta,
  onChange,
}: {
  row: ConditionRow;
  meta?: RuleFieldMeta;
  onChange: (v: string) => void;
}) {
  const isListOp = row.op === "in" || row.op === "not_in";
  const base = "w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary";

  if (meta?.type === "boolean") {
    return (
      <select aria-label="Condition value" value={row.rawValue} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">— pick —</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (meta?.type === "string" && meta.allowed_values && !isListOp) {
    return (
      <select aria-label="Condition value" value={row.rawValue} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">— pick —</option>
        {(meta.allowed_values as string[]).map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    );
  }

  if (meta?.type === "string" && meta.allowed_values && isListOp) {
    const selected = row.rawValue.split(",").map((s) => s.trim()).filter(Boolean);
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
      onChange(next.join(", "));
    };
    return (
      <div className="flex flex-wrap gap-1 p-1.5 border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 min-h-[36px]">
        {(meta.allowed_values as string[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
              selected.includes(v)
                ? "bg-primary text-white border-primary"
                : "border-gray-300 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:border-primary"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    );
  }

  if (meta?.type === "number" && !isListOp) {
    return (
      <input
        type="number"
        aria-label="Condition value"
        value={row.rawValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={String(meta.example ?? 0)}
        className={base}
      />
    );
  }

  // Fallback: plain text (handles in/not_in for numbers too)
  return (
    <input
      type="text"
      aria-label="Condition value"
      value={row.rawValue}
      onChange={(e) => onChange(e.target.value)}
      placeholder={isListOp ? "value1, value2, …" : "value"}
      className={base}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RuleBuilderForm({ existing, onSuccess, onCancel }: Props) {
  const { data: schema, isLoading: schemaLoading } = useGetRuleSchemaQuery();
  const [createRule, { isLoading: creating }] = useCreateRuleMutation();
  const [updateRule, { isLoading: updating }] = useUpdateRuleMutation();
  const [validateRule] = useValidateRuleMutation();

  const isEditing = !!existing;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [ruleId, setRuleId] = useState(existing?.rule_id ?? "");
  const [ruleName, setRuleName] = useState(existing?.rule_name ?? "");
  const [category, setCategory] = useState<RuleCategory>(existing?.rule_category ?? "AMOUNT");
  const [severity, setSeverity] = useState<RuleSeverity>(existing?.severity ?? "MEDIUM");
  const [riskScore, setRiskScore] = useState(String(existing?.risk_contribution ?? 10));
  const [description, setDescription] = useState(existing?.description ?? "");
  const [explainTemplate, setExplainTemplate] = useState(
    (existing?.rule_logic?.explain_template as string) ?? ""
  );
  const [operator, setOperator] = useState<"AND" | "OR">(
    (existing?.rule_logic?.operator as "AND" | "OR") ?? "AND"
  );
  const [conditions, setConditions] = useState<ConditionRow[]>(() => {
    const existing_conds = existing?.rule_logic?.conditions as RuleCondition[] | undefined;
    return existing_conds?.length ? existing_conds.map(conditionToRow) : [{ ...EMPTY_CONDITION }];
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const saving = creating || updating;

  // ── Condition helpers ───────────────────────────────────────────────────────
  const updateCondition = useCallback(
    (idx: number, patch: Partial<ConditionRow>) =>
      setConditions((prev) =>
        prev.map((c, i) => {
          if (i !== idx) return c;
          const next = { ...c, ...patch };
          // Reset op when field changes
          if (patch.field && patch.field !== c.field && schema) {
            const meta = schema.fields[patch.field];
            next.op = meta ? meta.ops[0] : "==";
            next.rawValue = "";
          }
          // Reset rawValue when op changes between list/non-list
          if (patch.op) {
            const wasListOp = c.op === "in" || c.op === "not_in";
            const isListOp = patch.op === "in" || patch.op === "not_in";
            if (wasListOp !== isListOp) next.rawValue = "";
          }
          return next;
        })
      ),
    [schema]
  );

  const addCondition = () => setConditions((prev) => [...prev, { ...EMPTY_CONDITION }]);

  const removeCondition = (idx: number) =>
    setConditions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // ── Build payload ───────────────────────────────────────────────────────────
  const buildPayload = useCallback(() => {
    const builtConditions: RuleCondition[] = conditions.map((c) => ({
      field: c.field,
      op: c.op as RuleCondition["op"],
      value: parseValue(c.rawValue, schema?.fields[c.field], c.op) as RuleCondition["value"],
    }));
    return {
      rule_id: ruleId.trim(),
      rule_name: ruleName.trim(),
      rule_category: category,
      severity,
      risk_contribution: parseInt(riskScore) || 0,
      description: description.trim() || undefined,
      explain_template: explainTemplate.trim() || undefined,
      conditions: builtConditions,
      operator,
    };
  }, [conditions, ruleId, ruleName, category, severity, riskScore, description, explainTemplate, operator, schema]);

  // ── Validate ────────────────────────────────────────────────────────────────
  const handleValidate = async () => {
    setValidationErrors([]);
    try {
      const result = await validateRule(buildPayload()).unwrap();
      if (result.valid) {
        showToast({ type: "success", title: "Valid", message: "Rule conditions look good." });
      } else {
        setValidationErrors(result.errors);
      }
    } catch (e) {
      showToast({ type: "error", title: "Validation failed", message: errorMessage(e) });
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setValidationErrors([]);
    const payload = buildPayload();

    // Quick client-side check before firing
    if (!payload.rule_id) { setValidationErrors(["rule_id is required"]); return; }
    if (!payload.rule_name) { setValidationErrors(["rule_name is required"]); return; }
    if (payload.conditions.some((c) => !c.field)) {
      setValidationErrors(["All conditions must have a field selected"]);
      return;
    }

    try {
      let saved: Rule;
      if (isEditing) {
        saved = await updateRule({
          rule_id: existing!.rule_id,
          rule_name: payload.rule_name,
          description: payload.description,
          risk_contribution: payload.risk_contribution,
          conditions: payload.conditions,
          explain_template: payload.explain_template,
        }).unwrap();
      } else {
        saved = await createRule(payload).unwrap();
      }
      showToast({
        type: "success",
        title: isEditing ? "Rule updated" : "Rule created",
        message: `${saved.rule_id} is now in DRAFT.`,
      });
      onSuccess(saved);
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: errorMessage(e) });
    }
  };

  // ── DSL preview ─────────────────────────────────────────────────────────────
  const preview = JSON.stringify(
    {
      type: "dsl",
      operator,
      conditions: conditions.map((c) => ({
        field: c.field || "…",
        op: c.op,
        value: parseValue(c.rawValue, schema?.fields[c.field], c.op),
      })),
    },
    null,
    2
  );

  if (schemaLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        Loading field catalog…
      </div>
    );
  }

  const fieldNames = schema ? Object.keys(schema.fields).sort() : [];

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="space-y-6">
      {/* ── Metadata ──────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Rule metadata
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Rule ID *</label>
            <input
              type="text"
              aria-label="Rule ID"
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              disabled={isEditing}
              placeholder="R-C01"
              className={`${inputCls} ${isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </div>
          <div>
            <label className={labelCls}>Rule name *</label>
            <input
              type="text"
              aria-label="Rule name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="High-value transfer"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Category</label>
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as RuleCategory)} className={inputCls}>
              {(schema?.categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Severity</label>
            <select aria-label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as RuleSeverity)} className={inputCls}>
              {(schema?.severities ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Risk score (0–200)</label>
            <input
              type="number"
              aria-label="Risk score (0–200)"
              min={0}
              max={200}
              value={riskScore}
              onChange={(e) => setRiskScore(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this rule detect?"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className={labelCls}>
            Explain template{" "}
            <span className="font-normal text-gray-400">(use {"{"} field_name {"}"} placeholders)</span>
          </label>
          <input
            type="text"
            aria-label="Explain template"
            value={explainTemplate}
            onChange={(e) => setExplainTemplate(e.target.value)}
            placeholder="Amount {amount} exceeds threshold"
            className={inputCls}
          />
        </div>
      </section>

      {/* ── Conditions ────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Conditions
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Join with</span>
            <div className="flex rounded-lg border border-gray-200 dark:border-navy-500 overflow-hidden">
              {(["AND", "OR"] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOperator(op)}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                    operator === op
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-navy-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {conditions.map((row, idx) => {
            const meta = schema?.fields[row.field];
            const validOps = meta?.ops ?? ["==", "!=", ">", ">=", "<", "<=", "in", "not_in"];
            return (
              <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-navy-800 rounded-lg">
                {/* Field picker */}
                <div className="flex-1 min-w-0">
                  <select
                    aria-label="Condition field"
                    value={row.field}
                    onChange={(e) => updateCondition(idx, { field: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  >
                    <option value="">— field —</option>
                    {fieldNames.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  {meta && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{meta.description}</p>
                  )}
                </div>

                {/* Operator picker */}
                <div className="w-28 flex-shrink-0">
                  <select
                    aria-label="Condition operator"
                    value={row.op}
                    onChange={(e) => updateCondition(idx, { op: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  >
                    {validOps.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                {/* Value input */}
                <div className="flex-1 min-w-0">
                  <ValueInput
                    row={row}
                    meta={meta}
                    onChange={(v) => updateCondition(idx, { rawValue: v })}
                  />
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeCondition(idx)}
                  disabled={conditions.length === 1}
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  aria-label="Remove condition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add condition
        </button>
      </section>

      {/* ── DSL preview ───────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          DSL preview
        </h2>
        <pre className="text-xs bg-gray-50 dark:bg-navy-800 border border-gray-200 dark:border-navy-500 rounded-lg p-3 overflow-x-auto font-mono text-gray-900 dark:text-white">
          {preview}
        </pre>
      </section>

      {/* ── Validation errors ──────────────────────────────────────────────── */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-1">
          {validationErrors.map((e, i) => (
            <p key={i} className="text-sm text-red-700 dark:text-red-300">• {e}</p>
          ))}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleValidate}
          className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
        >
          Validate
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
