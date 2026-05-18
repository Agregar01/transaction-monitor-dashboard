/**
 * Shared TypeScript types for the Autheo Transaction Monitor backend.
 *
 * Hand-mirrored from `transaction-monitor/app/schemas/*.py`. Keep these in
 * sync as the backend evolves — the RTK Query slices consume them.
 */

// ─── Pagination & generic envelopes ─────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface MutationResponse {
  success: boolean;
  message?: string;
  detail?: string;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  user_id: string;
  email: string;
  full_name: string | null;
  active?: boolean;
  roles: string[];
}

export interface Role {
  role_id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

// ─── Tenant ─────────────────────────────────────────────────────────────────

export type JurisdictionCode = "GHA" | "NGA" | "KEN";

export interface TenantInfo {
  jurisdiction_code: JurisdictionCode;
  display_name: string;
  features: {
    ctr: boolean;
    str: boolean;
    sanctions: boolean;
    ml: boolean;
  };
  config_loaded: boolean;
  supported_jurisdictions: JurisdictionCode[];
}

export interface Jurisdiction {
  code: JurisdictionCode;
  name: string;
  ctr_threshold: number;
  str_deadline_hours: number;
  currency: string;
  regulator_name: string;
  goaml_version: string;
  active: boolean;
}

// ─── Transactions ───────────────────────────────────────────────────────────

export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "PAYMENT" | "REVERSAL" | string;
export type Channel = "USSD" | "MOBILE" | "WEB" | "AGENT" | "API" | string;
export type FlowType = "P2P" | "P2M" | "B2P" | "CASH_IN" | "CASH_OUT" | string;

export interface Transaction {
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  type: TransactionType;
  channel: Channel;
  flow_type: FlowType | null;
  receiver_id: string | null;
  receiver_country: string | null;
  device_id: string | null;
  customer_risk_score: number;
  transaction_risk_score: number;
  behavioral_risk_score: number;
  combined_risk_score: number;
  flagged: boolean;
  created_at: string;
}

export interface TransactionTimelineEvent {
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  actor: string | null;
  timestamp: string;
}

export interface RelatedTransaction {
  transaction: Transaction;
  relationship_type: string;
  similarity_score: number;
}

// ─── Customers ──────────────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "CRITICAL";

export interface Customer {
  customer_id: string;
  customer_type: "INDIVIDUAL" | "MERCHANT" | "COMPANY" | string;
  risk_level: RiskLevel;
  risk_score: number;
  country_code: string | null;
  is_pep: boolean;
  kyc_quality_score: number | null;
  occupation: string | null;
  created_at: string;
}

export interface CustomerBaseline {
  customer_id: string;
  period_days: number;
  avg_amount: number;
  median_amount: number;
  std_amount: number;
  daily_count: number;
  channels: string[];
  countries: string[];
  counterparty_count: number;
}

export interface CustomerRiskProfile {
  customer_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  is_pep: boolean;
  kyc_quality: number | null;
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export type AlertPriority = "IMMEDIATE" | "BATCH" | "REVIEW";
export type AlertStatus = "OPEN" | "INVESTIGATING" | "CLOSED";
export type AlertResolution = "False_positive" | "Legitimate" | "SAR_filed" | "Restricted";

export interface AlertNote {
  id: string;
  note: string;
  note_type: "investigation" | "follow_up" | "documentation" | "escalation";
  author: string;
  timestamp: string;
}

export interface Alert {
  alert_id: string;
  customer_id: string;
  transaction_id: string;
  alert_timestamp: string;
  priority: AlertPriority;
  status: AlertStatus;
  risk_score: number;
  triggered_rules: string[];
  resolution: AlertResolution | null;
  resolution_notes: string | null;
  assigned_to: string | null;
  notes: AlertNote[];
  created_at: string;
  updated_at: string;
}

// ─── Cases ──────────────────────────────────────────────────────────────────

export type CaseType = "AML" | "FRAUD" | "SANCTIONS";
export type CaseStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "ESCALATED"
  | "SAR_DRAFTED"
  | "SAR_FILED"
  | "CLOSED";
export type CasePriority = "HIGH" | "MEDIUM" | "LOW";

export interface Case {
  id: string;
  case_type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  title: string;
  narrative: string | null;
  assigned_to: string | null;
  jurisdiction_id: string;
  due_date: string | null;
  resolution: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CaseStatusHistoryEntry {
  id: string;
  case_id: string;
  from_status: CaseStatus | null;
  to_status: CaseStatus;
  changed_by: string;
  changed_at: string;
  notes: string | null;
}

// ─── Rules ──────────────────────────────────────────────────────────────────

export type RuleCategory =
  | "AMOUNT"
  | "VELOCITY"
  | "BEHAVIORAL"
  | "NETWORK"
  | "AFRICA"
  | "DEVICE"
  | "COMPLIANCE";

export type RuleSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RuleStatus = "DRAFT" | "SHADOW" | "PRODUCTION" | "ARCHIVED";

export interface RuleCondition {
  field: string;
  op: ">" | ">=" | "<" | "<=" | "==" | "!=" | "in" | "not_in";
  value: unknown;
}

export interface Rule {
  rule_id: string;
  rule_name: string;
  rule_category: RuleCategory;
  severity: RuleSeverity;
  enabled: boolean;
  status: RuleStatus;
  logic_type: "python" | "dsl";
  rule_logic: { conditions?: RuleCondition[]; operator?: "AND" | "OR"; [k: string]: unknown };
  risk_contribution: number;
  shadow_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  version: number;
  description: string | null;
  explain_template: string | null;
  created_at: string;
  updated_at: string;
}

// ─── STR / CTR reports ──────────────────────────────────────────────────────

export type STRStatus = "DRAFT" | "FILED" | "WITHDRAWN";

export interface STRReport {
  id: string;
  case_id: string;
  jurisdiction_id: string;
  status: STRStatus;
  subject_customer_id: string;
  subject_name: string;
  suspicious_activity_type: string;
  reporting_entity: string | null;
  total_amount: number;
  currency: string;
  transaction_count: number;
  date_range_start: string | null;
  date_range_end: string | null;
  narrative: string;
  filing_reference: string | null;
  filed_at: string | null;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CTRStatus = "DRAFT" | "FILED" | "EXEMPT";

export interface CTRReport {
  id: string;
  transaction_id: string;
  customer_id: string;
  jurisdiction_id: string;
  status: CTRStatus;
  amount: number;
  currency: string;
  transaction_type: string;
  is_cash: boolean;
  filing_reference: string | null;
  filed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Four-eyes approvals ────────────────────────────────────────────────────

export type ApprovalAction =
  | "SANCTIONS_UPDATE"
  | "THRESHOLD_CHANGE"
  | "RULE_PROMOTION"
  | "STR_FILING"
  | "CTR_EXEMPTION";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export interface PendingApproval {
  id: string;
  action_type: ApprovalAction;
  status: ApprovalStatus;
  requested_by: string;
  reviewed_by: string | null;
  payload: Record<string, unknown>;
  review_notes: string | null;
  expires_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Watchlists & sanctions ─────────────────────────────────────────────────

export interface Watchlist {
  name: string;
  list_type: string;
  description: string | null;
  source_url: string | null;
  is_active: boolean;
  entry_count: number;
}

export interface WatchlistEntry {
  id: string;
  list_name: string;
  value: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type SanctionsRecommendation = "CLEAR" | "REVIEW" | "MATCH";

export interface SanctionsMatch {
  list_name: string;
  matched_name: string;
  match_score: number;
  reasons: string[];
  metadata?: Record<string, unknown>;
}

export interface ScreenNameResult {
  query_name: string;
  recommendation: SanctionsRecommendation;
  matches: SanctionsMatch[];
  confidence: number;
}

export interface SanctionsStatus {
  ready: boolean;
  loaded_lists: string[];
  entry_count: number;
}

// ─── Audit trail ────────────────────────────────────────────────────────────

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "LOGIN"
  | "LOGOUT";

export interface AuditEntry {
  id: string;
  resource_type: string;
  resource_id: string;
  action: AuditAction;
  changed_by: string;
  previous_value: unknown;
  new_value: unknown;
  notes: string | null;
  created_at: string;
}

// ─── Shadow rule comparison ─────────────────────────────────────────────────

export interface ShadowRuleDelta {
  rule_id: string;
  legacy_fires: number;
  ez_fires: number;
  delta_pct: number;
}

export interface ShadowStats {
  window_days: number;
  total_transactions: number;
  agreement_rate: number;
  equivalence_rate: number;
  per_rule_deltas: ShadowRuleDelta[];
  promotion_ready: boolean;
}

export interface ShadowComparisonRecord {
  id: string;
  transaction_id: string;
  legacy_outcome: string;
  ez_outcome: string;
  agreement: boolean;
  legacy_rules: string[];
  ez_rules: string[];
  created_at: string;
}

// ─── ML registry & drift ────────────────────────────────────────────────────

export type ModelType = "xgboost" | "catboost" | "river" | "isolation_forest" | "lightgbm";
export type ModelStatus = "TRAINING" | "CHAMPION" | "RETIRED";

export interface ModelRegistryEntry {
  id: string;
  model_type: ModelType;
  version: number;
  status: ModelStatus;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  training_samples: number;
  created_at: string;
  promoted_at: string | null;
}

export interface DriftCheck {
  id: string;
  model_id: string;
  check_timestamp: string;
  feature_name: string;
  p_value: number;
  psi: number;
  is_drifting: boolean;
}

export interface LabeledTransaction {
  id: string;
  transaction_id: string;
  customer_id: string;
  label: "FRAUD" | "LEGIT";
  label_source: "ALERT_RESOLUTION" | "SAR_FILING" | "MANUAL";
  labeled_by: string;
  labeled_at: string;
}

// ─── Health & metrics ───────────────────────────────────────────────────────

export interface HealthSummary {
  status: "healthy" | "degraded" | "down";
  service: string;
  version?: string;
}

export interface SubsystemStatus {
  status: "healthy" | "degraded" | "down";
  detail?: string;
  latency_ms?: number;
  [key: string]: unknown;
}

export interface DetailedHealth {
  status: "healthy" | "degraded" | "down";
  service: string;
  version?: string;
  dependencies: Record<string, SubsystemStatus>;
  ml_models?: SubsystemStatus;
  [key: string]: unknown;
}

export interface SystemMetrics {
  transactions_total: number;
  alerts_total: number;
  scoring_coverage: number;
  error_rate: number;
  [key: string]: unknown;
}

// ─── Ingestion ──────────────────────────────────────────────────────────────

export interface IngestResponse {
  success: boolean;
  message: string;
  transaction_id: string | null;
  errors: string[];
  is_duplicate: boolean;
}

export interface BatchIngestResponse {
  batch_id: string;
  total: number;
  succeeded: number;
  failed: number;
  duplicate: number;
  errors: { index: number; error: string }[];
}
