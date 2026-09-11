"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { riskBandColors } from "@/config/constants";
import type {
  ScenarioAggregate,
  ScenarioLegResult,
  ScenarioResult,
  TemplateInfo,
} from "@/types/simulator";
import {
  BAND_LABEL,
  DecisionScale,
  bandOf,
  Notice,
  RunButton,
  SectionHeading,
  VerdictHeader,
  revealVerdict,
  inputCls,
  monoCls,
  panelCls,
  wellCls,
} from "@/components/simulator/ui";
import AnalystWorkflow, { type AlertInput } from "@/components/simulator/AnalystWorkflow";
import {
  useListScenarioTemplatesQuery,
  useSimulateScenarioMutation,
} from "@/redux/slices/api/simulationApi";
import { errorMessage } from "@/lib/errors";

/**
 * Plain-English names for the backend's typology templates.
 *
 * The API returns machine identifiers (`structuring_burst`) and terse
 * descriptions written for engineers. This page is read by compliance and
 * fraud people, so it needs the typology's actual name and a sentence that
 * says what the money is doing. Anything the backend adds that isn't listed
 * here still renders, using the API's own name and description.
 */
const TYPOLOGY: Record<string, { title: string; blurb: string }> = {
  structuring_burst: {
    title: "Structuring",
    blurb: "Repeated payments deliberately kept under the cash reporting line, inside one window.",
  },
  smurfing_fanout: {
    title: "Smurfing",
    blurb: "One source spreads a large sum across many nominees so no single leg stands out.",
  },
  layering_chain: {
    title: "Layering",
    blurb: "Funds hop through a chain of shell parties across jurisdictions to break the trail.",
  },
  velocity_spike: {
    title: "Velocity spike",
    blurb: "A burst of payments far faster than the account has ever moved money before.",
  },
  device_farming_ring: {
    title: "Device farming",
    blurb: "Several wallets transacting from one handset, the usual shape of a mule ring.",
  },
  pep_bribe: {
    title: "Politically exposed sender",
    blurb: "A payment from a name that matches the politically exposed persons list.",
  },
  sanctions_hit: {
    title: "Sanctions match",
    blurb: "A payment from a name that matches a sanctions list, which screening should catch.",
  },
};

/** Human labels for template parameters. Unlisted keys fall back to the key
 *  with underscores opened up, so a new backend parameter is still legible. */
const PARAM_LABEL: Record<string, string> = {
  n_legs: "Payments",
  n_wallets: "Wallets",
  n_recipients: "Recipients",
  hops: "Hops in the chain",
  amount: "Amount each (GHS)",
  per_amount: "Amount each (GHS)",
  under_ctr_amount: "Amount each (GHS)",
  start_amount: "Starting amount (GHS)",
  decay: "Share kept per hop",
  interval_minutes: "Minutes between payments",
  countries: "Route",
  country: "Country",
  channel: "Channel",
  official_name: "Sender name",
  name: "Sender name",
  device_id: "Device ID",
  iccid: "SIM (ICCID)",
  imei: "Handset (IMEI)",
};

function paramLabel(key: string) {
  const known = PARAM_LABEL[key];
  if (known) return known;
  const opened = key.replace(/_/g, " ");
  return opened.charAt(0).toUpperCase() + opened.slice(1);
}

function typology(t: TemplateInfo) {
  return TYPOLOGY[t.name] ?? { title: typologyTitle(t.name), blurb: t.description };
}

/** Title only, for places that have the template's name but not the record
 *  (a finished run reports `scenario`, not the template it came from). */
function typologyTitle(name: string) {
  const known = TYPOLOGY[name];
  if (known) return known.title;
  const opened = name.replace(/_/g, " ");
  return opened.charAt(0).toUpperCase() + opened.slice(1);
}

/**
 * Display order, strongest first.
 *
 * The API sorts alphabetically, which happens to open on device farming, the
 * weakest of the seven to lead with. Structuring and smurfing are the ones a
 * compliance audience recognises immediately, so they go first. Anything not
 * listed keeps its API position, appended after these.
 */
const TYPOLOGY_ORDER = [
  "structuring_burst",
  "smurfing_fanout",
  "layering_chain",
  "velocity_spike",
  "sanctions_hit",
  "pep_bribe",
  "device_farming_ring",
];

