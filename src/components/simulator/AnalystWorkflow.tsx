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

/**
 * The guided L1-analyst walkthrough that follows a simulated payment (single) or
 * scenario (sequence) which raised an alert. It replays the workflow as replica
 * screens — the replica itself persists nothing:
 *
 *   Alert (review)  →  Escalate  →  Case  →  File STR  →  Filed (+ goAML)
 *                   ↘  Close (false positive)  →  Closed
 *
 * Both entry points feed the same normalized `AlertInput`, so single payments
 * and multi-leg sequences drive an identical journey with numbers that match
 * whatever the simulator showed.
 *
 * `allowFiling` is what separates the two audiences. On the public simulator the
 * visitor is standing in for the BANK'S CUSTOMER / channel: their activity is
 * what gets monitored, and the journey has to stop at escalation, because
 * investigating and filing an STR is the compliance team's job, done for real in
 * the Validar console. Showing a customer-side visitor a replica STR both
 * misrepresents who does what and undersells the real filing flow, which has
 * maker-checker approval and a server-generated goAML the replica can't show.
 * So: `allowFiling={false}` ends at `escalated`; the case/STR/filed screens stay
 * in the component for the authenticated console, where they belong.
 */

export interface AlertInput {
  /** Combined risk score (0–300) — drives priority + band. */
  score: number;
  /** Names of the rules that fired (drives "why it fired" + the STR typology). */
  rules: string[];
  /** The three risk layers, when known (single payment). Omitted for sequences. */
  breakdown?: { customer: number; transaction: number; behavioral: number };
  /** Sender / subject label shown on every screen and in the goAML. */
  subject: string;
  /** A representative transaction id for the goAML. */
  txnNumber: string;
  /** A single amount (GHS) for the goAML; sequences pass an estimated total. */
  primaryAmount?: number;
  /** One-liner describing the payment/pattern, e.g. "Transfer · Momo · GH". */
  summaryLine: string;
  /** Rows rendered on the alert/case "transaction" card. */
  detailRows: { k: string; v: string; mono?: boolean }[];
  /** Case type badge — AML / FRAUD / SANCTIONS. */
  caseType?: string;
  /** How many alerts the case was auto-created from (sequences). */
  fromAlerts?: number;
  /**
   * Real ids the run actually wrote into the demo institution, when the
   * simulator persisted rather than dry-ran. These are what make the handover
   * concrete: the visitor sees the id here, the compliance team opens the same
   * id in the console. Empty when the run was a dry-run.
   */
  persistedAlertIds?: string[];
  persistedCaseIds?: string[];
}

type Step = "alert" | "case" | "str" | "filed" | "closed" | "escalated";

const CURRENCY = "GHS";

function priorityOf(score: number): { label: string; color: string; ring: string } {
  if (score >= 200) return { label: "IMMEDIATE", color: riskBandColors.BLOCK, ring: "rgba(220,60,60,0.16)" };
  if (score >= 150) return { label: "BATCH", color: riskBandColors.HOLD, ring: "rgba(230,160,60,0.16)" };
  return { label: "REVIEW", color: riskBandColors.FLAG, ring: "rgba(230,160,60,0.16)" };
}

/** Pick a goAML suspicious-activity typology from the rules that fired. */
function typologyOf(rules: string[]): { type: string; code: string } {
  const names = rules.join(" ").toLowerCase();
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

function buildGoaml(a: {
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
  <report_reference>${a.reference}</report_reference>
  <regulator_code>FIC</regulator_code>
  <regulator_name>Financial Intelligence Centre (Ghana)</regulator_name>
  <report>
    <str>
      <transaction>
        <transactionnumber>${a.txnNumber}</transactionnumber>
        <transaction_location>GHA</transaction_location>
        <teller>${a.amount.toFixed(2)}</teller>
        <amount_local>${a.amount.toFixed(2)}</amount_local>
        <funds_code>T</funds_code>
        <suspicious_activity_type>${a.typology.type}</suspicious_activity_type>
        <suspicious_activity_code>${a.typology.code}</suspicious_activity_code>
        <involved_party>
          <role>O</role>
          <person>
            <first_name>${a.sender}</first_name>
          </person>
        </involved_party>
      </transaction>
      <reason>${a.narrative.replace(/[<>&]/g, "")}</reason>
    </str>
  </report>
</Report>`;
}

/* ── small building blocks ─────────────────────────────────────────────────── */

function Crumbs({ step, allowFiling }: { step: Step; allowFiling: boolean }) {
  // Without filing rights the journey is two steps, and the second one is the
  // handover — never an STR the viewer isn't entitled to file.
  const order = allowFiling
    ? [{ label: "Alert" }, { label: "Case" }, { label: step === "closed" ? "Closed" : "STR" }]
    : [{ label: "Alert" }, { label: step === "closed" ? "Closed" : "Compliance" }];
  const idx = allowFiling
    ? { alert: 0, case: 1, str: 2, filed: 2, closed: 2, escalated: 2 }[step]
    : { alert: 0, case: 1, str: 1, filed: 1, closed: 1, escalated: 1 }[step];
  return (
    <div className="flex items-center gap-2 text-[12px]">
      {order.map((o, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className={i <= idx ? "font-semibold text-[#F2F3FA]" : "text-[#5B6091]"}>{o.label}</span>
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
    <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors ${cls}`}>
      {children}
    </button>
  );
}

