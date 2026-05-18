import { baseApi } from "./baseApi";
import type {
  CaseListResponse,
  CaseDetail,
  CaseSummary,
  ListCasesParams,
  ResolveCaseRequest,
  ResolveCaseResponse,
} from "@/types/api";

export const casesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCases: builder.query<CaseListResponse, ListCasesParams>({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params.resolution_status) qs.set("resolution_status", params.resolution_status);
        if (params.action) qs.set("action", params.action);
        if (params.risk_level) qs.set("risk_level", params.risk_level);
        if (params.from_date) qs.set("from_date", params.from_date);
        if (params.to_date) qs.set("to_date", params.to_date);
        if (params.search) qs.set("search", params.search);
        if (params.page) qs.set("page", String(params.page));
        if (params.page_size) qs.set("page_size", String(params.page_size));
        return `/cases/?${qs.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ decision_id }) => ({
                type: "Case" as const,
                id: decision_id,
              })),
              { type: "Case", id: "LIST" },
            ]
          : [{ type: "Case", id: "LIST" }],
    }),

    getCaseSummary: builder.query<CaseSummary, void>({
      query: () => "/cases/summary/",
      providesTags: [{ type: "Case", id: "SUMMARY" }],
    }),

    getCaseDetail: builder.query<CaseDetail, string>({
      query: (decision_id) => `/cases/${decision_id}/`,
      providesTags: (_result, _error, decision_id) => [
        { type: "Case", id: decision_id },
      ],
    }),

    resolveCase: builder.mutation<
      ResolveCaseResponse,
      { decision_id: string } & ResolveCaseRequest
    >({
      query: ({ decision_id, ...body }) => ({
        url: `/cases/${decision_id}/resolve/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { decision_id }) => [
        { type: "Case", id: decision_id },
        { type: "Case", id: "LIST" },
        { type: "Case", id: "SUMMARY" },
        { type: "Decision", id: decision_id },
      ],
    }),
  }),
});

export const {
  useListCasesQuery,
  useGetCaseSummaryQuery,
  useGetCaseDetailQuery,
  useResolveCaseMutation,
} = casesApi;
