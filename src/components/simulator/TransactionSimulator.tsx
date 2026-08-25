"use client";

import { useState } from "react";
import {
  useLazyGetCustomerRiskProfileQuery,
  useLazyGetCustomerBaselineQuery,
} from "@/redux/slices/api/customersApi";
import { useSimulateTransactionMutation } from "@/redux/slices/api/simulationApi";
import { estimateSimulation, type EstimateProfileInput } from "@/lib/simulatorEstimate";
import { errorMessage } from "@/lib/errors";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { RULE_CATALOG } from "@/config/ruleCatalog";
import { riskBand, riskBandColors, TRANSACTION_TYPES, CHANNELS } from "@/config/constants";
import type { SimulationRequest, SimulationViewResult } from "@/types/simulator";
import {
  BeakerIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

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

const SCENARIOS: Record<
  ScenarioKey,
  { label: string; emoji: string; amount: number; transaction_type: string; channel: string; receiver_country: string; newDevice: boolean; rooted: boolean }
> = {
  normal: { label: "Normal payment", emoji: "🙂", amount: 450, transaction_type: "Transfer", channel: "Momo", receiver_country: "GH", newDevice: false, rooted: false },
  crossborder: { label: "Large cross-border", emoji: "🌍", amount: 18_500, transaction_type: "Transfer", channel: "Bank", receiver_country: "AE", newDevice: false, rooted: false },
  newdevice: { label: "New device + rooted", emoji: "📵", amount: 2_200, transaction_type: "Withdrawal", channel: "Card", receiver_country: "GH", newDevice: true, rooted: true },
};

const DISPOSITION_LABEL: Record<string, string> = {
  approved: "Approved",
  held_for_review: "Held for review",
  blocked: "Blocked",
};

function randomDeviceId() {
  return `SIM-DEV-${Math.random().toString(36).slice(2, 10)}`;
}

const cardCls = "bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm";
const inputCls =
  "text-sm rounded-lg border border-gray-200 dark:border-navy-500 bg-white dark:bg-navy-800 text-gray-900 dark:text-white px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/40";

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <LockClosedIcon className="h-8 w-8 text-gray-300 dark:text-navy-500" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        You don&apos;t have permission to use the transaction simulator.
      </p>
      <p className="text-xs text-gray-400 dark:text-navy-400">Requires the Simulate Transaction permission.</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 dark:text-navy-400">{hint}</p>}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
        active
          ? "border-primary bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-200"
          : "border-gray-200 dark:border-navy-500 bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
        active
          ? "border-primary bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-200"
          : "border-gray-200 dark:border-navy-500 bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-navy-400"
      }`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-primary" : "bg-gray-300 dark:bg-navy-500"}`} />
      {children}
    </button>
  );
}

function BarRow({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-gray-600 dark:text-gray-300">{label}</span>
        <span className="font-mono text-gray-400 dark:text-navy-300">{value} / 100</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-navy-800 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: tint ?? "#E06030" }} />
      </div>
    </div>
  );
}

