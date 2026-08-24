import type { RiskBand } from "@/config/constants";

/**
 * Mirrors backend `app/schemas/simulation.py`, endpoint
 * `POST /simulations/transactions` (permission: simulate_transaction).
 * Dry-run only — the backend runs the real pipeline on a neutered-commit
 * session that rolls back: nothing is persisted, no KYC/notification/case
 * side effect actually fires.
 */
export interface SyntheticCustomer {
  customer_type?: string; // Individual | Merchant | Company
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | string;
  country_code?: string;
  is_pep?: boolean;
  kyc_quality_score?: number;
}

export interface SimulationRequest {
  /** Supply exactly one of customer_id / synthetic_customer. */
  customer_id?: string;
  synthetic_customer?: SyntheticCustomer;

  amount: number;
  transaction_type: string; // Deposit | Transfer | Withdrawal (Title-case, verbatim)
  channel: string; // ATM | Bank | Card | Momo | Agent
  receiver_id?: string; // server auto-fills SIM-RCV-… when omitted
  receiver_country?: string; // ISO-2

  // Device-signals block — leave blank for the graceful-degradation path
  // (like USSD). `device` passes through extra TransactionIngestRequest
  // fields verbatim (e.g. iccid) for signals with no first-class field.
  device_id?: string;
  is_rooted?: boolean;
  browser_fingerprint?: string;
  device?: Record<string, unknown>;
}

export interface SimulationRuleHit {
  rule_id: string;
  name: string;
  contribution: number;
}

export interface SimulationBreakdown {
  customer_risk: number;
  transaction_risk: number;
  behavioral_risk: number;
  ml_risk: number;
}

export interface WouldTrigger {
  case_opened: boolean;
  kyc_requested: boolean;
  kyc_reason: string | null;
  step_up_required: boolean;
  /** Human-readable, e.g. "customer: identity/KYC verification would be requested". */
  notifications: string[];
}

export interface SimulationResult {
  combined_risk_score: number;
  risk_band: RiskBand;
  breakdown: SimulationBreakdown;
  triggered_rules: SimulationRuleHit[];
  disposition: "approved" | "held_for_review" | "blocked" | string;
  would_trigger: WouldTrigger;
  explanation: string;
  simulated_transaction_id: string;
}

/** Frontend-only: tags whether a result came from the live endpoint or the offline fallback. */
export type SimulationViewResult = SimulationResult & { source: "live" | "local_estimate" };
