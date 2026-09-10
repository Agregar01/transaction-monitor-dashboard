"use client";

import { useMemo, useState } from "react";
import { riskBandColors } from "@/config/constants";
import {
  BAND_LABEL,
  bandOf,
  inputCls,
  monoCls,
  panelCls,
  wellCls,
  Notice,
} from "@/components/simulator/ui";
import type { SimulationResult } from "@/types/simulator";

/**
 * The guided L1-analyst walkthrough that follows a simulated transaction which
 * raised an alert. It replays the real workflow as replica screens — nothing is
 * persisted — so a viewer can click the whole journey:
 *
 *   Alert (review)  →  Escalate  →  Case  →  File STR  →  Filed (+ goAML)
 *                   ↘  Close (false positive)  →  Closed
 *
 * Everything is seeded from the simulation result + the transaction the caller
 * ran, so the numbers on every screen match what the simulator showed.
 */

export interface TxnSummary {
  amount: number;
  transaction_type: string;
  channel: string;
  receiver_country: string;
  sender: string;
}

type Step = "alert" | "case" | "str" | "filed" | "closed";

const CURRENCY = "GHS";

function priorityOf(score: number): { label: string; tone: keyof typeof PTONE } {
  if (score >= 200) return { label: "IMMEDIATE", tone: "block" };
  if (score >= 150) return { label: "BATCH", tone: "hold" };
  return { label: "REVIEW", tone: "flag" };
}
const PTONE = {
  block: riskBandColors.BLOCK,
  hold: riskBandColors.HOLD,
  flag: riskBandColors.FLAG,
} as const;

/** Pick a goAML suspicious-activity typology from the rules that fired. */
function typologyOf(result: SimulationResult): { type: string; code: string } {
  const names = result.triggered_rules.map((r) => r.name.toLowerCase()).join(" ");
  if (/structur|burst|near-ctr|flash/.test(names)) return { type: "STRUCTURING", code: "S" };
  if (/travel|cross|layer|aggregate|jurisdiction/.test(names)) return { type: "LAYERING", code: "L" };
  if (/device|velocity|fan-?out|counterparty/.test(names)) return { type: "SMURFING", code: "M" };
  return { type: "UNUSUAL_PATTERN", code: "U" };
}

function rand(n: number) {
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, n);
}