function NextStepChip({ tone, children }: { tone: "orange" | "amber" | "blue" | "green"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

// Combined-score gradient stops mirror the 5 decision bands exactly
// (ALLOW 0-89 / FLAG 90-119 / STEP_UP 120-149 / HOLD 150-199 / BLOCK 200-300).
const SCALE_GRADIENT = `linear-gradient(to right,
  ${riskBandColors.ALLOW} 0 29.7%,
  ${riskBandColors.FLAG} 29.7% 39.7%,
  ${riskBandColors.STEP_UP} 39.7% 49.7%,
  ${riskBandColors.HOLD} 49.7% 66.3%,
  ${riskBandColors.BLOCK} 66.3% 100%)`;

interface TransactionSimulatorProps {
  /** Whether the caller is allowed to use the tool. Ignored (always allowed)
   *  when `publicMode` is set — the public route has no login concept at all. */
  canUse: boolean;
  /**
   * True for the standalone, unauthenticated `/simulator` page: hides the
   * "real customer" lookup (no real customer data on a public surface),
   * forces synthetic-profile mode, and posts through `/api/public-simulator`
   * — a dedicated server route that holds its own service credential and
   * never puts any session/token into the visitor's browser — instead of the
   * cookie-authenticated `/api/proxy` used by the logged-in dashboard page.
   */
  publicMode?: boolean;
}

export default function TransactionSimulator({ canUse, publicMode = false }: TransactionSimulatorProps) {
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
    } catch (err) {
      const status = (err as { status?: number | string } | undefined)?.status;
      if (typeof status === "number" && status >= 400 && status < 500) {
        // Real validation failure (bad customer_id, amount <= 0, malformed input)
        // — surface it, don't paper over it with a misleading local estimate.
        setRunError(errorMessage(err, "Simulation failed"));
        setResult(null);
        return;
      }
      // Endpoint unreachable for some other reason (network hiccup, backend down,
      // 5xx) — fall back to a local estimate so the tool stays usable.
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
    }
  }

  /** Public-mode call: hits the dedicated, credential-holding server route
   * directly (no cookies, no Redux auth) instead of the RTK Query mutation. */
  async function runPublic(request: SimulationRequest) {
    setPublicRunning(true);
    try {
      const res = await fetch("/api/public-simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw { status: res.status, data };
      return data;
    } finally {
      setPublicRunning(false);
    }
  }

  const scalePct = result ? Math.max(0, Math.min(100, (result.combined_risk_score / 300) * 100)) : 0;
  // Backend bug (app/services/simulation/service.py _score(), reads dict key "score"
  // instead of "total_score"): every live breakdown currently comes back all-zero
  // even when combined_risk_score is correct. Detect it and say so instead of
  // rendering four misleadingly-empty bars.
  const breakdownUnavailable =
    !!result &&
    result.source === "live" &&
    result.combined_risk_score > 0 &&
    result.breakdown.customer_risk === 0 &&
    result.breakdown.transaction_risk === 0 &&
    result.breakdown.behavioral_risk === 0 &&
    result.breakdown.ml_risk === 0;

  if (!publicMode && !canUse) return <PermissionDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BeakerIcon className="h-6 w-6 text-primary" />
            Transaction Simulator
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Build a hypothetical transaction and run it through the real pipeline as a dry-run —
            nothing here is saved, no case is opened, and no message goes out.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200">
          ● {publicMode ? "Demo — no real data" : "Internal tool — no live side effects"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-5 items-start">
        {/* FORM */}
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-600">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New simulation</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {publicMode ? "Make up a customer profile, then shape the transaction" : "Borrow a real customer's history, or make one up"}
            </p>
          </div>
          <div className="p-5 space-y-5">
            {!publicMode && (
              <div className="flex gap-2">
                <Pill active={mode === "real"} onClick={() => { setMode("real"); setResult(null); }}>Real customer</Pill>
                <Pill active={mode === "synthetic"} onClick={() => { setMode("synthetic"); setResult(null); }}>Synthetic profile</Pill>
              </div>
            )}

            {effectiveMode === "real" ? (
              <>
                <Field label="Customer ID">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customerIdInput}
                      onChange={(e) => setCustomerIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                      placeholder="e.g. CUST-10234"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={handleLookup}
                      disabled={profileState.isFetching || !customerIdInput.trim()}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-navy-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-navy-600 disabled:opacity-50"
                    >
                      <MagnifyingGlassIcon className="h-4 w-4" />
                      Look up
                    </button>
                  </div>
                  {customerNotFound && (
                    <p className="text-[11px] text-red-600 dark:text-red-300 mt-1">
                      No customer found with that ID.
                    </p>
                  )}
                </Field>

                {profile && loadedCustomerId && (
                  <div className="rounded-lg border border-gray-100 dark:border-navy-600 bg-gray-50 dark:bg-navy-800 p-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    <span className="font-semibold text-gray-900 dark:text-white">{profile.customer_id}</span>
                    <ActionBadge action={profile.risk_level} />
                    <span className="text-gray-500 dark:text-gray-400">score {profile.risk_score.toFixed(0)}/100</span>
                    {profile.is_pep && <span className="text-amber-600 dark:text-amber-300 font-medium">PEP</span>}
                    {profile.has_open_alerts && <span className="text-red-600 dark:text-red-300 font-medium">Open alerts</span>}
                    <span className="text-gray-500 dark:text-gray-400">KYC {profile.kyc_quality_score.toFixed(0)}/100</span>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Risk level">
                  <select value={synthRiskLevel} onChange={(e) => setSynthRiskLevel(e.target.value as (typeof RISK_LEVELS)[number])} className={inputCls}>
                    {RISK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Country">
                  <select value={synthCountry} onChange={(e) => setSynthCountry(e.target.value)} className={inputCls}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="KYC completeness">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={synthKyc}
                    onChange={(e) => setSynthKyc(clampInt(e.target.value))}
                    className={`${inputCls} font-mono`}
                  />
                </Field>
                <Field label="PEP status">
                  <div className="pt-1">
                    <ToggleChip active={synthIsPep} onClick={() => setSynthIsPep((v) => !v)}>Politically exposed</ToggleChip>
                  </div>
                </Field>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 block">
                Scenario presets
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyScenario(key)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      activeScenario === key
                        ? "border-primary bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-200"
                        : "border-gray-200 dark:border-navy-500 bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {SCENARIOS[key].emoji} {SCENARIOS[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (GHS)">
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={amount}
                  onChange={(e) => { setActiveScenario(null); setAmount(Number(e.target.value) || 0); }}
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label="Type">
                <select
                  value={transactionType}
                  onChange={(e) => { setActiveScenario(null); setTransactionType(e.target.value); }}
                  className={inputCls}
                >
                  {TRANSACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Channel">
                <select
                  value={channel}
                  onChange={(e) => { setActiveScenario(null); setChannel(e.target.value); }}
                  className={inputCls}
                >
                  {CHANNELS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Receiver country">
                <select
                  value={country}
                  onChange={(e) => { setActiveScenario(null); setCountry(e.target.value); }}
                  className={inputCls}
                >
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </Field>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                Device signals
              </label>
              <p className="text-[11px] text-gray-400 dark:text-navy-400 mb-2">
                Optional — USSD channels send neither; rules degrade gracefully.
              </p>
              <div className="flex flex-wrap gap-2">
                <ToggleChip active={newDevice} onClick={() => { setActiveScenario(null); setNewDevice((v) => !v); }}>
                  New / unrecognized device
                </ToggleChip>
                <ToggleChip active={rooted} onClick={() => { setActiveScenario(null); setRooted((v) => !v); }}>
                  Rooted / jailbroken
                </ToggleChip>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-navy-600">
              <button
                type="button"
                onClick={handleRun}
                disabled={!canSubmit || isRunning}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {isRunning && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                Run simulation
              </button>
            </div>
            {!canSubmit && (
              <p className="text-[11px] text-gray-400 dark:text-navy-400 -mt-3">
                Look up a customer above to enable the simulation.
              </p>
            )}
          </div>
        </div>

        {/* RESULT */}
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-600">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Result</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
              {result ? `Ran as ${result.simulated_transaction_id} — nothing persisted` : "Run a simulation to see the verdict"}
            </p>
          </div>

          {runError ? (
            <div className="p-5">
              <div className="text-xs px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                {runError}
              </div>
            </div>
          ) : !result ? (
            <div className="p-10 text-center text-sm text-gray-400 dark:text-navy-400">
              No simulation run yet.
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {result.source === "local_estimate" && (
                <div className="text-[11px] px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Live simulation endpoint didn&apos;t respond — showing a local estimate seeded from
                  this customer&apos;s profile.
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <RiskBadge score={result.combined_risk_score} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Disposition: <b className="text-gray-900 dark:text-white">{DISPOSITION_LABEL[result.disposition] ?? result.disposition}</b>
                  </span>
                </div>
                <div className="relative h-2 rounded-full mt-3" style={{ background: SCALE_GRADIENT }}>
                  <div
                    className="absolute -top-1 w-[3px] h-4 rounded bg-gray-900 dark:bg-white shadow"
                    style={{ left: `calc(${scalePct}% - 1.5px)` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-navy-400 mt-1">
                  <span>0 ALLOW</span><span>90 FLAG</span><span>120 STEP-UP</span><span>150 HOLD</span><span>200 BLOCK</span><span>300</span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-2">
                  Score breakdown
                </p>
                {breakdownUnavailable ? (
                  <p className="text-xs text-gray-400 dark:text-navy-400 italic">
                    Breakdown unavailable for this response — the combined score above is still accurate.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <BarRow label="Customer risk" value={result.breakdown.customer_risk} />
                    <BarRow label="Transaction risk" value={result.breakdown.transaction_risk} />
                    <BarRow
                      label="Behavioral risk (rules)"
                      value={result.breakdown.behavioral_risk}
                      // Derived from the score, not `result.risk_band` — the live endpoint's
                      // risk_band field is currently unreliable (see note to backend team).
                      tint={riskBandColors[riskBand(result.combined_risk_score)]}
                    />
                    <BarRow label="ML signal" value={result.breakdown.ml_risk} tint="#9ca3af" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-2">
                  Triggered rules
                </p>
                {result.triggered_rules.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-navy-400">
                    No rules triggered — transaction pattern looks ordinary for this customer.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.triggered_rules.map((r, i) => {
                      const severity = RULE_CATALOG[r.rule_id]?.severity;
                      return (
                        <div
                          key={`${r.rule_id}-${i}`}
                          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-gray-100 dark:border-navy-600"
                        >
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 shrink-0">
                            {r.rule_id}
                          </span>
                          <span className="flex-1 text-gray-700 dark:text-gray-200">{r.name}</span>
                          {severity && <ActionBadge action={severity} />}
                          <span className="font-mono text-gray-400 dark:text-navy-400">+{r.contribution}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-2">
                  What happens next
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {result.would_trigger.case_opened && <NextStepChip tone="orange">Case opened</NextStepChip>}
                  {result.would_trigger.step_up_required && <NextStepChip tone="amber">Step-up required</NextStepChip>}
                  {result.would_trigger.kyc_requested && <NextStepChip tone="blue">KYC requested</NextStepChip>}
                  {!result.would_trigger.case_opened && !result.would_trigger.step_up_required && !result.would_trigger.kyc_requested && (
                    <NextStepChip tone="green">No follow-up action</NextStepChip>
                  )}
                </div>
                {result.would_trigger.kyc_reason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    KYC reason: {result.would_trigger.kyc_reason}
                  </p>
                )}
                {result.would_trigger.notifications.length > 0 && (
                  <ul className="space-y-1">
                    {result.would_trigger.notifications.map((line, i) => (
                      <li key={i} className="text-xs text-gray-700 dark:text-gray-200 flex gap-1.5">
                        <span className="text-gray-400 dark:text-navy-400">›</span>{line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs italic text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-navy-500 pl-3">
                {result.explanation}
              </p>

              <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                ✓ Simulated — no case opened, no notification sent, no data saved.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function clampInt(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
