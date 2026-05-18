// ─── Entity & Enum Types ────────────────────────────────────────────────────

export type EntityType = "INDIVIDUAL" | "BUSINESS";
export type EventType = "TRANSACTION" | "ACTION" | "LOGIN" | "SCHEDULED" | "EXTERNAL";
export type VerificationResult = "passed" | "failed";

// ─── Customer Types ─────────────────────────────────────────────────────────

export interface CustomerRegisterRequest {
  external_id: string;
  client_id: string;
  entity_type: EntityType;
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerRegisterResponse {
  id: string;
  external_id: string;
  client_id: string;
  entity_type: EntityType;
  current_tier: string;
  status: string;
  daily_limit: number;
  monthly_limit: number;
  per_transaction_limit: number;
  allowed_activities: string[];
  next_steps: string;
  created_at: string;
}

export interface CustomerTierInfo {
  entity_type: EntityType;
  current_tier: string;
  risk_level: string;
  risk_score: number;
  daily_limit: number;
  monthly_limit: number;
  per_transaction_limit: number;
  daily_usage: number;
  monthly_usage: number;
  daily_remaining: number;
  monthly_remaining: number;
}

export interface CustomerDetail {
  id: string;
  external_id: string;
  client_id: string;
  entity_type: EntityType;
  current_tier: string;
  risk_level: string;
  risk_score: number;
  daily_limit: number;
  monthly_limit: number;
  per_transaction_limit: number;
  daily_usage: number;
  monthly_usage: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CustomerListItem {
  id: string;
  external_id: string;
  client_id?: string;
  entity_type: EntityType;
  current_tier: string;
  risk_level: string;
  risk_score: number;
  name?: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TierHistoryItem {
  from_tier: string | null;
  to_tier: string;
  reason: string;
  triggered_by: string | null;
  created_at: string;
}

export interface CustomerTierHistory {
  customer_id: string;
  current_tier: string;
  history: TierHistoryItem[];
}

export interface VerificationCompleteRequest {
  verification_type: string;
  result: VerificationResult;
  new_tier?: string;
  decision_id?: string;
  evidence?: Record<string, unknown>;
  client_id: string;
}

export interface VerificationCompleteResponse {
  customer_external_id: string;
  previous_tier: string;
  new_tier: string;
  tier_changed: boolean;
  daily_limit: number;
  monthly_limit: number;
  message: string;
}

// ─── Decision Types ─────────────────────────────────────────────────────────

export interface EvaluationRequest {
  event_id: string;
  event_type: EventType;
  client_id: string;
  customer_external_id: string;
  entity_type?: EntityType;
  amount?: number;
  currency?: string;
  channel?: string;
  source_ip?: string;
  device_id?: string;
  payload?: Record<string, unknown>;
}

export interface TriggeredRule {
  rule_id: string;
  rule_name: string;
  trigger_code: string;
  condition_matched: string;
  contribution_to_decision: string;
}

export interface EvaluationResponse {
  decision_id: string;
  event_id: string;
  entity_type: string;
  action: string;
  workflow: string | null;
  risk_level: string;
  risk_score: number;
  customer_current_tier: string;
  target_tier: string | null;
  reason: string;
  triggered_rules: TriggeredRule[];
  details: Record<string, unknown>;
  processing_time_ms: number;
}

export interface DecisionDetail {
  decision_id: string;
  event_id: string;
  customer_id: string;
  customer_external_id: string | null;
  client_id: string;
  action: string;
  workflow: string | null;
  risk_level: string;
  risk_score: number;
  customer_tier_at_decision: string;
  target_tier: string | null;
  triggered_rules: TriggeredRule[];
  reason: string;
  details: Record<string, unknown>;
  processing_time_ms: number;
  created_at: string;
}

export interface DecisionHistoryItem {
  decision_id: string;
  event_id: string;
  customer_external_id: string;
  event_type: string;
  action: string;
  workflow: string | null;
  target_tier: string | null;
  reason: string;
  risk_level: string;
  risk_score: number;
  processing_time_ms: number;
  created_at: string;
}

export interface DecisionStatistics {
  total_decisions: number;
  decisions_by_action: Record<string, number>;
  decisions_by_risk_level: Record<string, number>;
  avg_processing_time_ms: number;
  period: string;
}

// ─── Usage Types ────────────────────────────────────────────────────────────

export interface UsageDayItem {
  date: string;
  evaluate_calls: number;
  customer_calls: number;
  total_calls: number;
  decisions_allow: number;
  decisions_block: number;
  decisions_review: number;
  decisions_upgrade: number;
}

export interface UsageResponse {
  client_id: string;
  start_date: string;
  end_date: string;
  total_evaluate_calls: number;
  total_customer_calls: number;
  total_calls: number;
  total_allow: number;
  total_block: number;
  total_review: number;
  total_upgrade: number;
  daily_breakdown: UsageDayItem[];
}

// ─── Health ─────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}

// ─── Query Parameter Types ──────────────────────────────────────────────────

export interface ListCustomersParams {
  client_id?: string;
  page?: number;
  page_size?: number;
  entity_type?: EntityType;
  tier?: string;
  search?: string;
}

export interface GetCustomerParams {
  external_id: string;
  client_id: string;
}

export interface GetDecisionHistoryParams {
  client_id?: string;
  customer_external_id?: string;
  event_type?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export interface GetDecisionStatisticsParams {
  client_id?: string;
  period?: string;
}

export interface GetDecisionParams {
  decision_id: string;
  client_id: string;
}

export interface ReportVerificationParams {
  external_id: string;
  body: VerificationCompleteRequest;
}

export interface GetUsageParams {
  client_id?: string;
  start_date?: string;
  end_date?: string;
}

// ─── Transaction Check Types ────────────────────────────────────────────────

export interface CheckTransactionRequest {
  client_id: string;
  amount: number;
  currency?: string;
  update_usage?: boolean;
}

export interface CheckTransactionResponse {
  allowed: boolean;
  reason: string | null;
  current_tier: string;
  daily_limit: number;
  monthly_limit: number;
  per_transaction_limit: number;
  daily_usage: number;
  monthly_usage: number;
  daily_remaining: number;
  monthly_remaining: number;
}

// ─── Audit Log Types ───────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  actor_client_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface GetAuditLogsParams {
  action?: string;
  resource_type?: string;
  page?: number;
  page_size?: number;
}

// ─── Decision Override Types ─────────────────────────────────────────────

export interface DecisionOverrideRequest {
  new_action: string;
  reason: string;
}

export interface DecisionOverrideResponse {
  status: string;
  decision_id: string;
  old_action: string;
  new_action: string;
  reason: string;
}

// ─── Customer Manual Action Types ────────────────────────────────────────

export interface UpdateCustomerRequest {
  risk_score?: number;
  risk_level?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}

export interface FreezeCustomerRequest {
  reason: string;
}

// ─── Bulk Import Types ───────────────────────────────────────────────────

export interface BulkImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

// ─── Team Member Types ───────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  client_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  mfa_enabled: boolean;
  invite_accepted: boolean;
  created_at: string;
}

export interface InviteUserRequest {
  email: string;
  name: string;
  role: string;
}

// ─── MFA Types ───────────────────────────────────────────────────────────

export interface MfaSetupResponse {
  secret: string;
  provisioning_uri: string;
  qr_code_base64?: string;
  message: string;
}

export interface MfaStatusResponse {
  mfa_enabled: boolean;
  mfa_required: boolean;
}

// ─── Case Management Types ────────────────────────────────────────────────

export interface CaseListItem {
  decision_id: string;
  customer_id: string;
  customer_external_id: string | null;
  customer_tier: string | null;
  entity_type: string | null;
  client_id: string;
  action: string;
  workflow: string | null;
  risk_level: string;
  risk_score: number;
  reason: string;
  resolution_status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  note_count: number;
  created_at: string;
}

export interface CaseListResponse {
  items: CaseListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CaseDetail {
  decision_id: string;
  event_id: string;
  customer_id: string;
  customer_external_id: string | null;
  customer_tier: string | null;
  customer_risk_level: string | null;
  customer_risk_score: number | null;
  customer_entity_type: string | null;
  customer_created_at: string | null;
  client_id: string;
  action: string;
  workflow: string | null;
  risk_level: string;
  risk_score: number;
  customer_tier_at_decision: string;
  target_tier: string | null;
  triggered_rules: TriggeredRule[];
  reason: string;
  details: Record<string, unknown>;
  processing_time_ms: number;
  resolution_status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  notes: CaseNoteItem[];
}

export interface CaseNoteItem {
  id: string;
  author_email: string;
  author_role: string | null;
  note_type: string;
  content: string;
  created_at: string;
}

export interface CaseSummary {
  total_open: number;
  total_resolved: number;
  total_escalated: number;
  open_by_action: Record<string, number>;
}

export interface ListCasesParams {
  resolution_status?: string;
  action?: string;
  risk_level?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ResolveCaseRequest {
  resolution_status: string;
  resolution_note: string;
  new_action?: string;
}

export interface ResolveCaseResponse {
  status: string;
  decision_id: string;
  resolution_status: string;
  resolved_by: string;
  resolved_at: string;
  action: string;
}

// ─── Workflow Builder Types ───────────────────────────────────────────────

export interface WorkflowStepItem {
  id: string;
  step_order: number;
  name: string;
  step_type: string;
  description: string | null;
  is_required: boolean;
  timeout_hours: number | null;
  config: Record<string, unknown> | null;
}

export interface WorkflowListItem {
  id: string;
  code: string;
  name: string;
  entity_type: string;
  target_tier: string | null;
  estimated_time: string | null;
  status: string;
  is_system: boolean;
  step_count: number;
  created_at: string;
}

export interface WorkflowListResponse {
  items: WorkflowListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface WorkflowDetail {
  id: string;
  client_id: string;
  code: string;
  name: string;
  description: string | null;
  entity_type: string;
  target_tier: string | null;
  estimated_time: string | null;
  status: string;
  is_system: boolean;
  version: number;
  step_count: number;
  steps: WorkflowStepItem[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowCreateRequest {
  code: string;
  name: string;
  description?: string;
  entity_type: EntityType;
  target_tier?: string;
  estimated_time?: string;
  steps?: Array<{
    name: string;
    step_type: string;
    description?: string;
    is_required?: boolean;
    timeout_hours?: number;
    config?: Record<string, unknown>;
  }>;
}

export interface WorkflowUpdateRequest {
  name?: string;
  description?: string;
  target_tier?: string;
  estimated_time?: string;
}

export interface ListWorkflowsParams {
  entity_type?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// ─── Compliance Types ──────────────────────────────────────────────────────

export interface ComplianceSummary {
  period_start: string;
  period_end: string;
  client_id: string;
  total_decisions: number;
  decisions_by_action: Record<string, number>;
  decisions_by_risk: Record<string, number>;
  high_risk_customers: number;
  tier_distribution: Record<string, number>;
  flagged_decisions: number;
  average_risk_score: number;
  generated_at: string;
}
