import { baseApi } from "./baseApi";
import type {
  DsarRequest,
  DsarRequestList,
  DsarType,
  DsarExport,
  PrivacyStatus,
  ErasureResponse,
} from "@/types/api";

export interface ListDsarParams {
  status?: string;
  page?: number;
  page_size?: number;
}

export const privacyApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getPrivacyStatus: b.query<PrivacyStatus, void>({
      query: () => "/privacy/status",
      providesTags: [{ type: "Dsar", id: "STATUS" }],
    }),

    listDsarRequests: b.query<DsarRequestList, ListDsarParams>({
      query: (params) => ({ url: "/privacy/requests", params }),
      providesTags: (result) => [
        { type: "Dsar", id: "LIST" },
        ...(result?.items ?? []).map((r) => ({ type: "Dsar" as const, id: r.id })),
      ],
    }),

    createDsarRequest: b.mutation<
      DsarRequest,
      { customer_id: string; request_type: DsarType; notes?: string }
    >({
      query: (body) => ({ url: "/privacy/requests", method: "POST", body }),
      invalidatesTags: [{ type: "Dsar", id: "LIST" }],
    }),

    completeDsarRequest: b.mutation<DsarRequest, { id: string }>({
      query: ({ id }) => ({ url: `/privacy/requests/${id}/complete`, method: "POST" }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Dsar", id },
        { type: "Dsar", id: "LIST" },
      ],
    }),

    rejectDsarRequest: b.mutation<DsarRequest, { id: string; notes?: string }>({
      // Backend takes `notes` as a query param, not a body.
      query: ({ id, notes }) => ({
        url: `/privacy/requests/${id}/reject`,
        method: "POST",
        params: notes ? { notes } : undefined,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Dsar", id },
        { type: "Dsar", id: "LIST" },
      ],
    }),

    // On-demand PII export — lazy query so it only fires on the export click.
    exportCustomerData: b.query<DsarExport, { customer_id: string }>({
      query: ({ customer_id }) => `/privacy/dsar/${customer_id}`,
    }),

    // 202 + approval_id: erasure routes through four-eyes approval, so this
    // also invalidates the Approval list so the pending item shows up there.
    requestErasure: b.mutation<ErasureResponse, { customer_id: string }>({
      query: ({ customer_id }) => ({
        url: `/privacy/erasure/${customer_id}`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "Dsar", id: "LIST" },
        { type: "Approval", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPrivacyStatusQuery,
  useListDsarRequestsQuery,
  useCreateDsarRequestMutation,
  useCompleteDsarRequestMutation,
  useRejectDsarRequestMutation,
  useLazyExportCustomerDataQuery,
  useRequestErasureMutation,
} = privacyApi;
