import { riskBand } from "@/config/constants";
import { RULE_CATALOG } from "@/config/ruleCatalog";
import type { CustomerBaseline } from "@/types/api";
import type {
  SimulationBreakdown,
  SimulationRequest,
  SimulationRuleHit,
  SimulationViewResult,
} from "@/types/simulator";

const AMOUNT_HIGH_VALUE = 10_000; // mirrors R-A01 "amount > 10,000"
const AMOUNT_PEP = 5_000; // mirrors R-A04 "is_pep and amount > 5,000"

/** Enough of a customer's risk profile to seed the estimate — satisfied by
 * both a real fetched CustomerRiskProfile and a synthetic_customer's inputs. */
export interface EstimateProfileInput {
  risk_score: number;
  is_pep: boolean;
  kyc_quality_score: number;
  has_open_alerts: boolean;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function ruleHit(ruleId: string): SimulationRuleHit {
  const entry = RULE_CATALOG[ruleId];
  return {
    rule_id: ruleId,
    name: entry?.name ?? ruleId,
    contribution: entry?.riskContribution ?? 0,
  };
}

const DISPOSITION_BY_BAND: Record<string, SimulationViewResult["disposition"]> = {
  ALLOW: "approved",
  FLAG: "held_for_review",
  STEP_UP: "held_for_review",
  HOLD: "held_for_review",
  BLOCK: "blocked",
};

/**
 * Client-side stand-in for POST /simulations/transactions, used only when
 * that call fails for a non-validation reason (network hiccup, backend
 * down). Deliberately reuses real rule codes/contributions from
 * `ruleCatalog.ts` and the customer's real (or synthetic) profile — only the
 * "did this fire" boolean logic and the ML-signal number are approximated.
 *
 * Combined score = customer_risk + transaction_risk + behavioral_risk, where
 * behavioral_risk = max(rule_risk, ml_risk) — same shape as the backend
 * RiskAggregator, so bands land the same way once the live call succeeds.
 */
export function estimateSimulation(
  request: SimulationRequest,
  profile: EstimateProfileInput | null,
  baseline: CustomerBaseline | null,
): SimulationViewResult {
  const { amount, channel, receiver_country, device_id, is_rooted } = request;
  const crossBorder = !!receiver_country && receiver_country !== "GH";
  const triggered: SimulationRuleHit[] = [];

  // --- customer risk: the customer's own real (or synthetic) profile ---
  const customerRisk = clamp(profile?.risk_score ?? 20, 0, 100);

  // --- transaction risk: amount + channel + cross-border shape ---
  let transactionRisk = 4;
  if (amount > AMOUNT_HIGH_VALUE) {
    transactionRisk += 40;
    triggered.push(ruleHit("R-A01"));
  } else if (amount >= AMOUNT_HIGH_VALUE * 0.3) {
    transactionRisk += 16;
  }
  if (profile?.is_pep && amount > AMOUNT_PEP) {
    transactionRisk += 30;
    triggered.push(ruleHit("R-A04"));
  }
  if (crossBorder) transactionRisk += amount >= 1_000 ? 22 : 10;
  if (channel === "Agent") transactionRisk += 6;
  transactionRisk = clamp(transactionRisk, 0, 100);

  // --- behavioral risk: device signals + baseline deviation ---
  let ruleRisk = 0;
  if (device_id) { ruleRisk += ruleHit("R-DF04").contribution; triggered.push(ruleHit("R-DF04")); }
  if (is_rooted) { ruleRisk += ruleHit("R-DF01").contribution; triggered.push(ruleHit("R-DF01")); }
  if (baseline && baseline.avg_amount > 0 && amount > baseline.avg_amount * 3) {
    ruleRisk += ruleHit("R-B01").contribution;
    triggered.push(ruleHit("R-B01"));
  }
  ruleRisk = clamp(ruleRisk, 0, 100);

  const mlRisk = clamp(Math.round(ruleRisk * 0.55 + (crossBorder ? 8 : 0)), 0, 100);
  const behavioralRisk = clamp(Math.max(ruleRisk, mlRisk), 0, 100);

  const combined = clamp(customerRisk + transactionRisk + behavioralRisk, 0, 300);
  const band = riskBand(combined);

  const breakdown: SimulationBreakdown = {
    customer_risk: customerRisk,
    transaction_risk: transactionRisk,
    behavioral_risk: behavioralRisk,
    ml_risk: mlRisk,
  };

  const lowKyc = (profile?.kyc_quality_score ?? 100) < 50;
  const caseOpened = band === "HOLD" || band === "BLOCK" || (band === "FLAG" && !!profile?.has_open_alerts);
  const stepUpRequired = band === "STEP_UP";
  const kycRequested = stepUpRequired || (band === "HOLD" && (lowKyc || customerRisk >= 40));
  const kycReason = kycRequested
    ? lowKyc
      ? "Customer's KYC completeness score is below threshold"
      : "Combined risk score crossed the identity re-verification threshold"
    : null;

  const simId = randomId("SIM-EST");
  const notifications: string[] = [];
  if (kycRequested) notifications.push("customer: identity/KYC verification would be requested");
  if (caseOpened) notifications.push(`analyst: ${band === "BLOCK" ? "critical" : "high-priority"} alert would open on ${simId}`);

  const explanation =
    `Combined risk score: ${combined}/300 (${band}). ` +
    `Customer risk ${customerRisk}/100; transaction risk ${transactionRisk}/100` +
    `${crossBorder ? ` (cross-border, ${receiver_country})` : ""}; ` +
    `behavioral risk ${behavioralRisk}/100 (${triggered.length} rule${triggered.length === 1 ? "" : "s"} triggered, ML ${mlRisk}/100).`;

  return {
    combined_risk_score: combined,
    risk_band: band,
    breakdown,
    triggered_rules: triggered,
    disposition: DISPOSITION_BY_BAND[band] ?? "approved",
    would_trigger: {
      case_opened: caseOpened,
      kyc_requested: kycRequested,
      kyc_reason: kycReason,
      step_up_required: stepUpRequired,
      notifications,
    },
    explanation,
    simulated_transaction_id: simId,
    source: "local_estimate",
  };
}
