import { baseApi } from "./baseApi";
import type { HealthSummary, DetailedHealth, SystemMetrics } from "@/types/api";

export const healthApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getHealth: b.query<HealthSummary, void>({
      query: () => "/health/",
      providesTags: [{ type: "Health", id: "BASIC" }],
    }),
    getDetailedHealth: b.query<DetailedHealth, void>({
      query: () => "/health/detailed",
      providesTags: [{ type: "Health", id: "DETAILED" }],
    }),
    getSystemMetrics: b.query<SystemMetrics, void>({
      query: () => "/health/metrics",
      providesTags: [{ type: "Metrics", id: "CURRENT" }],
    }),
  }),
});

export const {
  useGetHealthQuery,
  useGetDetailedHealthQuery,
  useGetSystemMetricsQuery,
} = healthApi;
