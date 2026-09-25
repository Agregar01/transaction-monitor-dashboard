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

/** GET /auth/me — the caller's own profile, roles, and flat permission list.
 * Distinct from `User` (the user-management shape) since this also carries
 * the resolved permissions + institution that drive the frontend's RBAC gates. */
export interface MeResponse {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  permissions: string[];
  institution_id: string | null;
  institution_name: string | null;
  /** True when this institution is a sandbox tenant: its traffic runs the real
   * engine but is excluded from live reporting, regulator views and ML training.
   * Drives the header badge — without it the console cannot tell a client
   * whether what they are doing counts. */
  sandbox: boolean;
}

// ─── Tenant ─────────────────────────────────────────────────────────────────

export type JurisdictionCode = "GHA" | "NGA" | "KEN" | "ZAF";

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
  /** L1 analyst case-access policy for this tenant. Present once the backend
   *  adds it to /tenant/info; absent on older backends → treat as "originator". */
  analyst_case_access?: "all" | "originator" | "none";
}

// ─── Data Privacy (DSAR / erasure) ──────────────────────────────────────────

export type DsarType = "ACCESS" | "ERASURE";
export type DsarStatus = "PENDING" | "COMPLETED" | "REJECTED";

export interface DsarRequest {
  id: string;
  customer_id: string;
  request_type: DsarType;
  status: DsarStatus;
  requested_by: string;
  jurisdiction_code: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DsarRequestList {
  total: number;
  page: number;
  page_size: number;
  items: DsarRequest[];
}

/** GET /privacy/status — per-jurisdiction data-protection posture. */
export interface PrivacyStatus {
  jurisdiction: string;
  dp_applicable: boolean;
  law: string;
  authority_code: string;
  authority_name: string;
  dsar_response_days: number;
  data_residency_location: string;
  residency_required: boolean;
  compliant: boolean;
  gap: string | null;
  pii_tables: string[];
}

/** GET /privacy/dsar/{id} — structured PII export. Shape is open-ended. */
export interface DsarExport {
  customer_id: string;
  customer: Record<string, unknown> | null;
  transactions: Record<string, unknown>[];
  pii_fields_exported: Record<string, unknown>;
  [key: string]: unknown;
}

/** POST /privacy/erasure/{id} — 202 four-eyes response (or immediate for admin). */
export interface ErasureResponse {
  status: "PENDING_APPROVAL" | "ANONYMISED";
  customer_id: string;
  approval_id: string;
  message: string;
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

// Backend stores Title-case values (transaction.py local enums), NOT the UPPERCASE
// set in the unused enums.py. These literals must mirror the actually-emitted values
// — and the dropdown source-of-truth in config/constants.ts (TRANSACTION_TYPES,
// CHANNELS). `| string` keeps them permissive against future additions.
export type TransactionType = "Deposit" | "Transfer" | "Withdrawal" | string;
export type Channel = "ATM" | "Bank" | "Card" | "Momo" | "Agent" | string;
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
  /** Travel Rule summary (detail view only): VA record verdict or fiat R.16 check. */
  travel_rule?: TransactionTravelRuleSummary | null;
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

// Backend stores Title-case Low/Medium/High (customer.py RiskLevel enum). `| string`
// keeps us resilient if a jurisdiction ever adds bands.
export type RiskLevel = "Low" | "Medium" | "High" | string;

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
export type AlertResolution =
  | "FALSE_POSITIVE"
  | "LEGITIMATE"
  | "SAR_FILED"
  | "RESTRICTED"
  // System-set only (KYC auto-close on a passed verification) — not an agent choice.
  | "IDENTITY_CONFIRMED";
export type AlertNoteType = "investigation" | "follow_up" | "documentation" | "escalation";

export interface InvestigationNote {
  note_id: string;
  timestamp: string;
  analyst: string;
  note_type: string;
  content: string;
}

/** Free-text collaboration note on a case — backend CaseNote / _note_dict. */
export interface CaseNote {
  id: string;
  case_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
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
  | "ASSIGNED"
  | "IN_REVIEW"
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

/** Response from POST /alerts/{id}/escalate — note it keys the case by `case_id`, not `id`. */
export interface EscalateAlertResponse {
  case_id: string;
  status: CaseStatus;
  title: string;
  case_type: CaseType;
  institution_id: string | null;
  jurisdiction_id: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseStatusHistoryEntry {
  id: string;
  from_status: CaseStatus | null;
  to_status: CaseStatus;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

/** Evidence file attached to a case — backend _attachment_dict(). */
export interface CaseAttachment {
  id: string;
  case_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  description: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  download_url?: string;
}

/** F9 — device profile returned by GET /cases/{id}/device-history */
export interface DeviceProfile {
  device_id: string;
  last_customer_id: string | null;
  last_imei: string | null;
  last_iccid: string | null;
  last_mno: string | null;
  last_os_type: string | null;
  last_os_version: string | null;
  is_rooted: boolean | null;
  transaction_count: number;
  distinct_customer_count: number;
  sim_swap_detected: boolean;
  imei_change_detected: boolean;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export interface CaseDeviceHistory {
  case_id: string;
  devices: DeviceProfile[];
}

/** F10 — transaction chain edge/node returned by GET /cases/{id}/transaction-chain */
export interface ChainNode {
  id: string;
  layer: number;
}

export interface ChainEdge {
  transaction_id: string;
  from: string | null;
  to: string | null;
  amount: number;
  created_at: string | null;
  transaction_type: string | null;
  channel: string | null;
}

export interface CaseTransactionChain {
  case_id: string;
  nodes: ChainNode[];
  edges: ChainEdge[];
  total_nodes: number;
  total_edges: number;
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
  /** Tunable thresholds exposed for per-institution override (e.g. {threshold: 10000}). Empty/absent ⇒ nothing tunable. */
  default_parameters?: Record<string, number | string | boolean>;
  /** This institution's override values, merged on top of the defaults. Present only when overridden. */
  parameters?: Record<string, number | string | boolean>;
  /** True when the calling institution has an override on this rule. */
  has_institution_override?: boolean;
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

// POST /ingestion/upload — multipart file upload (CSV / JSON / JSONL / xlsx).
export interface FileUploadResponse {
  batch_id: string;
  total_submitted: number;
  successful: number;
  failed: number;
  failed_items: Record<string, unknown>[];
  message: string;
}

// GET /ingestion/batch/{id}/status
export interface BatchStatusResponse {
  batch_id: string;
  status: string; // pending | processing | completed | failed
  progress: { total: number; processed: number; successful: number; failed: number };
  started_at: string | null;
  completed_at: string | null;
  source_system: string | null;
  file_name: string | null;
}

// ─── Analytics / Reports ────────────────────────────────────────────────────

export interface AlertTrendPoint {
  date: string;
  total: number;
  immediate_count: number;
  fp_count: number;
}

export interface AnalyticsSummary {
  period_days: number;
  alert_trends: AlertTrendPoint[];
  risk_distribution: { ALLOW: number; FLAG: number; STEP_UP: number; HOLD: number; BLOCK: number };
  case_breakdown: Record<string, number>;
  str_ctr_totals: {
    str_filed: number;
    str_draft: number;
    ctr_filed: number;
    ctr_draft: number;
  };
  overall_stats: {
    transactions_total: number;
    alerts_total: number;
    avg_risk_score: number;
    false_positive_rate: number;
  };
  top_rules: {
    rule_id: string;
    total_triggers: number;
    false_positive_count: number;
    false_positive_rate: number;
    period_start: string;
    period_end: string;
  }[];
}

export interface RuleThresholdStat {
  rule_id: string;
  period_start: string;
  period_end: string;
  total_triggers: number;
  false_positive_count: number;
  false_positive_rate: number;
  recommendation: "increase_threshold" | "review_rule" | "well_calibrated" | "monitor";
}

export interface ClusterSummary {
  run_date: string | null;
  clusters: {
    cluster_label: number;
    count: number;
    avg_amount: number;
    is_noise: boolean;
  }[];
  total_clustered: number;
  noise_count: number;
}

export interface FalsePositiveRate {
  rule_id: string;
  period_start: string;
  period_end: string;
  total_triggers: number;
  false_positive_count: number;
  false_positive_rate: number;
}

export interface AuditChainVerification {
  entries_verified: number;
  chain_valid: boolean;
  first_breach: string | null;
  breach_count: number;
}

/** F2-F4 — Geographic heatmap from GET /analytics/geo-heatmap */
export interface GeoCountryStat {
  country_code: string;
  transaction_count: number;
  total_volume: number;
  unique_senders: number;
  alert_count: number;
  fraud_rate: number;
}

export interface GeoCluster {
  cluster_id: number;
  size: number;
  avg_amount: number;
  dominant_channel: string | null;
  country_code: string;
  run_date: string;
}

export interface GeoCorridor {
  sender_country: string;
  receiver_country: string;
  txn_count: number;
  total_volume: number;
}

export interface GeoHeatmapData {
  period_days: number;
  country_stats: GeoCountryStat[];
  clusters: GeoCluster[];
  top_corridors: GeoCorridor[];
  generated_at: string;
}

/** M2 — Insider threat analysis from GET /analytics/insider-threat */
export interface InsiderThreatUser {
  user_id: string;
  action_count?: number;
  off_hours_count?: number;
  self_approve_count?: number;
}

export interface InsiderThreatSensitiveAccess {
  user_id: string;
  resource_type: string;
  count: number;
}

export interface InsiderThreatReport {
  period_days: number;
  total_actions: number;
  unique_actors: number;
  bulk_action_threshold: number;
  bulk_actors: InsiderThreatUser[];
  off_hours_access: InsiderThreatUser[];
  sensitive_resource_access: InsiderThreatSensitiveAccess[];
  self_approval_signals: InsiderThreatUser[];
  top_users_by_activity: InsiderThreatUser[];
}

// ─── Live transaction feed (polling) ────────────────────────────────────────
// GET /transactions/feed — poll with the previous response's next_cursor.

export interface TransactionFeedItem {
  transaction_id: string;
  customer_id: string | null;
  timestamp: string | null;
  amount: number | null;
  transaction_type: string | null;
  channel: string | null;
  combined_risk_score: number | null;
  flagged: boolean;
}

export interface TransactionFeedResponse {
  items: TransactionFeedItem[];
  count: number;
  next_cursor: string | null;
}

// ─── Behavioral fraud engine (SEON-style) ───────────────────────────────────
// GET /analytics/behavioral-risk — aggregate behavioral signals per customer/device.

export interface MuleSignal {
  customer_id: string;
  inbound_count: number;
  inbound_total: number;
}

export interface CardTestingSignal {
  customer_id: string;
  micro_count: number;
}

export interface DeviceSharingSignal {
  device_id: string;
  distinct_customers: number;
  last_customer: string | null;
  sim_swap: boolean;
  imei_change: boolean;
}

export interface SimSwapSignal {
  device_id: string;
  last_customer: string | null;
  prev_iccid: string | null;
  last_iccid: string | null;
}

export interface BehavioralRiskSummary {
  period_days: number;
  mule_signals: MuleSignal[];
  card_testing_signals: CardTestingSignal[];
  device_sharing: DeviceSharingSignal[];
  sim_swaps: SimSwapSignal[];
  total_mule_signals: number;
  total_card_testing: number;
  total_device_sharing: number;
  total_sim_swaps: number;
}

// ─── Case entity-network graph (GET /cases/{id}/graph) ───────────────────────

export type CaseGraphNodeType = "case" | "alert" | "customer" | "device" | "sim" | "handset";

export interface CaseGraphNode {
  id: string;
  type: CaseGraphNodeType;
  label: string;
  // Present on some node types:
  in_case?: boolean;          // customer: a subject of this case (vs. connected via a shared device)
  name?: string | null;       // customer: display name (masked unless caller may see raw PII)
  phone?: string | null;      // customer: phone (masked)
  risk_level?: string | null; // customer
  is_pep?: boolean;           // customer
  msisdn?: string | null;     // sim: the phone number on the SIM (masked)
  distinct_customers?: number; // device
  priority?: string;          // alert
  status?: string;            // alert / case
  risk_score?: number;        // alert
  case_type?: string;         // case
}

export interface CaseGraphEdge {
  source: string;
  target: string;
  type: "has_alert" | "subject" | "used_device" | "sim" | "handset" | string;
}

export interface CaseGraph {
  case_id: string;
  nodes: CaseGraphNode[];
  edges: CaseGraphEdge[];
  stats: {
    customers: number;
    connected_customers: number;
    devices: number;
    alerts: number;
  };
}

export interface DeviceAssociatedCustomer {
  customer_id: string;
  name: string | null; // display name, masked unless caller may see raw PII
  transactions: number;
  first_seen: string | null;
  last_seen: string | null;
}

/** Drill-down for one device: GET /analytics/devices/{id}/associations. */
export interface DeviceAssociations {
  device_id: string;
  distinct_customers: number;
  customers: DeviceAssociatedCustomer[];
  iccids: string[];
  msisdns: string[];
  imeis: string[];
  mnos: string[];
}

// ─── Virtual asset Travel Rule (GET/POST /travel-rule/*) ───

export type TravelRuleDirection = "OUTBOUND" | "INBOUND";
export type TravelRuleDisposition = "PROCEED" | "HOLD" | "BLOCK" | "SUSPEND" | "RETURN" | "PENDING_INFO";
export type TravelRuleMode = "SHADOW" | "ENFORCE";
export type TravelRuleResolution =
  | "EXECUTE"
  | "SUSPEND"
  | "REJECT_RETURN"
  | "REQUEST_INFO"
  | "CANCEL"
  | "OVERRIDE_RELEASE"
  | "CLEAR_SCREENING_FALSE_POSITIVE";

/** List row: never contains PII (no wallets, no payload). */
export interface TravelRuleRecordListItem {
  id: string;
  transaction_id: string;
  direction: TravelRuleDirection;
  asset_symbol: string;
  network: string;
  amount: number | string | null;
  status: string;
  disposition: TravelRuleDisposition;
  threshold_band: "ABOVE" | "BELOW";
  enforcement_mode: TravelRuleMode;
  exception_open: boolean;
  missing_count: number;
  reason_codes: string[];
  screening_status: string;
  counterparty_type: string;
  counterparty_vasp_id: string | null;
  counterparty_name: string | null;
  profile_jurisdiction: string;
  resolution: string | null;
  info_deadline_at: string | null;
  created_at: string;
}

export interface TravelRuleRecordList {
  items: TravelRuleRecordListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TravelRuleEvent {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  source: string;
  actor_user_id: string | null;
  protocol_state_raw: string | null;
  details: Record<string, unknown> | null;
  occurred_at: string | null;
  recorded_at: string;
}

export interface TravelRuleRecordDetail extends TravelRuleRecordListItem {
  amount_native: number | string | null;
  fx_rate: number | string | null;
  fx_source: string | null;
  originator_wallet: string | null;
  beneficiary_wallet: string | null;
  wallet_memo: string | null;
  tx_hash: string | null;
  tx_output_index: number | null;
  counterparty_identification_method: string;
  counterparty_dd_status: string | null;
  counterparty_risk_rating: string | null;
  protocol: string | null;
  protocol_reference: string | null;
  ivms101_payload: Record<string, unknown> | null;
  ivms101_version: string | null;
  profile_version: number;
  profile_legal_status: string;
  missing_fields: string[];
  ivms_errors: string[];
  name_alignment_score: number | null;
  screening_details: Record<string, unknown> | null;
  analytics_risk_score: number | null;
  tr_sent_at: string | null;
  tr_received_at: string | null;
  onchain_broadcast_at: string | null;
  onchain_confirmed_at: string | null;
  post_facto: boolean;
  resolution_reason: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  retention_until: string | null;
  legal_hold: boolean;
  purged_at: string | null;
  customer_id: string | null;
  allowed_resolutions: TravelRuleResolution[];
  events: TravelRuleEvent[];
}

export interface TravelRuleListParams {
  status?: string;
  disposition?: string;
  exception_open?: boolean;
  direction?: string;
  counterparty_vasp_id?: string;
  limit?: number;
  offset?: number;
}

export interface TravelRuleResolveResult {
  applied: boolean;
  approval_id: string | null;
  disposition: string;
  status: string;
}

export interface CounterpartyVaspReview {
  id: string;
  vasp_id: string;
  review_type: string;
  proposed_outcome: string;
  risk_rating: string;
  checklist: Record<string, unknown>;
  evidence_notes: string | null;
  next_review_at: string | null;
  status: string;
  reviewed_by: string | null;
  approval_request_id: string | null;
  created_at: string;
  applied_at: string | null;
}

export interface CounterpartyVasp {
  id: string;
  legal_name: string;
  lei: string | null;
  registration_number: string | null;
  registration_authority: string | null;
  country: string | null;
  licence_status: string;
  licence_source: string | null;
  licence_checked_at: string | null;
  travel_rule_protocols: string[];
  sanctions_status: string;
  risk_rating: string | null;
  dd_status: string;
  dd_approved_at: string | null;
  dd_next_review_at: string | null;
  confidentiality_assessed: boolean;
  notes: string | null;
  auto_created: boolean;
  created_at: string;
  updated_at: string;
  failure_count?: number | null;
  reviews?: CounterpartyVaspReview[] | null;
}

export interface CounterpartyVaspInput {
  legal_name?: string;
  lei?: string | null;
  registration_number?: string | null;
  registration_authority?: string | null;
  country?: string | null;
  licence_status?: string;
  licence_source?: string | null;
  travel_rule_protocols?: string[];
  confidentiality_assessed?: boolean;
  notes?: string | null;
  sanctions_status?: string;
}

export interface CounterpartyReviewInput {
  review_type: "INITIAL" | "PERIODIC" | "TRIGGERED";
  proposed_outcome: "APPROVED" | "RESTRICTED" | "REJECTED";
  risk_rating: "LOW" | "MEDIUM" | "HIGH" | "PROHIBITED";
  checklist: Record<string, boolean>;
  evidence_notes?: string | null;
  next_review_at?: string | null;
}

export interface TravelRuleProfile {
  jurisdiction_code: string;
  version: number;
  legal_status: string;
  source_reference: string;
  currency: string;
  threshold_amount: number | string | null;
  data_set_version: string;
  unhosted_policy: string;
  ownership_proof_threshold: number | string | null;
  unregistered_counterparty_policy: string;
  inbound_missing_info_policy: string;
  inbound_grace_minutes: number;
  request_info_deadline_hours: number;
  stale_proceed_hours: number;
  repeat_offender_threshold: number;
  repeat_offender_window_days: number;
  retention_years: number;
  is_builtin: boolean;
}

export interface TravelRuleMI {
  period: { from: string; to: string };
  transfers: {
    count: number;
    value: number;
    compliant_count: number;
    compliant_value: number;
    compliant_pct_count: number | null;
    compliant_pct_value: number | null;
  };
  timeliness: { with_both_timestamps: number; on_time: number; on_time_pct: number | null };
  missing_fields: Record<string, number>;
  exceptions: {
    opened_in_period: number;
    open_total: number;
    open_by_age: { under_1d: number; "1d_to_7d": number; over_7d: number };
    resolutions: Record<string, number>;
  };
  exposure: {
    unhosted_count: number;
    unhosted_value: number;
    non_approved_counterparty_count: number;
    non_approved_counterparty_value: number;
  };
  counterparties: {
    repeat_offenders: { id: string; legal_name: string; failures: number }[];
    reviews_overdue: number;
  };
  by_jurisdiction: Record<string, number>;
}

/** Summary on GET /transactions/{id} (`travel_rule`). */
export type TransactionTravelRuleSummary =
  | {
      kind: "VIRTUAL_ASSET";
      record_id: string | null;
      status?: string;
      disposition: string | null;
      mode?: TravelRuleMode;
      threshold_band?: string;
      missing_fields?: string[];
      reason_codes: string[];
      exception_open?: boolean;
      asset_symbol?: string;
      network?: string;
      direction?: TravelRuleDirection;
    }
  | { kind: "FIAT_R16"; required: boolean; compliant: boolean; missing_fields: string[] };
