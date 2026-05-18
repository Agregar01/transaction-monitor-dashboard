import { baseApi } from "./baseApi";
import type { ComplianceSummary } from "@/types/api";

interface GetComplianceSummaryParams {
  client_id?: string;
  start_date?: string;
  end_date?: string;
}

interface ComplianceAlert {
  decision_id: string;
  customer_id: string;
  customer_external_id?: string | null;
  customer_name?: string | null;
  customer_entity_type?: string | null;
  client_id: string;
  action: string;
  risk_level: string;
  risk_score: number;
  reason: string;
  triggered_rules: string[];
  details: Record<string, unknown>;
  created_at: string;
}

interface ComplianceAlertsResponse {
  count: number;
  items: ComplianceAlert[];
}

interface RiskDistribution {
  client_id: string;
  total_customers: number;
  average_risk_score: number;
  by_risk_level: Record<string, number>;
  by_entity_type: Record<string, number>;
  high_risk_customers: Array<{
    id: string;
    external_id: string;
    entity_type: string;
    current_tier: string;
    risk_level: string;
    risk_score: number;
    created_at: string;
  }>;
}

interface RuleAnalytics {
  client_id: string;
  period_days: number;
  total_decisions_analyzed: number;
  top_rules: Array<{
    code: string;
    count: number;
    actions: Record<string, number>;
  }>;
  by_category: Record<string, number>;
}

interface SarReport {
  report_id: string;
  generated_at: string;
  client_id: string;
  period_start: string;
  period_end: string;
  total_suspicious: number;
  items: Array<{
    decision_id: string;
    customer_id: string;
    action: string;
    risk_level: string;
    risk_score: number;
    reason: string;
    triggered_rules: string[];
    tier_at_decision: string | null;
    created_at: string | null;
  }>;
}

interface ReviewQueueItem {
  decision_id: string;
  customer_id: string;
  risk_level: string;
  risk_score: number;
  reason: string;
  created_at: string;
}

interface ReviewQueueResponse {
  count: number;
  items: ReviewQueueItem[];
}

export interface VerificationBacklogItem {
  id: string;
  external_id: string;
  entity_type: string;
  current_tier: string;
  verification_status: string;
  pending_workflow: string | null;
  pending_target_tier: string | null;
  risk_level: string;
  risk_score: number;
  days_waiting: number;
  created_at: string;
}

export interface VerificationBacklog {
  by_status: {
    none: number;
    pending: number;
    passed: number;
    failed: number;
  };
  t0_b0_total: number;
  t0_b0_by_type: Record<string, number>;
  backlog_count: number;
  backlog: VerificationBacklogItem[];
}

export const complianceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getComplianceSummary: builder.query<ComplianceSummary, GetComplianceSummaryParams>({
      query: ({ client_id, start_date, end_date }) => {
        const params = new URLSearchParams();
        if (client_id) params.set("client_id", client_id);
        if (start_date) params.set("start_date", start_date);
        if (end_date) params.set("end_date", end_date);
        return `/compliance/summary/?${params.toString()}`;
      },
    }),

    getComplianceAlerts: builder.query<ComplianceAlertsResponse, { client_id?: string; limit?: number }>({
      query: ({ client_id, limit = 50 }) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (client_id) params.set("client_id", client_id);
        return `/compliance/alerts/?${params.toString()}`;
      },
    }),

    getRiskDistribution: builder.query<RiskDistribution, { client_id?: string }>({
      query: ({ client_id }) => {
        const params = new URLSearchParams();
        if (client_id) params.set("client_id", client_id);
        return `/compliance/risk-distribution/?${params.toString()}`;
      },
    }),

    getRuleAnalytics: builder.query<RuleAnalytics, { client_id?: string; days?: number }>({
      query: ({ client_id, days = 30 }) => {
        const params = new URLSearchParams({ days: String(days) });
        if (client_id) params.set("client_id", client_id);
        return `/compliance/rule-analytics/?${params.toString()}`;
      },
    }),

    getReviewQueue: builder.query<ReviewQueueResponse, { client_id?: string; limit?: number }>({
      query: ({ client_id, limit = 50 }) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (client_id) params.set("client_id", client_id);
        return `/decisions/review-queue/?${params.toString()}`;
      },
    }),

    getHourlyStats: builder.query<{ hours: number; data: Array<{ hour: string; counts: Record<string, number> }> }, { client_id?: string; hours?: number }>({
      query: ({ client_id, hours = 24 }) => {
        const params = new URLSearchParams({ hours: String(hours) });
        if (client_id) params.set("client_id", client_id);
        return `/decisions/hourly/?${params.toString()}`;
      },
    }),

    generateSar: builder.query<SarReport, { client_id?: string; start_date?: string; end_date?: string }>({
      query: ({ client_id, start_date, end_date }) => {
        const params = new URLSearchParams();
        if (client_id) params.set("client_id", client_id);
        if (start_date) params.set("start_date", start_date);
        if (end_date) params.set("end_date", end_date);
        return `/compliance/sar/?${params.toString()}`;
      },
    }),

    getVerificationBacklog: builder.query<VerificationBacklog, { client_id?: string }>({
      query: ({ client_id }) => {
        const params = new URLSearchParams();
        if (client_id) params.set("client_id", client_id);
        return `/compliance/verification-backlog/?${params.toString()}`;
      },
    }),
  }),
});

export const {
  useGetComplianceSummaryQuery,
  useGetComplianceAlertsQuery,
  useGetRiskDistributionQuery,
  useGetRuleAnalyticsQuery,
  useGetReviewQueueQuery,
  useGetHourlyStatsQuery,
  useLazyGenerateSarQuery,
  useGetVerificationBacklogQuery,
} = complianceApi;

export type { ComplianceAlert, RiskDistribution, RuleAnalytics, ReviewQueueItem, SarReport };
