import { baseApi } from "./baseApi";
import type {
  AnalyticsSummary,
  RuleThresholdStat,
  ClusterSummary,
  FalsePositiveRate,
  AuditChainVerification,
  InsiderThreatReport,
} from "@/types/api";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAnalyticsSummary: b.query<AnalyticsSummary, { period_days?: number }>({
      query: (params) => ({ url: "/analytics/summary", params }),
    }),
    getRuleThresholdStats: b.query<RuleThresholdStat[], { period_days?: number }>({
      query: (params) => ({ url: "/analytics/rule-threshold-stats", params }),
    }),
    getTransactionClusters: b.query<ClusterSummary, { run_date?: string }>({
      query: (params) => ({ url: "/analytics/clusters", params }),
    }),
    getFalsePositiveRates: b.query<FalsePositiveRate[], { limit?: number }>({
      query: (params) => ({ url: "/analytics/false-positive-rates", params }),
    }),
    verifyAuditChain: b.query<AuditChainVerification, { limit?: number }>({
      query: (params) => ({ url: "/audit/verify-chain", params }),
    }),
    getInsiderThreatReport: b.query<InsiderThreatReport, { period_days?: number }>({
      query: (params) => ({ url: "/analytics/insider-threat", params }),
    }),
  }),
});

export const {
  useGetAnalyticsSummaryQuery,
  useGetRuleThresholdStatsQuery,
  useGetTransactionClustersQuery,
  useGetFalsePositiveRatesQuery,
  useVerifyAuditChainQuery,
  useGetInsiderThreatReportQuery,
} = analyticsApi;