/* ── main ──────────────────────────────────────────────────────────────────── */

export default function AnalystWorkflow({
  alert,
  onExit,
  allowFiling = true,
}: {
  alert: AlertInput;
  onExit: () => void;
  /** See the module comment: false on the customer-facing public simulator, which
   *  stops at escalation. Defaults to true so the authenticated console keeps the
   *  full journey. */
  allowFiling?: boolean;
}) {
  const [step, setStep] = useState<Step>("alert");

  const ctx = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7).replace("-", "");
    return {
      alertId: `ALT-${rand(10)}`,
      caseId: `CASE-${rand(8)}`,
      strRef: `GHA-STR-${ym}-${rand(6)}`,
      priority: priorityOf(alert.score),
      typology: typologyOf(alert.rules),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.txnNumber]);

  const band = bandOf(alert.score, null);
  const amount = alert.primaryAmount ?? 0;
  const caseType = alert.caseType ?? "AML";
  const hasPersisted = !!(alert.persistedAlertIds?.length || alert.persistedCaseIds?.length);

  const [narrative, setNarrative] = useState(
    `${alert.subject} — ${alert.summaryLine}. ` +
      (amount ? `Amount ${CURRENCY} ${fmtAmount(amount)}. ` : "") +
      `Matched ${alert.rules.length} monitoring rule(s) and scored ${alert.score}/300 (${BAND_LABEL[band]}). ` +
      `Consistent with ${ctx.typology.type.toLowerCase().replace(/_/g, " ")}; escalated for STR filing.`,
  );

  const goaml = useMemo(
    () =>
      buildGoaml({
        reference: ctx.strRef,
        txnNumber: alert.txnNumber,
        amount,
        sender: alert.subject,
        typology: ctx.typology,
        narrative,
      }),
    [ctx, alert, amount, narrative],
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

  const DetailCard = (
    <div className={`${wellCls} p-4`}>
      {alert.detailRows.map((r, i) => (
        <Row key={i} k={r.k} v={r.v} mono={r.mono} />
      ))}
    </div>
  );

  const RiskCard = (
    <div className={`${wellCls} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-[22px] font-semibold ${monoCls}`} style={{ color: riskBandColors[band] }}>
          {alert.score}
        </span>
        <span className="text-[12px] text-[#767CAB]">/ 300 · {BAND_LABEL[band]}</span>
      </div>
      {alert.breakdown ? (
        <>
          <Row k="Customer risk" v={alert.breakdown.customer} mono />
          <Row k="Transaction risk" v={alert.breakdown.transaction} mono />
          <Row k="Behaviour risk" v={alert.breakdown.behavioral} mono />
        </>
      ) : (
        <p className="text-[12px] leading-relaxed text-[#767CAB]">
          Highest-scoring leg in the sequence. Per-leg layer breakdown isn&apos;t shown for a pattern.
        </p>
      )}
    </div>
  );

  return (
    <div className={`${panelCls} p-6 sm:p-7`}>
      <div className="mb-5 flex items-center justify-between">
        <Crumbs step={step} allowFiling={allowFiling} />
        <button type="button" onClick={onExit} className="text-[12px] text-[#767CAB] hover:text-[#C9CCE8]">
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
              style={{ background: ctx.priority.ring, color: ctx.priority.color }}
            >
              {ctx.priority.label}
            </span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#9FA3C4]">OPEN</span>
            <span className="ml-auto text-[12px] text-[#5B6091]">L1 analyst queue</span>
          </header>

          <p className="text-[13px] leading-relaxed text-[#9FA3C4]">
            {allowFiling
              ? "This activity tripped monitoring and is waiting in your queue. Review it, then decide: escalate it to a case for investigation, or close it as a false positive."
              : "This activity tripped monitoring. Review what the engine saw, then hand it to the compliance team as a case, or close it as a false positive. Investigating and reporting it is their call, not yours."}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Activity</p>
              {DetailCard}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Risk</p>
              {RiskCard}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">
              Why it fired ({alert.rules.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {alert.rules.length === 0 ? (
                <span className="text-[12px] text-[#767CAB]">No rules — review manually.</span>
              ) : (
                alert.rules.map((r, i) => (
                  <span key={i} className={`${wellCls} px-2.5 py-1 text-[12px] text-[#C9CCE8]`}>
                    {r}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn onClick={() => setStep(allowFiling ? "case" : "escalated")}>
              {allowFiling ? "Escalate to case →" : "Send to compliance →"}
            </Btn>
            <Btn variant="danger" onClick={() => setStep("closed")}>Close — false positive</Btn>
          </div>
        </div>
      )}

      {/* ── CASE ──────────────────────────────────────────────────────────── */}
      {allowFiling && step === "case" && (
        <div className="space-y-5">
          <header className="flex flex-wrap items-center gap-3">
            <span className={`text-[15px] font-semibold ${monoCls} text-[#F2F3FA]`}>{ctx.caseId}</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#9FA3C4]">{caseType}</span>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-[#F5C0A5]" style={{ background: "rgba(224,96,48,0.14)" }}>HIGH</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#9FA3C4]">OPEN</span>
          </header>

          <Notice tone="ok">
            {alert.fromAlerts && alert.fromAlerts > 1
              ? `Auto-escalated from ${alert.fromAlerts} alerts on this pattern — a case was opened for investigation.`
              : `Escalated from ${ctx.alertId} — a case was opened and assigned for investigation.`}
          </Notice>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Linked activity</p>
              {DetailCard}
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
            <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={4} className={`${inputCls} leading-relaxed`} />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn onClick={() => setStep("str")}>File STR →</Btn>
            <Btn variant="ghost" onClick={() => setStep("alert")}>← Back to alert</Btn>
          </div>
        </div>
      )}

      {/* ── FILE STR ──────────────────────────────────────────────────────── */}
      {allowFiling && step === "str" && (
        <div className="space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Suspicious Transaction Report</p>
          <div className={`${wellCls} p-4`}>
            <Row k="Subject" v={alert.subject} />
            <Row k="Suspicious activity" v={ctx.typology.type.replace(/_/g, " ")} />
            {amount ? <Row k="Amount" v={`${CURRENCY} ${fmtAmount(amount)}`} mono /> : <Row k="Pattern" v={alert.summaryLine} />}
            <Row k="Regulator" v="Financial Intelligence Centre (Ghana)" />
            <Row k="From case" v={ctx.caseId} mono />
          </div>
          <div className={`${wellCls} p-4`}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">Narrative</p>
            <p className="text-[13px] leading-relaxed text-[#C9CCE8]">{narrative}</p>
          </div>
          <p className="text-[12px] text-[#767CAB]">Filing generates a goAML v4 XML, validates it against the FIC schema, and submits.</p>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn onClick={() => setStep("filed")}>Submit STR to FIC →</Btn>
            <Btn variant="ghost" onClick={() => setStep("case")}>← Back to case</Btn>
          </div>
        </div>
      )}

      {/* ── FILED ─────────────────────────────────────────────────────────── */}
      {allowFiling && step === "filed" && (
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
            <Btn onClick={onExit}>Done — run another</Btn>
          </div>
        </div>
      )}

      {/* ── ESCALATED (customer-side terminal state) ──────────────────────── */}
      {step === "escalated" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(52,211,153,0.16)] text-[18px] text-[#34D399]">✓</span>
            <div>
              <p className="text-[15px] font-semibold text-[#F2F3FA]">Sent to compliance</p>
              <p className="text-[12px] text-[#767CAB]">
                {alert.fromAlerts && alert.fromAlerts > 1
                  ? `${alert.fromAlerts} alerts on this pattern were handed over as one case.`
                  : `${ctx.alertId} was handed over for investigation.`}
              </p>
            </div>
          </div>

          {hasPersisted ? (
            <>
              <Notice tone="ok">
                This is live in the demo bank&apos;s Validar console right now, not a mock-up. The
                compliance team picks it up from there.
              </Notice>
              <div className={`${wellCls} p-4`}>
                {alert.persistedAlertIds?.length ? (
                  <Row
                    k={alert.persistedAlertIds.length > 1 ? "Alerts raised" : "Alert raised"}
                    v={alert.persistedAlertIds.join(", ")}
                    mono
                  />
                ) : null}
                {alert.persistedCaseIds?.length ? (
                  <Row
                    k={alert.persistedCaseIds.length > 1 ? "Cases opened" : "Case opened"}
                    v={alert.persistedCaseIds.join(", ")}
                    mono
                  />
                ) : null}
              </div>
            </>
          ) : (
            <Notice tone="ok">
              Nothing was written — this run was scored and rolled back.
            </Notice>
          )}

          <div className={`${wellCls} p-4`}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5B6091]">
              What happens next
            </p>
            <p className="text-[13px] leading-relaxed text-[#9FA3C4]">
              An analyst investigates the case, and if the suspicion holds, a compliance officer
              files a Suspicious Transaction Report with the Financial Intelligence Centre. That
              step needs a second approver and produces a goAML v4 submission. It happens in the
              Validar console, not here.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn variant="ghost" onClick={() => setStep("alert")}>← Back to the alert</Btn>
            <Btn onClick={onExit}>Done — run another</Btn>
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
          <Notice tone="ok">
            {hasPersisted
              ? "Closing here is part of the walkthrough. The alert itself is real and stays open in the demo bank's console until an analyst resolves it there."
              : "Nothing was persisted — this is a dry-run."}
          </Notice>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Btn variant="ghost" onClick={() => setStep("alert")}>← Reopen alert</Btn>
            <Btn onClick={onExit}>Done — run another</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
