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
  /** Backend AlertActionResponse uses `alert_id`/`updated_at` on alert mutations. */
  alert_id?: string;
  updated_at?: string;
  /** Four-eyes flow returns this when the mutation requires a second approver. */
  approval_id?: string;
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
  currency_code: string;
  ctr_threshold_cash: number;
  ctr_threshold_non_cash: number;
  str_min_amount?: number | null;
  str_deadline_hours: number;
  str_internal_review_hours?: number;
  regulator_code: string;
  regulator_name: string;
  goaml_version: string;
  is_active: boolean;
  notes?: string | null;
}

// ─── Transactions ───────────────────────────────────────────────────────────

export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "PAYMENT" | "REVERSAL" | string;
export type Channel = "USSD" | "MOBILE" | "WEB" | "AGENT" | "API" | string;
export type FlowType = "P2P" | "P2M" | "B2P" | "CASH_IN" | "CASH_OUT" | string;

/**
 * Combined shape covering both `GET /transactions` rows (list view) and
 * `GET /transactions/{id}` (detail view). Backend uses `transaction_type` —
 * not `type` — on both paths and does not return a `currency` field. Risk
 * sub-scores (`customer_risk_score`, etc.) only exist on the detail response.
 */
export interface Transaction {
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  amount: number;
  transaction_type: TransactionType;
  channel: Channel;
  flow_type: FlowType | null;
  receiver_id: string | null;
  receiver_country: string | null;
  device_id?: string | null;
  geo_location?: string | null;
  customer_risk_score?: number;
  transaction_risk_score?: number;
  behavioral_risk_score?: number;
  combined_risk_score: number;
  flagged: boolean;
  alert_id?: string | null;
  created_at?: string;
}

export interface TransactionTimelineEvent {
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  actor: string;
  timestamp: string;
}

