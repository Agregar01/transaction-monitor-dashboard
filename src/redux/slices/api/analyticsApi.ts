import { baseApi } from "./baseApi";
import type {
  AnalyticsSummary,
  RuleThresholdStat,
  ClusterSummary,
  FalsePositiveRate,
  AuditChainVerification,
  InsiderThreatReport,
  GeoHeatmapData,
  BehavioralRiskSummary,
} from "@/types/api";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // All analytics derive from the same alert/case/report/rule data, so they
    // share the "Analytics" tag. Compliance mutations (resolve alert, file
    // STR/CTR, advance case, approve, toggle rule) invalidate it so the
    // dashboard summary + reports refresh instead of going stale until reload.
    getAnalyticsSummary: b.query<AnalyticsSummary, { period_days?: number }>({
      query: (params) => ({ url: "/analytics/summary", params }),
      providesTags: ["Analytics"],
    }),
    getRuleThresholdStats: b.query<RuleThresholdStat[], { period_days?: number }>({
      query: (params) => ({ url: "/analytics/rule-threshold-stats", params }),
      providesTags: ["Analytics"],
    }),
    getTransactionClusters: b.query<ClusterSummary, { run_date?: string }>({
      query: (params) => ({ url: "/analytics/clusters", params }),
      providesTags: ["Analytics"],
    }),
    getFalsePositiveRates: b.query<FalsePositiveRate[], { limit?: number }>({
      query: (params) => ({ url: "/analytics/false-positive-rates", params }),
      providesTags: ["Analytics"],
    }),
    verifyAuditChain: b.query<AuditChainVerification, { limit?: number }>({
      query: (params) => ({ url: "/audit/verify-chain", params }),
      providesTags: ["Audit"],
    }),
    getInsiderThreatReport: b.query<InsiderThreatReport, { period_days?: number }>({
      query: (params) => ({ url: "/analytics/insider-threat", params }),
      providesTags: ["Analytics"],
    }),
    getGeoHeatmap: b.query<GeoHeatmapData, { period_days?: number }>({
      query: (params) => ({ url: "/analytics/geo-heatmap", params }),
      providesTags: ["Analytics"],
    }),
    getBehavioralRisk: b.query<
      BehavioralRiskSummary,
      { period_days?: number; limit?: number }
    >({
      query: (params) => ({ url: "/analytics/behavioral-risk", params }),
      providesTags: ["Analytics"],
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
  useGetGeoHeatmapQuery,
  useGetBehavioralRiskQuery,
} = analyticsApi;
