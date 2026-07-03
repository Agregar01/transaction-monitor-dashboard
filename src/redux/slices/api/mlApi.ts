import { baseApi } from "./baseApi";
import type { Paginated, ModelRegistryEntry, DriftReport } from "@/types/api";

export interface ListModelsParams {
  page?: number;
  page_size?: number;
  model_type?: string;
  status?: string;
}

export interface ListDriftParams {
  page?: number;
  page_size?: number;
  days?: number;
  drifted_only?: boolean;
}

export interface ExecutiveReportResult {
  status: "sent" | "failed" | "skipped";
  recipients?: string[];
  period_days: number;
  transactions?: number;
  flagged?: number;
  flag_rate?: number;
  str_count?: number;
  drift_status?: string;
  reason?: string;
}

export const mlApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    triggerExecutiveReport: b.mutation<ExecutiveReportResult, { period_days?: number }>({
      query: ({ period_days = 30 }) => ({
        url: "/reports/executive/trigger",
        method: "POST",
        params: { period_days },
      }),
    }),
    listModels: b.query<Paginated<ModelRegistryEntry>, ListModelsParams>({
      query: (params) => ({ url: "/models", params }),
      providesTags: [{ type: "ModelRegistry", id: "LIST" }],
    }),
    listChampions: b.query<ModelRegistryEntry[], void>({
      query: () => "/models/champions",
      providesTags: [{ type: "ModelRegistry", id: "CHAMPIONS" }],
    }),
    getModel: b.query<ModelRegistryEntry, string>({
      query: (id) => `/models/${id}`,
      providesTags: (_r, _e, id) => [{ type: "ModelRegistry", id }],
    }),
    listDrift: b.query<Paginated<DriftReport>, ListDriftParams>({
      query: (params) => ({ url: "/drift", params }),
      providesTags: [{ type: "DriftDetection", id: "LIST" }],
    }),
    getLatestDrift: b.query<DriftReport | null, void>({
      query: () => "/drift/latest",
      providesTags: [{ type: "DriftDetection", id: "LATEST" }],
    }),
    getDriftReport: b.query<DriftReport, string>({
      query: (id) => `/drift/${id}`,
      providesTags: (_r, _e, id) => [{ type: "DriftDetection", id }],
    }),
  }),
});

export const {
  useTriggerExecutiveReportMutation,
  useListModelsQuery,
  useListChampionsQuery,
  useGetModelQuery,
  useListDriftQuery,
  useGetLatestDriftQuery,
  useGetDriftReportQuery,
} = mlApi;
