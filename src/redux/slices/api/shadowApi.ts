import { baseApi } from "./baseApi";
import type { ShadowStats, ShadowComparisonRecord } from "@/types/api";

export const shadowApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getShadowStats: b.query<ShadowStats, { window_days?: number }>({
      query: (params) => ({ url: "/shadow/stats", params }),
      providesTags: [{ type: "ShadowStats", id: "CURRENT" }],
    }),
    getRecentShadowComparisons: b.query<ShadowComparisonRecord[], { limit?: number }>({
      query: (params) => ({ url: "/shadow/recent", params }),
    }),
  }),
});

export const { useGetShadowStatsQuery, useGetRecentShadowComparisonsQuery } = shadowApi;
