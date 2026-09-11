"use client";

import { useRef, useState } from "react";
import {
  useLazyGetCustomerRiskProfileQuery,
  useLazyGetCustomerBaselineQuery,
} from "@/redux/slices/api/customersApi";
import { useSimulateTransactionMutation } from "@/redux/slices/api/simulationApi";
import { estimateSimulation, type EstimateProfileInput } from "@/lib/simulatorEstimate";
import ScenarioSimulator from "@/components/simulator/ScenarioSimulator";
import AnalystWorkflow from "@/components/simulator/AnalystWorkflow";
import { errorMessage } from "@/lib/errors";
import ActionBadge from "@/components/ActionBadge";
import { RULE_CATALOG } from "@/config/ruleCatalog";
import { riskBandColors, TRANSACTION_TYPES, CHANNELS } from "@/config/constants";
import type { SimulationRequest, SimulationViewResult } from "@/types/simulator";
import { LockClosedIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  BAND_LABEL,
  Chip,
  bandOf,
  DecisionScale,
  Field,
  Notice,
  RunButton,
  SectionHeading,
  Segmented,
  VerdictHeader,
  revealVerdict,
  inputCls,
  monoCls,
  panelCls,
  wellCls,
} from "@/components/simulator/ui";

const COUNTRIES = [
  { code: "GH", label: "Ghana (domestic)" },
  { code: "NG", label: "Nigeria" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "GB", label: "United Kingdom" },
];

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
const SYNTH_RISK_BASELINE: Record<(typeof RISK_LEVELS)[number], number> = {
  LOW: 15,
  MEDIUM: 45,
  HIGH: 75,
};

type CustomerMode = "real" | "synthetic";

type ScenarioKey = "normal" | "crossborder" | "newdevice";

/** Preset payments. The label says what the payment is, so the visitor can pick
 *  one without reading the six fields it sets. */
const SCENARIOS: Record<
  ScenarioKey,
  {
    label: string;
    amount: number;
    transaction_type: string;
    channel: string;
    receiver_country: string;
    newDevice: boolean;
    rooted: boolean;
  }
> = {
  normal: { label: "Everyday transfer", amount: 450, transaction_type: "Transfer", channel: "Momo", receiver_country: "GH", newDevice: false, rooted: false },
  crossborder: { label: "Large cross-border", amount: 18_500, transaction_type: "Transfer", channel: "Bank", receiver_country: "AE", newDevice: false, rooted: false },
  newdevice: { label: "Cash-out on a rooted phone", amount: 2_200, transaction_type: "Withdrawal", channel: "Card", receiver_country: "GH", newDevice: true, rooted: true },
};

const DISPOSITION_LABEL: Record<string, string> = {
  approved: "Approved",
  held_for_review: "Held for review",
  blocked: "Blocked",
};

function randomDeviceId() {
  return `SIM-DEV-${Math.random().toString(36).slice(2, 10)}`;
}

/** Backend marker (app/services/simulation/service.py BUDGET_EXHAUSTED) meaning
 *  the demo institution has spent its daily allowance of simulator writes. */
const BUDGET_EXHAUSTED = "daily_budget_exhausted";

function isBudgetExhausted(data: unknown): boolean {
  const detail = (data as { detail?: unknown } | undefined)?.detail;
  const errors = (detail as { errors?: unknown } | undefined)?.errors;
  return Array.isArray(errors) && errors.includes(BUDGET_EXHAUSTED);
}

async function postPublic(url: string, request: SimulationRequest) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <LockClosedIcon className="h-8 w-8 text-[#3A3F6B]" />
      <p className="text-sm font-medium text-[#9FA3C4]">
        You don&apos;t have permission to use the transaction simulator.
      </p>
      <p className="text-xs text-[#666C99]">Requires the Simulate Transaction permission.</p>
    </div>
  );
}

/** One layer of the score. The bar is grey unless the layer is the dominant
 *  contributor, so colour keeps meaning "this is what drove the decision". */
function LayerRow({ label, value, lead }: { label: string; value: number; lead: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-[#C9CCE8]">{label}</span>
        <span className={`text-[13px] ${monoCls} ${lead ? "text-[#F2F3FA]" : "text-[#767CAB]"}`}>{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: lead ? "#E06030" : "#3A3F6B" }}
        />
      </div>
    </div>
  );
}

