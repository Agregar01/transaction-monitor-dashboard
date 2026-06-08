import { baseApi } from "./baseApi";
import type {
  Paginated,
  Case,
  CaseStatus,
  CaseType,
  CasePriority,
  CaseStatusHistoryEntry,
  CaseAlertLink,
  CaseNote,
  CaseDeviceHistory,
  CaseTransactionChain,
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
        "Analytics",
      ],
    }),
    requestSarFiling: b.mutation<MutationResponse, { case_id: string }>({
      query: ({ case_id }) => ({ url: `/cases/${case_id}/sar-filing`, method: "POST" }),
      invalidatesTags: (_r, _e, { case_id }) => [
        { type: "Case", id: case_id },
        { type: "Approval", id: "LIST" },
        "Analytics",
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
    getCaseNotes: b.query<CaseNote[], string>({
      query: (case_id) => `/cases/${case_id}/notes`,
      providesTags: (_r, _e, id) => [{ type: "CaseNote", id }],
    }),
    addCaseNote: b.mutation<CaseNote, { case_id: string; body: string }>({
      query: ({ case_id, body }) => ({
        url: `/cases/${case_id}/notes`,
        method: "POST",
        body: { body },
      }),
      invalidatesTags: (_r, _e, { case_id }) => [{ type: "CaseNote", id: case_id }],
    }),
    deleteCaseNote: b.mutation<void, { case_id: string; note_id: string }>({
      query: ({ case_id, note_id }) => ({
        url: `/cases/${case_id}/notes/${note_id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { case_id }) => [{ type: "CaseNote", id: case_id }],
    }),
    getCaseDeviceHistory: b.query<CaseDeviceHistory, string>({
      query: (case_id) => `/cases/${case_id}/device-history`,
    }),
    getCaseTransactionChain: b.query<CaseTransactionChain, { case_id: string; depth?: number }>({
      query: ({ case_id, depth = 2 }) =>
        `/cases/${case_id}/transaction-chain?depth=${depth}`,
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
  useGetCaseNotesQuery,
  useAddCaseNoteMutation,
  useDeleteCaseNoteMutation,
  useGetCaseDeviceHistoryQuery,
  useGetCaseTransactionChainQuery,
} = casesApi;
