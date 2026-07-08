/**
 * AML-specific color tokens and helpers used across the dashboard.
 *
 * The TMS risk score is 0-300 (Customer + Transaction + Behavioral, summed).
 * Bands (must mirror the backend decision-engine config — flag=90, step_up=120,
 * hold=150, block=200 — and the /analytics/summary risk_distribution buckets):
 *   ALLOW    0   - 89
 *   FLAG     90  - 119
 *   STEP_UP  120 - 149
 *   HOLD     150 - 199
 *   BLOCK    200 - 300
 */

export type RiskBand = "ALLOW" | "FLAG" | "STEP_UP" | "HOLD" | "BLOCK";

export const riskBandColors: Record<RiskBand, string> = {
  ALLOW: "#22c55e",
  FLAG: "#eab308",
  STEP_UP: "#f59e0b",
  HOLD: "#f97316",
  BLOCK: "#ef4444",
};

export function riskBand(score: number): RiskBand {
  if (score >= 200) return "BLOCK";
  if (score >= 150) return "HOLD";
  if (score >= 120) return "STEP_UP";
  if (score >= 90) return "FLAG";
  return "ALLOW";
}

export const alertPriorityColors: Record<string, string> = {
  IMMEDIATE: "#ef4444",
  BATCH: "#f59e0b",
  REVIEW: "#3b82f6",
};

export const alertStatusColors: Record<string, string> = {
  OPEN: "#3b82f6",
  INVESTIGATING: "#f59e0b",
  CLOSED: "#64748b",
};

export const caseStatusColors: Record<string, string> = {
  OPEN: "#3b82f6",
  INVESTIGATING: "#f59e0b",
  ESCALATED: "#fb923c",
  SAR_DRAFTED: "#a855f7",
  SAR_FILED: "#22c55e",
  CLOSED: "#64748b",
};

export const ruleStatusColors: Record<string, string> = {
  DRAFT: "#64748b",
  SHADOW: "#3b82f6",
  PRODUCTION: "#22c55e",
  ARCHIVED: "#94a3b8",
};

export const reportStatusColors: Record<string, string> = {
  DRAFT: "#64748b",
  FILED: "#22c55e",
  WITHDRAWN: "#94a3b8",
  EXEMPT: "#a855f7",
};

export const approvalStatusColors: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
  EXPIRED: "#94a3b8",
};

/**
 * Analyst-facing labels for the backend alert-resolution enum.
 * The wire values (FALSE_POSITIVE / LEGITIMATE / …) stay verbatim on the API;
 * these are display-only so non-technical reviewers read plain language:
 * a cleared alert is "Not Suspicious", a confirmed one is "Suspicious".
 */
export const resolutionLabels: Record<string, string> = {
  FALSE_POSITIVE: "Not Suspicious",
  LEGITIMATE: "Suspicious",
  SAR_FILED: "SAR Filed",
  RESTRICTED: "Restricted",
  IDENTITY_CONFIRMED: "Identity Confirmed (KYC)",
};

/**
 * Backend domain enums as actually STORED/EMITTED by the TMS.
 *
 * Source of truth is the SQLAlchemy enums in the backend (`app/models/transaction.py`,
 * `app/models/customer.py`) — note these are Title-case, NOT the UPPERCASE values in
 * the backend's unused `app/models/enums.py`. The `/transactions` and `/customers`
 * filter endpoints match on these exact strings, so dropdowns must send them verbatim
 * (uppercasing them silently returns zero rows).
 */
export const TRANSACTION_TYPES = ["Deposit", "Transfer", "Withdrawal"] as const;
export const CHANNELS = ["ATM", "Bank", "Card", "Momo", "Agent"] as const;
export const CUSTOMER_RISK_LEVELS = ["Low", "Medium", "High"] as const;

/** Subset of the 8 RBAC role names used by the role-gated sidebar. */
export const TMS_ROLES = [
  "SYSTEM_ADMIN",
  "COMPLIANCE_OFFICER",
  "SENIOR_ANALYST",
  "ANALYST",
  "AUDITOR",
  "ML_ENGINEER",
  "OPERATIONS",
  "READONLY",
] as const;
export type TMSRole = (typeof TMS_ROLES)[number];