interface TransactionSimulatorProps {
  /** Whether the caller is allowed to use the tool. Ignored (always allowed)
   *  when `publicMode` is set: the public route has no login concept at all. */
  canUse: boolean;
  /**
   * True for the standalone, unauthenticated `/simulator` page: hides the
   * "real customer" lookup (no real customer data on a public surface),
   * forces synthetic-profile mode, and posts through `/api/public-simulator`,
   * a dedicated server route that holds its own service credential and
   * never puts any session/token into the visitor's browser, instead of the
   * cookie-authenticated `/api/proxy` used by the logged-in dashboard page.
   */
  publicMode?: boolean;
}

export default function TransactionSimulator({ canUse, publicMode = false }: TransactionSimulatorProps) {
  const [view, setView] = useState<"single" | "scenario">("single");
  const [analystMode, setAnalystMode] = useState(false);
  const [mode, setMode] = useState<CustomerMode>(publicMode ? "synthetic" : "real");

  // Real customer (dashboard-only; not rendered in publicMode)
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [loadedCustomerId, setLoadedCustomerId] = useState<string | null>(null);
  const [fetchProfile, profileState] = useLazyGetCustomerRiskProfileQuery();
  const [fetchBaseline, baselineState] = useLazyGetCustomerBaselineQuery();

  // Synthetic customer
  const [synthRiskLevel, setSynthRiskLevel] = useState<(typeof RISK_LEVELS)[number]>("LOW");
  const [synthCountry, setSynthCountry] = useState("GH");
  const [synthIsPep, setSynthIsPep] = useState(false);
  const [synthKyc, setSynthKyc] = useState(80);

  // Transaction
  const [amount, setAmount] = useState(450);
  const [transactionType, setTransactionType] = useState<string>("Transfer");
  const [channel, setChannel] = useState<string>("Momo");
  const [country, setCountry] = useState("GH");
  const [newDevice, setNewDevice] = useState(false);
  const [rooted, setRooted] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | null>("normal");

  const [runSimulation, runState] = useSimulateTransactionMutation();
  const [publicRunning, setPublicRunning] = useState(false);
  const [result, setResult] = useState<SimulationViewResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const verdictRef = useRef<HTMLElement | null>(null);

  const profile = profileState.data;
  const customerNotFound = profileState.isError && profileState.originalArgs === customerIdInput.trim();
  const effectiveMode = publicMode ? "synthetic" : mode;
  const canSubmit = effectiveMode === "synthetic" || !!loadedCustomerId;
  const isRunning = publicMode ? publicRunning : runState.isLoading;

  async function handleLookup() {
    const id = customerIdInput.trim();
    if (!id) return;
    setResult(null);
    setRunError(null);
    try {
      await fetchProfile(id).unwrap();
      setLoadedCustomerId(id);
      fetchBaseline(id); // best-effort context for the "amount deviation" rule; not required
    } catch {
      setLoadedCustomerId(null);
    }
  }

  function applyScenario(key: ScenarioKey) {
    const s = SCENARIOS[key];
    setActiveScenario(key);
    setAmount(s.amount);
    setTransactionType(s.transaction_type);
    setChannel(s.channel);
    setCountry(s.receiver_country);
    setNewDevice(s.newDevice);
    setRooted(s.rooted);
  }

  async function handleRun() {
    if (!canSubmit) return;
    const request: SimulationRequest = {
      amount,
      transaction_type: transactionType,
      channel,
      receiver_country: country,
      ...(effectiveMode === "real"
        ? { customer_id: loadedCustomerId! }
        : {
            synthetic_customer: {
              risk_level: synthRiskLevel,
              country_code: synthCountry,
              is_pep: synthIsPep,
              kyc_quality_score: synthKyc,
            },
          }),
      ...(newDevice ? { device_id: randomDeviceId() } : {}),
      ...(rooted ? { is_rooted: true } : {}),
    };

    setRunError(null);
    try {
      const live = publicMode ? await runPublic(request) : await runSimulation(request).unwrap();
      setResult({ ...live, source: "live" });
      revealVerdict(verdictRef.current);
    } catch (err) {
      const status = (err as { status?: number | string } | undefined)?.status;
      if (typeof status === "number" && status >= 400 && status < 500) {
        // Real validation failure (bad customer_id, amount <= 0, malformed input).
        // Surface it, don't paper over it with a misleading local estimate.
        setRunError(errorMessage(err, "Simulation failed"));
        setResult(null);
        return;
      }
      // Endpoint unreachable for some other reason (network hiccup, backend down,
      // 5xx). Fall back to a local estimate so the tool stays usable.
      const estimateProfile: EstimateProfileInput =
        effectiveMode === "real"
          ? profile
            ? {
                risk_score: profile.risk_score,
                is_pep: profile.is_pep,
                kyc_quality_score: profile.kyc_quality_score,
                has_open_alerts: profile.has_open_alerts,
              }
            : { risk_score: 20, is_pep: false, kyc_quality_score: 100, has_open_alerts: false }
          : {
              risk_score: SYNTH_RISK_BASELINE[synthRiskLevel],
              is_pep: synthIsPep,
              kyc_quality_score: synthKyc,
              has_open_alerts: false,
            };
      setResult(estimateSimulation(request, estimateProfile, baselineState.data ?? null));
      revealVerdict(verdictRef.current);
    }
  }

  /** Public-mode call: hits the dedicated, credential-holding server route
   * directly (no cookies, no Redux auth) instead of the RTK Query mutation.
   *
   * It targets the PERSISTING endpoint. The public page stands in for the bank's
   * customer channel, so a payment that trips monitoring has to actually land in
   * the demo bank's alert queue — otherwise the compliance half of the demo has
   * nothing to open. The sequence tab has worked this way for a while; a single
   * payment used to dry-run and vanish.
   *
   * When the demo institution has spent its daily write budget the backend says
   * so with a machine-readable code. Score the payment anyway via the dry-run
   * endpoint rather than leaving the page dead for the rest of the day — the
   * verdict is still real, it just doesn't reach the console, and the walkthrough
   * says as much because the result carries no persisted ids. */
  async function runPublic(request: SimulationRequest) {
    setPublicRunning(true);
    try {
      const write = await postPublic("/api/public-simulator/transactions/persist", request);
      if (write.ok) return write.data;
      if (!isBudgetExhausted(write.data)) throw { status: write.status, data: write.data };

      const dry = await postPublic("/api/public-simulator", request);
      if (!dry.ok) throw { status: dry.status, data: dry.data };
      return dry.data;
    } finally {
      setPublicRunning(false);
    }
  }

  // Backend bug (app/services/simulation/service.py _score(), reads dict key "score"
  // instead of "total_score"): a live breakdown can come back all-zero even when
  // combined_risk_score is correct. Detect it and say so instead of rendering
  // four misleadingly-empty bars.
  const breakdownUnavailable =
    !!result &&
    result.source === "live" &&
    result.combined_risk_score > 0 &&
    result.breakdown.customer_risk === 0 &&
    result.breakdown.transaction_risk === 0 &&
    result.breakdown.behavioral_risk === 0 &&
    result.breakdown.ml_risk === 0;

  // The engine's own band wins over a locally-derived one. See bandOf().
  // Drives the layout: with nothing to show on the right, the controls take
  // the full width and lay their groups out side by side, instead of leaving
  // half the viewport empty next to them.
  const showsResult = !!result || !!runError;

  const band = result ? bandOf(result.combined_risk_score, result.risk_band) : null;
  const leadLayer = result
    ? (["customer_risk", "transaction_risk", "behavioral_risk", "ml_risk"] as const).reduce((a, b) =>
        result.breakdown[b] > result.breakdown[a] ? b : a,
      )
    : null;

  if (!publicMode && !canUse) return <PermissionDenied />;

  return (
    <div className="space-y-6">
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "single", label: "Single payment" },
          { value: "scenario", label: "Sequence" },
        ]}
      />

      {view === "scenario" ? (
        <ScenarioSimulator publicMode={publicMode} />
      ) : analystMode && result ? (
        <AnalystWorkflow
          alert={{
            score: result.combined_risk_score,
            rules: result.triggered_rules.map((r) => r.name),
            breakdown:
              result.breakdown.customer_risk + result.breakdown.transaction_risk + result.breakdown.behavioral_risk > 0
                ? {
                    customer: result.breakdown.customer_risk,
                    transaction: result.breakdown.transaction_risk,
                    behavioral: result.breakdown.behavioral_risk,
                  }
                : undefined,
            subject:
              effectiveMode === "synthetic" ? `Made-up sender · ${synthRiskLevel} risk` : loadedCustomerId ?? "Customer",
            txnNumber: result.simulated_transaction_id.replace(/^SIM-/, "TXN-").slice(0, 20),
            primaryAmount: amount,
            summaryLine: `${transactionType} · ${channel} · ${country}`,
            detailRows: [
              { k: "Amount", v: `GHS ${amount.toLocaleString()}`, mono: true },
              { k: "Type / channel", v: `${transactionType} · ${channel}` },
              { k: "Destination", v: country },
              {
                k: "Sender",
                v: effectiveMode === "synthetic" ? `Made-up · ${synthRiskLevel} risk` : loadedCustomerId ?? "Customer",
              },
            ],
            caseType: "AML",
            fromAlerts: 1,
            persistedAlertIds: result.alert_ids ?? [],
            persistedCaseIds: result.case_ids ?? [],
          }}
          // The public surface is the customer side: it stops at escalation.
          // Investigating and filing the STR is the client's job, done for real
          // in the console.
          allowFiling={!publicMode}
          onExit={() => setAnalystMode(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* VERDICT */}
          <section ref={verdictRef} className={`${panelCls} scroll-mt-4 p-6 sm:p-7`}>
            <VerdictHeader
              score={result ? result.combined_risk_score : null}
              band={band}
              headline={
                result
                  ? (DISPOSITION_LABEL[result.disposition] ?? result.disposition)
                  : "No payment scored yet"
              }
              sub={
                band ? `${BAND_LABEL[band]} band` : "Set up a payment below and run it"
              }
              aside={result ? result.simulated_transaction_id : undefined}
              asideMono
              asideSub={
                result
                  ? result.persisted
                    ? "Sent to the demo bank's console"
                    : "Rolled back, nothing persisted"
                  : undefined
              }
            />
            <DecisionScale score={result ? result.combined_risk_score : null} band={band} />
            {result && result.would_trigger.case_opened && (
              <button
                type="button"
                onClick={() => setAnalystMode(true)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E06030] px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#c9542a]"
              >
                {publicMode
                  ? "This raised an alert — see what the bank does with it →"
                  : "This raised an alert — work it as an L1 analyst →"}
              </button>
            )}
          </section>

          <div
            className={
              showsResult
                ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]"
                : ""
            }
          >
            {/* CONTROLS */}
            <div className={`${panelCls} p-5 sm:p-6`}>
              {!publicMode && (
                <div className="mb-5">
                  <Segmented
                    value={mode}
                    onChange={(m) => {
                      setMode(m);
                      setResult(null);
                    }}
                    options={[
                      { value: "real", label: "Real customer" },
                      { value: "synthetic", label: "Made-up sender" },
                    ]}
                  />
                </div>
              )}

              <div className={showsResult ? "" : "grid gap-x-10 gap-y-6 lg:grid-cols-2"}>
              <div>
              <SectionHeading>Sender</SectionHeading>
              {effectiveMode === "real" ? (
                <div className="space-y-3">
                  <Field label="Customer ID">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customerIdInput}
                        onChange={(e) => setCustomerIdInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                        placeholder="e.g. CUST-10234"
                        className={`${inputCls} ${monoCls}`}
                      />
                      <button
                        type="button"
                        onClick={handleLookup}
                        disabled={profileState.isFetching || !customerIdInput.trim()}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0B24] px-3 py-2 text-xs font-semibold text-[#C9CCE8] hover:border-white/20 disabled:opacity-45"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        Look up
                      </button>
                    </div>
                    {customerNotFound && (
                      <p className="mt-1 text-[11px] text-red-300">No customer found with that ID.</p>
                    )}
                  </Field>

                  {profile && loadedCustomerId && (
                    <div className={`${wellCls} flex flex-wrap items-center gap-x-4 gap-y-1.5 p-3 text-xs`}>
                      <span className={`font-semibold ${monoCls}`}>{profile.customer_id}</span>
                      <ActionBadge action={profile.risk_level} />
                      <span className="text-[#9FA3C4]">
                        score <span className={monoCls}>{profile.risk_score.toFixed(0)}</span>/100
                      </span>
                      {profile.is_pep && <span className="font-medium text-amber-300">Politically exposed</span>}
                      {profile.has_open_alerts && <span className="font-medium text-red-300">Open alerts</span>}
                      <span className="text-[#9FA3C4]">
                        KYC <span className={monoCls}>{profile.kyc_quality_score.toFixed(0)}</span>/100
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Field label="Risk level">
                    <select
                      value={synthRiskLevel}
                      onChange={(e) => setSynthRiskLevel(e.target.value as (typeof RISK_LEVELS)[number])}
                      className={inputCls}
                    >
                      {RISK_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l.charAt(0) + l.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Home country">
                    <select value={synthCountry} onChange={(e) => setSynthCountry(e.target.value)} className={inputCls}>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="KYC completeness" hint="0 to 100. Thin KYC raises customer risk.">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={synthKyc}
                      onChange={(e) => setSynthKyc(clampInt(e.target.value))}
                      className={`${inputCls} ${monoCls}`}
                    />
                  </Field>
                  <Field label="Exposure">
                    <div className="pt-0.5">
                      <Chip active={synthIsPep} onClick={() => setSynthIsPep((v) => !v)}>
                        Politically exposed
                      </Chip>
                    </div>
                  </Field>
                </div>
              )}

              </div>

              <div className={showsResult ? "mt-6" : ""}>
                <SectionHeading>Payment</SectionHeading>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
                    <Chip key={key} active={activeScenario === key} onClick={() => applyScenario(key)}>
                      {SCENARIOS[key].label}
                    </Chip>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Field label="Amount (GHS)">
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={amount}
                      onChange={(e) => {
                        setActiveScenario(null);
                        setAmount(Number(e.target.value) || 0);
                      }}
                      className={`${inputCls} ${monoCls}`}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={transactionType}
                      onChange={(e) => {
                        setActiveScenario(null);
                        setTransactionType(e.target.value);
                      }}
                      className={inputCls}
                    >
                      {TRANSACTION_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Channel">
                    <select
                      value={channel}
                      onChange={(e) => {
                        setActiveScenario(null);
                        setChannel(e.target.value);
                      }}
                      className={inputCls}
                    >
                      {CHANNELS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sending to">
                    <select
                      value={country}
                      onChange={(e) => {
                        setActiveScenario(null);
                        setCountry(e.target.value);
                      }}
                      className={inputCls}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className={showsResult ? "mt-6" : "lg:col-span-2"}>
                <SectionHeading aside="Optional">Device</SectionHeading>
                <p className="-mt-1 mb-3 text-[11px] leading-snug text-[#666C99]">
                  USSD payments carry neither signal. The rules degrade gracefully when they are absent.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={newDevice}
                    onClick={() => {
                      setActiveScenario(null);
                      setNewDevice((v) => !v);
                    }}
                  >
                    Unrecognised device
                  </Chip>
                  <Chip
                    active={rooted}
                    onClick={() => {
                      setActiveScenario(null);
                      setRooted((v) => !v);
                    }}
                  >
                    Rooted or jailbroken
                  </Chip>
                </div>
              </div>

              </div>

              <div className="mt-7 border-t border-white/[0.07] pt-5">
                <RunButton onClick={handleRun} busy={isRunning} disabled={!canSubmit}>
                  Run simulation
                </RunButton>
                {!canSubmit && (
                  <p className="mt-2 text-[11px] text-[#666C99]">Look up a customer above to enable the run.</p>
                )}
              </div>
            </div>

            {/* WHY */}
            {showsResult && (
            <div className={`${panelCls} p-5 sm:p-6`}>
              {runError ? (
                <Notice tone="error">{runError}</Notice>
              ) : !result ? null : (
                <div className="space-y-6">
                  {result.source === "local_estimate" && (
                    <Notice tone="warn">
                      The live engine did not answer, so this is a local estimate from the sender
                      profile. Run again to reach the engine.
                    </Notice>
                  )}

                  <div>
                    <SectionHeading aside={leadLayer ? "Orange marks the largest contributor" : undefined}>
                      Score breakdown
                    </SectionHeading>
                    {breakdownUnavailable ? (
                      <p className="text-[13px] text-[#767CAB]">
                        The engine returned a combined score without its per-layer split. The figure
                        above is still accurate.
                      </p>
                    ) : (
                      <div className="space-y-3.5">
                        <LayerRow label="Customer risk" value={result.breakdown.customer_risk} lead={leadLayer === "customer_risk"} />
                        <LayerRow label="Transaction risk" value={result.breakdown.transaction_risk} lead={leadLayer === "transaction_risk"} />
                        <LayerRow label="Behavioural risk" value={result.breakdown.behavioral_risk} lead={leadLayer === "behavioral_risk"} />
                        <LayerRow label="ML signal" value={result.breakdown.ml_risk} lead={leadLayer === "ml_risk"} />
                      </div>
                    )}
                  </div>

                  <div>
                    <SectionHeading
                      aside={result.triggered_rules.length ? `${result.triggered_rules.length} of 111` : undefined}
                    >
                      Rules that fired
                    </SectionHeading>
                    {result.triggered_rules.length === 0 ? (
                      <p className="text-[13px] text-[#767CAB]">
                        No rule fired. This payment looks ordinary for this sender.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {result.triggered_rules.map((r, i) => {
                          const severity = RULE_CATALOG[r.rule_id]?.severity;
                          return (
                            <div
                              key={`${r.rule_id}-${i}`}
                              className={`${wellCls} flex items-center gap-2.5 px-3 py-2 text-xs`}
                            >
                              <span className={`shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold ${monoCls} text-[#9FA3C4]`}>
                                {r.rule_id}
                              </span>
                              <span className="flex-1 text-[#C9CCE8]">{r.name}</span>
                              {severity && <ActionBadge action={severity} />}
                              <span className={`${monoCls} text-[#767CAB]`}>+{r.contribution}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <SectionHeading>What happens next</SectionHeading>
                    <div className="mb-2.5 flex flex-wrap gap-2">
                      {result.would_trigger.case_opened && <Outcome tone="hold">A case opens</Outcome>}
                      {result.would_trigger.step_up_required && <Outcome tone="stepup">Step-up verification</Outcome>}
                      {result.would_trigger.kyc_requested && <Outcome tone="flag">KYC is requested</Outcome>}
                      {!result.would_trigger.case_opened &&
                        !result.would_trigger.step_up_required &&
                        !result.would_trigger.kyc_requested && <Outcome tone="allow">Nothing follows</Outcome>}
                    </div>
                    {result.would_trigger.kyc_reason && (
                      <p className="mb-2 text-[12px] text-[#9FA3C4]">Reason: {result.would_trigger.kyc_reason}</p>
                    )}
                    {result.would_trigger.notifications.length > 0 && (
                      <ul className="space-y-1">
                        {result.would_trigger.notifications.map((line, i) => (
                          <li key={i} className="flex gap-2 text-[12px] text-[#C9CCE8]">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#3A3F6B]" />
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="border-l-2 border-white/10 pl-3 text-[13px] leading-relaxed text-[#9FA3C4]">
                    {result.explanation}
                  </p>

                  <Notice tone="ok">No case opened, no notification sent, no data saved.</Notice>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Outcome pill, coloured by the band that would produce it so the follow-up
 *  action and the verdict above it read as one statement. */
function Outcome({ tone, children }: { tone: "allow" | "flag" | "stepup" | "hold"; children: React.ReactNode }) {
  const map = { allow: "ALLOW", flag: "FLAG", stepup: "STEP_UP", hold: "HOLD" } as const;
  const c = riskBandColors[map[tone]];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${c}1F`, color: c }}
    >
      {children}
    </span>
  );
}

function clampInt(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
