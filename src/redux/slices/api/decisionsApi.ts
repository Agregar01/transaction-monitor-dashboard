import { baseApi } from "./baseApi";
import type {
  EvaluationRequest,
  EvaluationResponse,
  DecisionDetail,
  DecisionHistoryItem,
  DecisionStatistics,
  GetDecisionHistoryParams,
  GetDecisionStatisticsParams,
  GetDecisionParams,
  DecisionOverrideRequest,
  DecisionOverrideResponse,
} from "@/types/api";

export const decisionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    evaluateDecision: builder.mutation<EvaluationResponse, EvaluationRequest>({
      query: (body) => ({
        url: "/decisions/evaluate/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Decision", id: "LIST" },
        { type: "CustomerTier", id: "LIST" },
      ],
    }),

    getDecisionHistory: builder.query<
      DecisionHistoryItem[],
      GetDecisionHistoryParams
    >({
      query: ({
        client_id,
        customer_external_id,
        event_type,
        action,
        limit = 50,
        offset = 0,
      }) => {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (client_id) params.set("client_id", client_id);
        if (customer_external_id)
          params.set("customer_external_id", customer_external_id);
        if (event_type) params.set("event_type", event_type);
        if (action) params.set("action", action);
        return `/decisions/history/?${params.toString()}`;
      },
      transformResponse: (response: DecisionHistoryItem[] | { items: DecisionHistoryItem[] } | unknown): DecisionHistoryItem[] => {
        if (Array.isArray(response)) return response;
        if (response && typeof response === "object" && "items" in response) {
          return (response as { items: DecisionHistoryItem[] }).items ?? [];
        }
        return [];
      },
      providesTags: (result) =>
        Array.isArray(result)
          ? [
              ...result.map(({ decision_id }) => ({
                type: "Decision" as const,
                id: decision_id,
              })),
              { type: "Decision", id: "LIST" },
            ]
          : [{ type: "Decision", id: "LIST" }],
    }),

    getDecisionStatistics: builder.query<
      DecisionStatistics,
      GetDecisionStatisticsParams
    >({
      query: ({ client_id, period = "30d" }) => {
        const params = new URLSearchParams({ period });
        if (client_id) params.set("client_id", client_id);
        return `/decisions/statistics/?${params.toString()}`;
      },
      providesTags: [{ type: "Decision", id: "STATS" }],
    }),

    getDecision: builder.query<DecisionDetail, GetDecisionParams>({
      query: ({ decision_id, client_id }) =>
        `/decisions/${decision_id}/?client_id=${client_id}`,
      providesTags: (_result, _error, { decision_id }) => [
        { type: "Decision", id: decision_id },
      ],
    }),

    overrideDecision: builder.mutation<DecisionOverrideResponse, { decision_id: string } & DecisionOverrideRequest>({
      query: ({ decision_id, ...body }) => ({
        url: `/decisions/${decision_id}/override/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { decision_id }) => [
        { type: "Decision", id: decision_id },
        { type: "Decision", id: "LIST" },
        { type: "AuditLog", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useEvaluateDecisionMutation,
  useGetDecisionHistoryQuery,
  useGetDecisionStatisticsQuery,
  useGetDecisionQuery,
  useOverrideDecisionMutation,
} = decisionsApi;
