"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type {
  ScenarioAggregate,
  ScenarioLegResult,
  ScenarioResult,
  TemplateInfo,
} from "@/types/simulator";

const cardCls =
  "bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm";
const inputCls =
  "text-sm rounded-lg border border-gray-200 dark:border-navy-500 bg-white dark:bg-navy-800 text-gray-900 dark:text-white px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/40";

const DISPOSITION = {
  approved: { label: "Approved", dot: "#16a34a", chip: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200" },
  held_for_review: { label: "Held", dot: "#d97706", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" },
  blocked: { label: "Blocked", dot: "#dc2626", chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200" },
  not_scored: { label: "Not scored", dot: "#9ca3af", chip: "bg-gray-100 text-gray-500 dark:bg-navy-800 dark:text-navy-300" },
} as const;

function dispo(d: string) {
  return DISPOSITION[d as keyof typeof DISPOSITION] ?? DISPOSITION.not_scored;
}

// ── param editor ─────────────────────────────────────────────────────────────

function ParamInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (typeof value === "boolean") {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`text-xs font-medium px-3 py-2 rounded-lg border flex items-center gap-2 ${
          value
            ? "border-primary bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-200"
            : "border-gray-200 dark:border-navy-500 bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${value ? "bg-primary" : "bg-gray-300 dark:bg-navy-500"}`} />
        {value ? "on" : "off"}
      </button>
    );
  }
  if (typeof value === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={`${inputCls} font-mono`}
      />
    );
  }
  if (Array.isArray(value)) {
    return (
      <input
        type="text"
        value={value.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="comma-separated"
        className={inputCls}
      />
    );
  }
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

// ── result panels ────────────────────────────────────────────────────────────

function AggregatePanel({ agg }: { agg: ScenarioAggregate }) {
  const cases = Object.entries(agg.cases_by_type);
  const dispositions = Object.entries(agg.dispositions);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat label="Max score" value={String(agg.max_score)} accent />
      <Stat label="Alerts" value={String(agg.alerts_opened)} />
      <Stat label="CTRs" value={String(agg.ctrs_created)} />
      <Stat label="Legs scored" value={`${agg.legs_scored}/${agg.legs}`} />
      <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-2">
        {cases.length === 0 ? (
          <span className="text-[11px] text-gray-400 dark:text-navy-400">No cases would open</span>
        ) : (
          cases.map(([t, n]) => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">
              {t} case × {n}
            </span>
          ))
        )}
        {dispositions.map(([d, n]) => (
          <span key={d} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${dispo(d).chip}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: dispo(d).dot }} />
            {dispo(d).label} × {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-navy-600 bg-gray-50 dark:bg-navy-800 px-3 py-2">
      <div className={`text-lg font-bold font-mono ${accent ? "text-primary" : "text-gray-900 dark:text-white"}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-navy-400">{label}</div>
    </div>
  );
}

function Timeline({ legs }: { legs: ScenarioLegResult[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {legs.map((leg, i) => {
          const d = dispo(leg.disposition);
          return (
            <div key={leg.index} className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className={`w-[92px] flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors ${
                  open === i ? "border-primary bg-primary-50/50 dark:bg-primary-900/20" : "border-gray-100 dark:border-navy-600 hover:border-gray-300 dark:hover:border-navy-400"
                }`}
                title={leg.label ?? undefined}
              >
                <span className="text-[10px] font-mono text-gray-500 dark:text-navy-300 truncate w-full text-center">{leg.customer_ref}</span>
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: d.dot }}
                >
                  {leg.error ? "—" : leg.combined_risk_score}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: d.dot }}>{d.label}</span>
              </button>
              {i < legs.length - 1 && (
                <div className="w-4 h-px bg-gray-200 dark:bg-navy-500 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      {open !== null && legs[open] && (
        <div className="mt-2 rounded-lg border border-gray-100 dark:border-navy-600 bg-gray-50 dark:bg-navy-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              Leg {legs[open].index + 1} · {legs[open].customer_ref}
              {legs[open].label ? ` — ${legs[open].label}` : ""}
            </span>
            <span className="text-[11px] font-mono text-gray-400 dark:text-navy-400">{legs[open].simulated_transaction_id}</span>
          </div>
          {legs[open].error ? (
            <p className="text-[11px] text-red-600 dark:text-red-300">{legs[open].error}</p>
          ) : legs[open].triggered_rules.length === 0 ? (
            <p className="text-[11px] text-gray-400 dark:text-navy-400">No rules triggered.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {legs[open].triggered_rules.map((r, i) => (
                <span key={`${r.rule_id}-${i}`} className="text-[11px] px-2 py-0.5 rounded border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300">
                  {r.name}{r.contribution ? ` +${r.contribution}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpectationBadge({ result }: { result: ScenarioResult }) {
  const exp = result.expectation;
  if (!exp) return null;
  const failed = exp.checks.filter((c) => !c.ok);
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-xs ${
        exp.passed
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        {exp.passed ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
        {exp.passed ? "Expectation passed — the system caught this typology" : "Expectation failed"}
      </div>
      {!exp.passed && failed.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {failed.map((c, i) => (
            <li key={i} className="font-mono text-[11px]">
              {c.check}: expected {JSON.stringify(c.expected)}, got {JSON.stringify(c.actual)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function ScenarioSimulator() {
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public-simulator/templates");
        if (!res.ok) {
          if (!alive) return;
          setLoadErr(
            res.status === 404
              ? "Scenario API not found (HTTP 404) — this deploy is missing the /api/public-simulator/templates route. Redeploy the site (Clear cache and deploy)."
              : `Could not load scenario templates (HTTP ${res.status}) — the simulator backend may be unavailable.`,
          );
          return;
        }
        const data = (await res.json()) as TemplateInfo[];
        if (!alive) return;
        setTemplates(data);
        if (data.length) {
          setSelected(data[0].name);
          setParams({ ...data[0].params });
        }
      } catch {
        if (alive) setLoadErr("Could not reach the scenario API (network error).");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = useMemo(
    () => templates?.find((t) => t.name === selected) ?? null,
    [templates, selected],
  );

  function pickTemplate(name: string) {
    const t = templates?.find((x) => x.name === name);
    setSelected(name);
    setParams(t ? { ...t.params } : {});
    setResult(null);
    setRunErr(null);
  }

  async function run() {
    if (!selected) return;
    setRunning(true);
    setRunErr(null);
    try {
      // Drop placeholder "<auto>"/"<default>" so the backend uses its own defaults.
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === "string" && (v === "<auto>" || v === "<default>" || v === "")) continue;
        clean[k] = v;
      }
      const res = await fetch("/api/public-simulator/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: selected, params: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = (data as { detail?: unknown })?.detail;
        throw new Error(
          typeof detail === "string" ? detail : (detail as { message?: string })?.message || `Scenario failed (${res.status})`,
        );
      }
      setResult(data as ScenarioResult);
    } catch (e) {
      setRunErr(e instanceof Error ? e.message : "Scenario failed");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  if (loadErr) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-gray-100 dark:border-navy-600 bg-white dark:bg-navy-700">
        {loadErr}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-5 items-start">
      {/* CONFIG */}
      <div className={cardCls}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-600">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Scenario</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pick a laundering / fraud typology and tune it — it runs as a sequence through the real pipeline.
          </p>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Template</label>
            <select value={selected} onChange={(e) => pickTemplate(e.target.value)} className={inputCls} disabled={!templates}>
              {!templates && <option>Loading…</option>}
              {templates?.map((t) => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
            {current && <p className="text-[11px] text-gray-400 dark:text-navy-400">{current.description}</p>}
          </div>

          {current && Object.keys(current.params).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 block">Parameters</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(current.params).map(([key]) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-gray-500 dark:text-navy-300 font-mono">{key}</label>
                    <ParamInput
                      value={params[key]}
                      onChange={(v) => setParams((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={run}
            disabled={running || !selected}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {running && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            Run scenario
          </button>
          {running && (
            <p className="text-[11px] text-gray-400 dark:text-navy-400 -mt-3 text-center">
              Running every leg through the pipeline — this can take a few seconds.
            </p>
          )}
        </div>
      </div>

      {/* RESULT */}
      <div className={cardCls}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-600 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Outcome</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {result ? `${result.scenario} — nothing persisted` : "Run a scenario to see what the system would do"}
            </p>
          </div>
        </div>

        {runErr ? (
          <div className="p-5">
            <div className="text-xs px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              {runErr}
            </div>
          </div>
        ) : !result ? (
          <div className="p-10 text-center text-sm text-gray-400 dark:text-navy-400">No scenario run yet.</div>
        ) : (
          <div className="p-5 space-y-5">
            <ExpectationBadge result={result} />
            <AggregatePanel agg={result.aggregate} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-2">
                Sequence ({result.leg_results.length} legs) — click a leg for its rules
              </p>
              <Timeline legs={result.leg_results} />
            </div>
            {result.aggregate.rules_fired.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-2">
                  Rules fired across the scenario
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.aggregate.rules_fired.map((r) => (
                    <span key={r} className="text-[11px] px-2 py-0.5 rounded border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              ✓ Simulated — no case opened, no report filed, no data saved.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