function fmtAmount(n: number) {
  return n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildGoaml(args: {
  reference: string;
  txnNumber: string;
  amount: number;
  sender: string;
  typology: { type: string; code: string };
  narrative: string;
}) {
  const now = new Date().toISOString().slice(0, 19);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Report xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="goAML.xsd">
  <rentity_id>REPORTING_INSTITUTION</rentity_id>
  <rentity_branch>GHA</rentity_branch>
  <submission_code>E</submission_code>
  <report_code>STR</report_code>
  <creation_datetime>${now}</creation_datetime>
  <currency_code_local>${CURRENCY}</currency_code_local>
  <reporting_person_title>Compliance Officer</reporting_person_title>
  <report_reference>${args.reference}</report_reference>
  <regulator_code>FIC</regulator_code>
  <regulator_name>Financial Intelligence Centre (Ghana)</regulator_name>
  <report>
    <str>
      <transaction>
        <transactionnumber>${args.txnNumber}</transactionnumber>
        <transaction_location>GHA</transaction_location>
        <teller>${args.amount.toFixed(2)}</teller>
        <amount_local>${args.amount.toFixed(2)}</amount_local>
        <funds_code>T</funds_code>
        <suspicious_activity_type>${args.typology.type}</suspicious_activity_type>
        <suspicious_activity_code>${args.typology.code}</suspicious_activity_code>
        <involved_party>
          <role>O</role>
          <person>
            <first_name>${args.sender}</first_name>
          </person>
        </involved_party>
      </transaction>
      <reason>${args.narrative.replace(/[<>&]/g, "")}</reason>
    </str>
  </report>
</Report>`;
}

/* ── small building blocks ─────────────────────────────────────────────────── */

function Crumbs({ step }: { step: Step }) {
  const order: { key: Step; label: string }[] = [
    { key: "alert", label: "Alert" },
    { key: "case", label: "Case" },
    { key: step === "closed" ? "closed" : "str", label: step === "closed" ? "Closed" : "STR" },
  ];
  const idx = { alert: 0, case: 1, str: 2, filed: 2, closed: 2 }[step];
  return (
    <div className="mb-5 flex items-center gap-2 text-[12px]">
      {order.map((o, i) => (
        <span key={o.key} className="flex items-center gap-2">
          <span
            className={i <= idx ? "font-semibold text-[#F2F3FA]" : "text-[#5B6091]"}
          >
            {o.label}
          </span>
          {i < order.length - 1 && <span className="text-[#3A3F6B]">→</span>}
        </span>
      ))}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[12px] text-[#767CAB]">{k}</span>
      <span className={`text-[13px] text-[#E7E9F6] ${mono ? monoCls : ""}`}>{v}</span>
    </div>
  );
}

function Btn({
  onClick,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
}) {
  const cls =
    variant === "primary"
      ? "bg-[#E06030] text-white hover:bg-[#c9542a]"
      : variant === "danger"
        ? "border border-white/15 text-[#C9CCE8] hover:bg-white/[0.04]"
        : "text-[#9FA3C4] hover:text-[#E7E9F6]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

/* ── main ──────────────────────────────────────────────────────────────────── */

export default function AnalystWorkflow({
  result,
  txn,
  onExit,
}: {
  result: SimulationResult;
  txn: TxnSummary;
  onExit: () => void;
}) {
  const [step, setStep] = useState<Step>("alert");

  const ctx = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7).replace("-", "");
    return {
      alertId: `ALT-${rand(10)}`,
      caseId: `CASE-${rand(8)}`,
      txnNumber: result.simulated_transaction_id.replace(/^SIM-/, "TXN-").slice(0, 20),
      strRef: `GHA-STR-${ym}-${rand(6)}`,
      priority: priorityOf(result.combined_risk_score),
      typology: typologyOf(result),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.simulated_transaction_id]);

  const band = bandOf(result.combined_risk_score, result.risk_band);
  const [narrative, setNarrative] = useState(
    `Customer sent ${CURRENCY} ${fmtAmount(txn.amount)} via ${txn.channel} to ${txn.receiver_country}. ` +
      `Pattern matched ${result.triggered_rules.length} monitoring rule(s) and scored ${result.combined_risk_score}/300 (${BAND_LABEL[band]}). ` +
      `Consistent with ${ctx.typology.type.toLowerCase().replace(/_/g, " ")}; escalated for STR filing.`,
  );

  const goaml = useMemo(
    () =>
      buildGoaml({
        reference: ctx.strRef,
        txnNumber: ctx.txnNumber,
        amount: txn.amount,
        sender: txn.sender,
        typology: ctx.typology,
        narrative,
      }),
    [ctx, txn, narrative],
  );

  function downloadGoaml() {
    const blob = new Blob([goaml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ctx.strRef}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const TxnCard = (
    <div className={`${wellCls} p-4`}>
      <Row k="Amount" v={`${CURRENCY} ${fmtAmount(txn.amount)}`} mono />
      <Row k="Type / channel" v={`${txn.transaction_type} · ${txn.channel}`} />
      <Row k="Destination" v={txn.receiver_country} />
      <Row k="Sender" v={txn.sender} />
      <Row k="Transaction" v={ctx.txnNumber} mono />
    </div>
  );

  const RiskCard = (
    <div className={`${wellCls} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-[22px] font-semibold ${monoCls}`} style={{ color: riskBandColors[band] }}>
          {result.combined_risk_score}
        </span>
        <span className="text-[12px] text-[#767CAB]">/ 300 · {BAND_LABEL[band]}</span>
      </div>
      <Row k="Customer risk" v={result.breakdown.customer_risk} mono />
      <Row k="Transaction risk" v={result.breakdown.transaction_risk} mono />
      <Row k="Behaviour risk" v={result.breakdown.behavioral_risk} mono />
    </div>
  );

  return (
    <div className={`${panelCls} p-6 sm:p-7`}>
      <div className="mb-5 flex items-center justify-between">
        <Crumbs step={step} />
        <button
          type="button"
          onClick={onExit}
          className="text-[12px] text-[#767CAB] hover:text-[#C9CCE8]"
        >
          ← Back to simulator
        </button>
      </div>

      {/* ── ALERT ─────────────────────────────────────────────────────────── */}
      {step === "alert" && (
        <div className="space-y-5">
          <header className="flex flex-wrap items-center gap-3">
            <span className={`text-[15px] font-semibold ${monoCls} text-[#F2F3FA]`}>{ctx.alertId}</span>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: `${ctx.priority.tone === "block" ? "rgba(220,60,60,0.16)" : "rgba(230,160,60,0.16)"}`, color: PTONE[ctx.priority.tone] }}
            >
              {ctx.priority.label}
            </span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#9FA3C4]">OPEN</span>
            <span className="ml-auto text-[12px] text-[#5B6091]">L1 analyst queue</span>
          </header>

          <p className="text-[13px] leading-relaxed text-[#9FA3C4]">
            This payment tripped monitoring and is waiting in your queue. Review it, then decide:
            escalate it to a case for investigation, or close it as a false positive.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Transaction</p>
              {TxnCard}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Risk</p>
              {RiskCard}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">
              Why it fired ({result.triggered_rules.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {result.triggered_rules.length === 0 ? (
                <span className="text-[12px] text-[#767CAB]">No rules — review manually.</span>
              ) : (
                result.triggered_rules.map((r, i) => (
                  <span key={i} className={`${wellCls} px-2.5 py-1 text-[12px] text-[#C9CCE8]`}>
                    {r.name}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn onClick={() => setStep("case")}>Escalate to case →</Btn>
            <Btn variant="danger" onClick={() => setStep("closed")}>Close — false positive</Btn>
          </div>
        </div>
      )}

      {/* ── CASE ──────────────────────────────────────────────────────────── */}
      {step === "case" && (
        <div className="space-y-5">
          <header className="flex flex-wrap items-center gap-3">
            <span className={`text-[15px] font-semibold ${monoCls} text-[#F2F3FA]`}>{ctx.caseId}</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#9FA3C4]">AML</span>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-[#F5C0A5]" style={{ background: "rgba(224,96,48,0.14)" }}>HIGH</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#9FA3C4]">OPEN</span>
          </header>

          <Notice tone="ok">Escalated from {ctx.alertId} — a case was opened and assigned for investigation.</Notice>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Linked transaction</p>
              {TxnCard}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Assessment</p>
              {RiskCard}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">
              STR narrative <span className="font-normal normal-case text-[#5B6091]">— editable</span>
            </p>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={4}
              className={`${inputCls} leading-relaxed`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn onClick={() => setStep("str")}>File STR →</Btn>
            <Btn variant="ghost" onClick={() => setStep("alert")}>← Back to alert</Btn>
          </div>
        </div>
      )}

      {/* ── FILE STR ──────────────────────────────────────────────────────── */}
      {step === "str" && (
        <div className="space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Suspicious Transaction Report</p>
          <div className={`${wellCls} p-4`}>
            <Row k="Subject" v={txn.sender} />
            <Row k="Suspicious activity" v={ctx.typology.type.replace(/_/g, " ")} />
            <Row k="Amount" v={`${CURRENCY} ${fmtAmount(txn.amount)}`} mono />
            <Row k="Regulator" v="Financial Intelligence Centre (Ghana)" />
            <Row k="From case" v={ctx.caseId} mono />
          </div>
          <div className={`${wellCls} p-4`}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Narrative</p>
            <p className="text-[13px] leading-relaxed text-[#C9CCE8]">{narrative}</p>
          </div>
          <p className="text-[12px] text-[#767CAB]">
            Filing generates a goAML v4 XML, validates it against the FIC schema, and submits.
          </p>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn onClick={() => setStep("filed")}>Submit STR to FIC →</Btn>
            <Btn variant="ghost" onClick={() => setStep("case")}>← Back to case</Btn>
          </div>
        </div>
      )}

      {/* ── FILED ─────────────────────────────────────────────────────────── */}
      {step === "filed" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(52,211,153,0.16)] text-[18px] text-[#34D399]">✓</span>
            <div>
              <p className="text-[15px] font-semibold text-[#F2F3FA]">STR filed</p>
              <p className={`text-[12px] ${monoCls} text-[#767CAB]`}>{ctx.strRef} · submitted to FIC (Ghana)</p>
            </div>
          </div>

          <div className={`${wellCls} p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">goAML XML</p>
              <button type="button" onClick={downloadGoaml} className="text-[12px] font-semibold text-[#E06030] hover:text-[#f0855a]">
                Download
              </button>
            </div>
            <pre className={`max-h-72 overflow-auto rounded-lg bg-[#050514] p-3 text-[11px] leading-relaxed text-[#9FD8C0] ${monoCls}`}>
{goaml}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn onClick={onExit}>Done — run another payment</Btn>
          </div>
        </div>
      )}

      {/* ── CLOSED ────────────────────────────────────────────────────────── */}
      {step === "closed" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-[16px] text-[#9FA3C4]">■</span>
            <div>
              <p className="text-[15px] font-semibold text-[#F2F3FA]">Alert closed</p>
              <p className="text-[12px] text-[#767CAB]">{ctx.alertId} — resolved as a false positive (LEGITIMATE). No case opened.</p>
            </div>
          </div>
          <Notice tone="ok">Nothing was persisted — this is a dry-run.</Notice>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn variant="ghost" onClick={() => setStep("alert")}>← Reopen alert</Btn>
            <Btn onClick={onExit}>Done — run another payment</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
