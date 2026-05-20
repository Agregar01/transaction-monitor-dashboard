import { baseApi } from "./baseApi";
import type {
  Paginated,
  Case,
  CaseStatus,
  CaseType,
  CasePriority,
  CaseStatusHistoryEntry,
  CaseAlertLink,
  MutationResponse,
} from "@/types/api";

export interface ListCasesParams {
  page?: number;
  page_size?: number;
  status?: CaseStatus | CaseStatus[];
  case_type?: CaseType;
  assigned_to?: string;
  jurisdiction_id?: string;
  priority?: CasePriority;
}

export const casesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listCases: b.query<Paginated<Case>, ListCasesParams>({
      query: (params) => ({ url: "/cases", params }),
      providesTags: (result) => [
        { type: "Case", id: "LIST" },
        ...(result?.items ?? []).map((c) => ({ type: "Case" as const, id: c.id })),
      ],
    }),
    getCase: b.query<Case, string>({
      query: (id) => `/cases/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Case", id }],
    }),
    createCase: b.mutation<Case, { case_type: CaseType; title: string; priority: CasePriority; jurisdiction_id: string }>({
      query: (body) => ({ url: "/cases", method: "POST", body }),
      invalidatesTags: [{ type: "Case", id: "LIST" }],
    }),
    updateCase: b.mutation<
      Case,
      { id: string; to_status: CaseStatus; assigned_to?: string; narrative?: string; resolution?: string; notes?: string }
    >({
      // Backend exposes status transitions at /cases/{id}/status — there is no
      // generic `PATCH /cases/{id}`. SAR_FILED transitions must use the
      // /sar-filing endpoint (handled separately below).
      query: ({ id, ...body }) => ({ url: `/cases/${id}/status`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Case", id },
        { type: "CaseHistory", id },
        { type: "Case", id: "LIST" },
      ],
    }),
    requestSarFiling: b.mutation<MutationResponse, { case_id: string }>({
      query: ({ case_id }) => ({ url: `/cases/${case_id}/sar-filing`, method: "POST" }),
      invalidatesTags: (_r, _e, { case_id }) => [
        { type: "Case", id: case_id },
        { type: "Approval", id: "LIST" },
      ],
    }),
    linkAlertToCase: b.mutation<MutationResponse, { case_id: string; alert_id: string }>({
      query: ({ case_id, alert_id }) => ({
        url: `/cases/${case_id}/alerts`,
        method: "POST",
        body: { alert_id },
      }),
      invalidatesTags: (_r, _e, { case_id }) => [
        { type: "Case", id: case_id },
        { type: "CaseHistory", id: case_id },
      ],
    }),
    getCaseAlerts: b.query<CaseAlertLink[], string>({
      query: (case_id) => `/cases/${case_id}/alerts`,
    }),
    getCaseHistory: b.query<CaseStatusHistoryEntry[], string>({
      query: (case_id) => `/cases/${case_id}/history`,
      providesTags: (_r, _e, id) => [{ type: "CaseHistory", id }],
    }),
  }),
});

export const {
  useListCasesQuery,
  useGetCaseQuery,
  useCreateCaseMutation,
  useUpdateCaseMutation,
  useRequestSarFilingMutation,
  useLinkAlertToCaseMutation,
  useGetCaseAlertsQuery,
  useGetCaseHistoryQuery,
} = casesApi;