function inDisplayOrder(list: TemplateInfo[]): TemplateInfo[] {
  const rank = (n: string) => {
    const i = TYPOLOGY_ORDER.indexOf(n);
    return i === -1 ? TYPOLOGY_ORDER.length : i;
  };
  return [...list].sort((a, b) => rank(a.name) - rank(b.name));
}

/** Values the backend uses as "leave it to me". Shown as placeholder text so
 *  the box reads as empty-and-optional rather than pre-filled with literals. */
const PLACEHOLDERS = new Set(["<auto>", "<default>"]);

const DISPOSITION = {
  approved: { label: "Approved", color: riskBandColors.ALLOW },
  held_for_review: { label: "Held", color: riskBandColors.HOLD },
  blocked: { label: "Blocked", color: riskBandColors.BLOCK },
  not_scored: { label: "Not scored", color: "#3A3F6B" },
} as const;

function dispo(d: string) {
  return DISPOSITION[d as keyof typeof DISPOSITION] ?? DISPOSITION.not_scored;
}

/* ── param editor ────────────────────────────────────────────────────────── */

function ParamInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  if (typeof value === "boolean") {
    return (
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
          value
            ? "border-primary/60 bg-primary/[0.12] text-[#F5C0A5]"
            : "border-white/10 bg-[#0B0B24] text-[#9FA3C4]"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: value ? "#E06030" : "#3A3F6B" }} />
        {value ? "On" : "Off"}
      </button>
    );
  }
  if (typeof value === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={`${inputCls} ${monoCls}`}
      />
    );
  }
  if (Array.isArray(value)) {
    return (
      <input
        type="text"
        value={value.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="GH, AE, GH"
        className={inputCls}
      />
    );
  }
  const raw = String(value ?? "");
  const isPlaceholder = PLACEHOLDERS.has(raw);
  return (
    <input
      type="text"
      value={isPlaceholder ? "" : raw}
      placeholder={isPlaceholder ? "Generated for you" : undefined}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

/* ── result panels ───────────────────────────────────────────────────────── */

function Aggregate({ agg }: { agg: ScenarioAggregate }) {
  const cases = Object.entries(agg.cases_by_type);
  const dispositions = Object.entries(agg.dispositions);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Alerts raised" value={String(agg.alerts_opened)} />
        <Stat label="Cash reports" value={String(agg.ctrs_created)} />
        <Stat label="Legs scored" value={`${agg.legs_scored}/${agg.legs}`} />
      </div>
      <div className="flex flex-wrap gap-2">
        {cases.length === 0 ? (
          <span className="text-[12px] text-[#767CAB]">No case would open.</span>
        ) : (
          cases.map(([t, n]) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: `${riskBandColors.HOLD}1F`, color: riskBandColors.HOLD }}
            >
              {n} {t.toLowerCase()} {n === 1 ? "case" : "cases"}
            </span>
          ))
        )}
        {dispositions.map(([d, n]) => (
          <span
            key={d}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: `${dispo(d).color}1A`, color: dispo(d).color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dispo(d).color }} />
            {n} {dispo(d).label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${wellCls} px-3 py-2.5`}>
      <div className={`text-[19px] font-semibold ${monoCls} text-[#F2F3FA]`}>{value}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-[#767CAB]">{label}</div>
    </div>
  );
}

/** The legs genuinely are an ordered sequence, so numbering them is carrying
 *  information rather than decorating. */
function Timeline({ legs }: { legs: ScenarioLegResult[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2">
        {legs.map((leg, i) => {
          const d = dispo(leg.disposition);
          const active = open === i;
          return (
            <button
              key={leg.index}
              type="button"
              onClick={() => setOpen(active ? null : i)}
              title={leg.label ?? undefined}
              className={`flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors ${
                active ? "border-white/25 bg-white/[0.04]" : "border-white/[0.07] hover:border-white/20"
              }`}
            >
              <span className={`text-[10px] ${monoCls} text-[#5B6091]`}>{i + 1}</span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold ${monoCls}`}
                style={{ background: `${d.color}22`, color: d.color, boxShadow: `inset 0 0 0 1px ${d.color}55` }}
              >
                {leg.error ? "?" : leg.combined_risk_score}
              </span>
              <span className="text-[10px] font-medium" style={{ color: d.color }}>
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
      {open !== null && legs[open] && (
        <div className={`${wellCls} mt-2 p-3`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#F2F3FA]">
              Payment {legs[open].index + 1}
              {legs[open].label ? `: ${legs[open].label}` : ""}
            </span>
            <span className={`text-[11px] ${monoCls} text-[#5B6091]`}>{legs[open].simulated_transaction_id}</span>
          </div>
          {legs[open].error ? (
            <p className="text-[12px] text-red-300">{legs[open].error}</p>
          ) : legs[open].triggered_rules.length === 0 ? (
            <p className="text-[12px] text-[#767CAB]">No rule fired on this payment.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {legs[open].triggered_rules.map((r, i) => (
                <span
                  key={`${r.rule_id}-${i}`}
                  className="rounded border border-white/10 px-2 py-0.5 text-[11px] text-[#C9CCE8]"
                >
                  {r.name}
                  {r.contribution ? <span className={`ml-1 ${monoCls} text-[#767CAB]`}>+{r.contribution}</span> : null}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── main ────────────────────────────────────────────────────────────────── */

/**
 * `publicMode` splits this component the same way it splits TransactionSimulator:
 *
 *  - public (the customer-facing /simulator page): templates and runs go through
 *    `/api/public-simulator*`, the server route that holds the service
 *    credential, and the run PERSISTS into the fixed demo institution so the
 *    client sees the pattern arrive in their queue.
 *  - authenticated (the console): templates and runs go through the normal
 *    cookie-authenticated API, and the run is a DRY RUN. An analyst testing a
 *    typology must not inject traffic into their own institution's queues.
 */
export default function ScenarioSimulator({ publicMode = false }: { publicMode?: boolean }) {
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [analystMode, setAnalystMode] = useState(false);
  const verdictRef = useRef<HTMLElement | null>(null);

  // Authenticated console: RTK Query loads the templates through the normal
  // cookie-authenticated API. Skipped entirely on the public page, which has no
  // session and must go through the credential-holding proxy below.
  const tplQuery = useListScenarioTemplatesQuery(undefined, { skip: publicMode });
  const [runScenarioDryRun] = useSimulateScenarioMutation();

  useEffect(() => {
    if (publicMode || !tplQuery.data) return;
    const data = inDisplayOrder(tplQuery.data);
    setTemplates(data);
    if (data.length) {
      setSelected(data[0].name);
      setParams({ ...data[0].params });
    }
  }, [publicMode, tplQuery.data]);

  useEffect(() => {
    if (publicMode || !tplQuery.isError) return;
    setLoadErr("The scenario templates did not load. The simulator backend may be down.");
  }, [publicMode, tplQuery.isError]);

  useEffect(() => {
    if (!publicMode) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public-simulator/templates");
        if (!res.ok) {
          if (!alive) return;
          setLoadErr(
            res.status === 404
              ? "The scenario API is missing from this deploy (HTTP 404). Redeploy the site with the cache cleared."
              : `The scenario templates did not load (HTTP ${res.status}). The simulator backend may be down.`,
          );
          return;
        }
        const data = inDisplayOrder((await res.json()) as TemplateInfo[]);
        if (!alive) return;
        setTemplates(data);
        if (data.length) {
          setSelected(data[0].name);
          setParams({ ...data[0].params });
        }
      } catch {
        if (alive) setLoadErr("The scenario API could not be reached. Check the connection and try again.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [publicMode]);

  const current = useMemo(() => templates?.find((t) => t.name === selected) ?? null, [templates, selected]);

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
      // Drop the placeholder values so the backend applies its own defaults.
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === "string" && (PLACEHOLDERS.has(v) || v === "")) continue;
        clean[k] = v;
      }
      if (publicMode) {
        // Customer-facing surface: the run PERSISTS into the fixed demo
        // institution, so the pattern lands in the client's queue for real.
        const res = await fetch("/api/public-simulator/scenarios/persist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: selected, params: clean }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = (data as { detail?: unknown })?.detail;
          throw new Error(
            typeof detail === "string"
              ? detail
              : (detail as { message?: string })?.message || `The scenario did not run (${res.status}).`,
          );
        }
        setResult(data as ScenarioResult);
      } else {
        // Console: dry run. Testing a typology must not inject traffic into the
        // analyst's own institution.
        const data = await runScenarioDryRun({ template: selected, params: clean }).unwrap();
        setResult(data);
      }
      revealVerdict(verdictRef.current);
    } catch (e) {
      // Public mode throws a plain Error carrying the backend's message; the RTK
      // mutation throws a FetchBaseQueryError, which errorMessage() unpacks.
      setRunErr(
        e instanceof Error ? e.message : errorMessage(e, "The scenario did not run."),
      );
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  if (loadErr) {
    return (
      <div className={`${panelCls} p-6`}>
        <Notice tone="error">{loadErr}</Notice>
      </div>
    );
  }

  const peak = result ? result.aggregate.max_score : null;
  // Take the band from the leg that produced the peak, so the headline agrees
  // with the engine rather than with a locally-derived threshold table.
  const peakLeg = result
    ? result.leg_results.reduce<ScenarioLegResult | null>(
        (a, b) => (a && a.combined_risk_score >= b.combined_risk_score ? a : b),
        null,
      )
    : null;
  const band = peak !== null ? bandOf(peak, peakLeg?.risk_band) : null;

  // Normalize the sequence's outcome into the shared analyst-workflow input.
  const cases = result ? Object.entries(result.aggregate.cases_by_type) : [];
  const amtParam = params.amount ?? params.per_amount ?? params.under_ctr_amount ?? params.start_amount;
  const perAmount = Number(amtParam) || 0;
  const scenarioAlert: AlertInput | null = result
    ? {
        score: result.aggregate.max_score,
        rules: result.aggregate.rules_fired,
        subject: `${typologyTitle(result.scenario)} — sequence`,
        txnNumber: (peakLeg?.simulated_transaction_id ?? "SIM-SEQ").replace(/^SIM-/, "TXN-").slice(0, 20),
        primaryAmount: perAmount > 0 ? perAmount * (result.aggregate.legs || 1) : undefined,
        summaryLine: `${typologyTitle(result.scenario)} · ${result.aggregate.legs} payments`,
        detailRows: [
          { k: "Typology", v: typologyTitle(result.scenario) },
          { k: "Payments", v: String(result.aggregate.legs) },
          { k: "Alerts raised", v: String(result.aggregate.alerts_opened) },
          { k: "Cases opened", v: cases.length ? cases.map(([t, n]) => `${t} × ${n}`).join(", ") : "—" },
          { k: "Cash reports", v: String(result.aggregate.ctrs_created) },
        ],
        caseType: cases.length ? cases[0][0] : "AML",
        fromAlerts: result.aggregate.alerts_opened,
        persistedAlertIds: result.alert_ids ?? [],
        persistedCaseIds: result.case_ids ?? [],
      }
    : null;

  if (analystMode && scenarioAlert) {
    return (
      <AnalystWorkflow
        alert={scenarioAlert}
        allowFiling={!publicMode}
        onExit={() => setAnalystMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* VERDICT */}
      <section ref={verdictRef} className={`${panelCls} scroll-mt-4 p-6 sm:p-7`}>
        <VerdictHeader
          score={peak}
          band={band}
          headline={band ? `Peaks at ${BAND_LABEL[band].toLowerCase()}` : "No sequence run yet"}
          sub={
            result
              ? `Highest of ${result.leg_results.length} payments in the sequence`
              : "Pick a typology below and run it"
          }
          aside={result ? typologyTitle(result.scenario) : undefined}
          asideSub={result ? (result.persisted ? "Sent to the dashboard" : "Rolled back") : undefined}
        />
        <DecisionScale score={peak} band={band} />
        {result?.persisted && (result.alert_ids?.length || result.case_ids?.length) ? (
          <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-[13px] text-[#8EEFC7]">
            <span className="font-semibold">Sent to the dashboard.</span>{" "}
            {result.alert_ids?.length ?? 0} alert{(result.alert_ids?.length ?? 0) === 1 ? "" : "s"}
            {result.case_ids?.length
              ? ` and ${result.case_ids.length} case${result.case_ids.length === 1 ? "" : "s"}`
              : ""}{" "}
            created in Sample Org 1 — open the main dashboard to track{" "}
            {(result.alert_ids?.length ?? 0) === 1 ? "it" : "them"}.
            {result.alert_ids?.length ? (
              <span className="mt-1 block font-mono text-[11px] text-[#5BA88C]">
                {result.alert_ids.slice(0, 3).join("   ")}
                {result.alert_ids.length > 3 ? "   …" : ""}
              </span>
            ) : null}
          </div>
        ) : null}
        {result && result.aggregate.alerts_opened > 0 && (
          <button
            type="button"
            onClick={() => setAnalystMode(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E06030] px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#c9542a]"
          >
            This raised {result.aggregate.alerts_opened} alert{result.aggregate.alerts_opened > 1 ? "s" : ""} —{" "}
            {publicMode ? "see what the bank does with it" : "work it as an L1 analyst"} →
          </button>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* CONFIG */}
        <div className={`${panelCls} p-5 sm:p-6`}>
          <SectionHeading aside={templates ? `${templates.length} typologies` : undefined}>
            Choose a typology
          </SectionHeading>
          {!templates ? (
            <p className="text-[13px] text-[#767CAB]">Loading typologies.</p>
          ) : (
            <div className="space-y-1.5">
              {templates.map((t) => {
                const meta = typology(t);
                const active = selected === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickTemplate(t.name)}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/[0.09]"
                        : "border-white/[0.07] hover:border-white/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className={`text-[13px] font-semibold ${active ? "text-[#F5C0A5]" : "text-[#C9CCE8]"}`}>
                      {meta.title}
                    </div>
                    {/* Only the selection carries its explanation. Seven blurbs
                        at once pushed the run button below the fold on a
                        laptop, which is where this gets demonstrated. */}
                    {active && (
                      <div className="mt-1 text-[12px] leading-snug text-[#9FA3C4]">{meta.blurb}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {current && Object.keys(current.params).length > 0 && (
            <div className="mt-6">
              <SectionHeading>Tune it</SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {Object.keys(current.params).map((key) => (
                  <div key={key} className="flex min-w-0 flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#9FA3C4]">{paramLabel(key)}</label>
                    <ParamInput value={params[key]} onChange={(v) => setParams((p) => ({ ...p, [key]: v }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 border-t border-white/[0.07] pt-5">
            <RunButton onClick={run} busy={running} disabled={!selected}>
              Run the sequence
            </RunButton>
            {running && (
              <p className="mt-2 text-center text-[11px] text-[#666C99]">
                Every payment goes through the pipeline in order. This takes a few seconds.
              </p>
            )}
          </div>
        </div>

        {/* OUTCOME */}
        <div className={`${panelCls} p-5 sm:p-6`}>
          {runErr ? (
            <Notice tone="error">{runErr}</Notice>
          ) : !result ? (
            <div>
              <SectionHeading>What a sequence proves</SectionHeading>
              <p className="text-[13px] leading-relaxed text-[#9FA3C4]">
                A single payment rarely looks criminal. Laundering shows up in the shape of several
                payments together: how close they sit to a reporting threshold, how fast they arrive,
                how many parties they touch, whether one handset sits behind all of them.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#9FA3C4]">
                Each typology here runs as an ordered sequence through the same pipeline a real
                payment takes, with each leg visible to the next. You get the score for every leg,
                the rules each one tripped, and what the system would have opened at the end.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {result.expectation && (
                <Notice tone={result.expectation.passed ? "ok" : "error"}>
                  {result.expectation.passed ? (
                    "The engine caught this typology, as expected."
                  ) : (
                    <>
                      The engine did not catch this typology.
                      <ul className="mt-1.5 space-y-0.5">
                        {result.expectation.checks
                          .filter((c) => !c.ok)
                          .map((c, i) => (
                            <li key={i} className={`${monoCls} text-[11px]`}>
                              {c.check}: expected {JSON.stringify(c.expected)}, got {JSON.stringify(c.actual)}
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </Notice>
              )}

              <div>
                <SectionHeading>Across the sequence</SectionHeading>
                <Aggregate agg={result.aggregate} />
              </div>

              <div>
                <SectionHeading aside="Select one for its rules">
                  Payment by payment
                </SectionHeading>
                <Timeline legs={result.leg_results} />
              </div>

              {result.aggregate.rules_fired.length > 0 && (
                <div>
                  <SectionHeading aside={`${result.aggregate.rules_fired.length} of 111`}>
                    Rules that fired
                  </SectionHeading>
                  <div className="flex flex-wrap gap-1.5">
                    {result.aggregate.rules_fired.map((r) => (
                      <span
                        key={r}
                        className="rounded border border-white/10 px-2 py-0.5 text-[11px] text-[#C9CCE8]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Notice tone="ok">No case opened, no report filed, no data saved.</Notice>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