export interface RelatedTransaction {
  transaction_id: string;
  timestamp: string;
  amount: number;
  transaction_type: string;
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

export interface RiskFactorBreakdown {
  customer_type: number;
  occupation: number;
  geography: number;
  pep_status: number;
  kyc_quality: number;
}

export interface CustomerRiskProfile {
  customer_id: string;
  customer_type: string;
  risk_level: RiskLevel;
  risk_score: number;
  risk_factors: RiskFactorBreakdown;
  kyc_quality_score: number;
  kyc_completion_date: string | null;
  is_pep: boolean;
  has_open_alerts: boolean;
  last_risk_assessment: string | null;
  assessment_explanation: string;
}

export interface CustomerTransactionHistoryItem {
  transaction_id: string;
  timestamp: string;
  amount: number;
  transaction_type: string;
  channel: string;
  receiver_country: string | null;
  flagged: boolean;
  risk_score: number;
}

export interface CustomerTransactionsResponse {
  customer_id: string;
  transactions: CustomerTransactionHistoryItem[];
  total: number;
  period_start: string;
  period_end: string;
}

export interface CustomerAlertHistoryItem {
  alert_id: string;
  alert_timestamp: string;
  priority: AlertPriority;
  status: AlertStatus;
  risk_score: number;
  resolution: AlertResolution | null;
  triggered_rules: string[];
}

export interface CustomerAlertsResponse {
  customer_id: string;
  alerts: CustomerAlertHistoryItem[];
  total: number;
  open_count: number;
  closed_count: number;
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export type AlertPriority = "IMMEDIATE" | "BATCH" | "REVIEW";
export type AlertStatus = "OPEN" | "INVESTIGATING" | "CLOSED";
export type AlertResolution = "FALSE_POSITIVE" | "LEGITIMATE" | "SAR_FILED" | "RESTRICTED";
export type AlertNoteType = "investigation" | "follow_up" | "documentation" | "escalation";

export interface InvestigationNote {
  note_id: string;
  timestamp: string;
  analyst: string;
  note_type: string;
  content: string;
}

export interface TriggeredRuleDetail {
  rule_id: string;
  rule_name: string;
  severity: string;
  risk_contribution: number;
  explanation: string;
}

export interface AlertCustomerContext {
  customer_id: string;
  customer_type: string;
  risk_level: string;
  risk_score: number;
  is_pep: boolean;
  account_age_days: number;
  total_alerts: number;
  open_alerts: number;
}

export interface AlertTransactionContext {
  transaction_id: string;
  timestamp: string;
  amount: number;
  transaction_type: string;
  channel: string;
  receiver_country: string | null;
  customer_risk_score: number;
  transaction_risk_score: number;
  behavioral_risk_score: number;
  combined_risk_score: number;
}

export interface AlertBaselineComparison {
  current_value: number;
  baseline_value: number;
  deviation_percentage: number;
  is_anomalous: boolean;
}

/** Row in the paginated `/alerts` response — keep aligned with backend AlertListItem. */
export interface AlertListItem {
  alert_id: string;
  customer_id: string;
  transaction_id: string;
  alert_timestamp: string;
  priority: AlertPriority;
  status: AlertStatus;
  risk_score: number;
  triggered_rules_count: number;
  assigned_to: string | null;
}

/** Detail returned by `/alerts/{id}` — backend AlertDetailResponse. */
export interface Alert {
  alert_id: string;
  customer_id: string;
  transaction_id: string;
  alert_timestamp: string;
  priority: AlertPriority;
  status: AlertStatus;
  risk_score: number;
  resolution: AlertResolution | null;
  resolution_notes: string | null;
  assigned_to: string | null;
  triggered_rules: TriggeredRuleDetail[];
  customer_context: AlertCustomerContext;
  transaction_context: AlertTransactionContext;
  baseline_comparisons: Record<string, AlertBaselineComparison>;
  recent_transactions: AlertTransactionContext[];
  investigation_notes: InvestigationNote[];
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
  from_status: CaseStatus | null;
  to_status: CaseStatus;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

/** Row from `GET /cases/{id}/alerts` — a link, not the full Alert. */
export interface CaseAlertLink {
  id: string;
  case_id: string;
  alert_id: string;
  added_by: string | null;
  added_at: string;
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
  jurisdiction_id: string | null;
  status: STRStatus;
  subject_customer_id: string | null;
  subject_name: string | null;
  suspicious_activity_type: string | null;
  reporting_entity: string | null;
  total_amount: number | null;
  currency: string | null;
  transaction_count: number | null;
  date_range_start: string | null;
  date_range_end: string | null;
  narrative: string | null;
  filing_reference: string | null;
  filed_at: string | null;
  created_by: string | null;
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
  action_type: ApprovalAction | string;
  status: ApprovalStatus | string;
  requested_by: string | null;
  reviewed_by: string | null;
  payload: Record<string, unknown>;
  review_notes: string | null;
  expires_at: string;
  reviewed_at: string | null;
  created_at: string;
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

export interface SanctionsMatchCandidate {
  list_name: string;
  list_type: string;
  matched_name: string;
  entry_value: string;
  score: number;
  match_type: "exact" | "alias" | "fuzzy" | string;
  entry_metadata?: Record<string, unknown>;
}

export interface ScreenNameResult {
  query_name: string;
  query_normalized: string;
  recommendation: SanctionsRecommendation;
  highest_score: number;
  candidates: SanctionsMatchCandidate[];
  screened_lists: string[];
  total_names_checked: number;
  screening_duration_ms: number;
  screened_at: string | null;
}

export interface SanctionsStatus {
  loaded: boolean;
  total_name_entries: number;
  loaded_lists: string[];
  thresholds?: { match: number; review: number };
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
  action: AuditAction | string;
  changed_by: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

// ─── Shadow rule comparison ─────────────────────────────────────────────────

export interface ShadowPerRuleStat {
  rule_id: string;
  legacy_trigger_count: number;
  ez_trigger_count: number;
  delta: number;
  legacy_rate: number;
  ez_rate: number;
}

export interface ShadowPromotionCriteria {
  equivalence_threshold: number;
  agreement_threshold: number;
  min_days_required: number;
  min_transactions_required: number;
  days_of_data: number;
  transactions_evaluated: number;
}

export interface ShadowStats {
  window_days: number;
  total_evaluated: number;
  equivalence_rate: number | null;
  agreement_rate: number | null;
  mean_risk_delta: number | null;
  median_risk_delta: number | null;
  p95_risk_delta: number | null;
  promotion_ready: boolean;
  promotion_criteria: ShadowPromotionCriteria;
  per_rule_stats: ShadowPerRuleStat[];
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

export type ModelType = "xgboost" | "catboost" | "river" | "isolation_forest" | "lightgbm" | string;
export type ModelStatus = "TRAINING" | "CHAMPION" | "RETIRED" | string;

export interface ModelRegistryEntry {
  id: string;
  model_type: ModelType | null;
  version: number;
  status: ModelStatus | null;
  artifact_path: string | null;
  trained_at: string | null;
  sample_count: number | null;
  fraud_sample_count: number | null;
  legit_sample_count: number | null;
  metrics: Record<string, unknown> | null;
  feature_names: string[] | null;
  created_at: string | null;
}

export interface DriftReport {
  id: string;
  report_date: string | null;
  reference_window_days: number;
  current_window_days: number;
  reference_sample_count: number | null;
  current_sample_count: number | null;
  features_tested: number | null;
  features_drifted: number | null;
  critical_features_drifted: number | null;
  feature_drift_detected: boolean;
  prediction_drift_detected: boolean;
  drift_detected: boolean;
  skipped_insufficient_data: boolean;
  skip_reason: string | null;
  per_feature_results: Record<string, unknown> | null;
  prediction_results: Record<string, unknown> | null;
  created_at: string | null;
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
