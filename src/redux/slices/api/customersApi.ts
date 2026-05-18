import { baseApi } from "./baseApi";
import type {
  CustomerListResponse,
  CustomerDetail,
  CustomerTierInfo,
  CustomerTierHistory,
  CustomerRegisterRequest,
  CustomerRegisterResponse,
  VerificationCompleteResponse,
  ListCustomersParams,
  GetCustomerParams,
  ReportVerificationParams,
  CheckTransactionRequest,
  CheckTransactionResponse,
} from "@/types/api";

export const customersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCustomers: builder.query<CustomerListResponse, ListCustomersParams>({
      query: ({ client_id, page = 1, page_size = 20, entity_type, tier, search }) => {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(page_size),
        });
        if (client_id) params.set("client_id", client_id);
        if (entity_type) params.set("entity_type", entity_type);
        if (tier) params.set("tier", tier);
        if (search) params.set("search", search);
        return `/customers/?${params.toString()}`;
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({
                type: "Customer" as const,
                id,
              })),
              { type: "Customer", id: "LIST" },
            ]
          : [{ type: "Customer", id: "LIST" }],
    }),

    getCustomer: builder.query<CustomerDetail, GetCustomerParams>({
      query: ({ external_id, client_id }) =>
        `/customers/${external_id}/?client_id=${client_id}`,
      providesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
      ],
    }),

    getCustomerTier: builder.query<CustomerTierInfo, GetCustomerParams>({
      query: ({ external_id, client_id }) =>
        `/customers/${external_id}/tier/?client_id=${client_id}`,
      providesTags: (_result, _error, { external_id }) => [
        { type: "CustomerTier", id: external_id },
      ],
    }),

    getCustomerHistory: builder.query<CustomerTierHistory, GetCustomerParams>({
      query: ({ external_id, client_id }) =>
        `/customers/${external_id}/history/?client_id=${client_id}`,
      providesTags: (_result, _error, { external_id }) => [
        { type: "TierHistory", id: external_id },
      ],
    }),

    registerCustomer: builder.mutation<
      CustomerRegisterResponse,
      CustomerRegisterRequest
    >({
      query: (body) => ({
        url: "/customers/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
    }),

    reportVerification: builder.mutation<
      VerificationCompleteResponse,
      ReportVerificationParams
    >({
      query: ({ external_id, body }) => ({
        url: `/customers/${external_id}/verification-complete/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
        { type: "CustomerTier", id: external_id },
        { type: "TierHistory", id: external_id },
      ],
    }),
    requestUpgrade: builder.mutation<
      { status: string; from_tier: string; to_tier: string; required_workflow: string | null; message: string },
      { external_id: string; client_id: string; target_tier: string; reason: string }
    >({
      query: ({ external_id, client_id, target_tier, reason }) => ({
        url: `/customers/${external_id}/upgrade/?client_id=${client_id}`,
        method: "POST",
        body: { target_tier, reason },
      }),
      invalidatesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
        { type: "CustomerTier", id: external_id },
        { type: "TierHistory", id: external_id },
      ],
    }),

    checkTransaction: builder.mutation<
      CheckTransactionResponse,
      { external_id: string } & CheckTransactionRequest
    >({
      query: ({ external_id, ...body }) => ({
        url: `/customers/${external_id}/check-transaction/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
        { type: "CustomerTier", id: external_id },
        { type: "Decision", id: "LIST" },
      ],
    }),

    updateCustomerManual: builder.mutation<
      { status: string; customer_external_id: string; changes: Record<string, unknown> },
      { external_id: string; client_id: string; body: import("@/types/api").UpdateCustomerRequest }
    >({
      query: ({ external_id, client_id, body }) => ({
        url: `/customers/${external_id}/update/?client_id=${client_id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
        { type: "CustomerTier", id: external_id },
      ],
    }),

    freezeCustomer: builder.mutation<
      { status: string; customer_external_id: string },
      { external_id: string; client_id: string; reason: string }
    >({
      query: ({ external_id, client_id, reason }) => ({
        url: `/customers/${external_id}/freeze/?client_id=${client_id}`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
        { type: "CustomerTier", id: external_id },
      ],
    }),

    unfreezeCustomer: builder.mutation<
      { status: string; customer_external_id: string },
      { external_id: string; client_id: string }
    >({
      query: ({ external_id, client_id }) => ({
        url: `/customers/${external_id}/unfreeze/?client_id=${client_id}`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
        { type: "CustomerTier", id: external_id },
      ],
    }),

    bulkImportCustomers: builder.mutation<
      import("@/types/api").BulkImportResult,
      { client_id: string; file: File }
    >({
      query: ({ client_id, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/customers/bulk-import/?client_id=${client_id}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
    }),

    getVerificationChecklist: builder.query<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      { external_id: string; client_id: string }
    >({
      query: ({ external_id, client_id }) =>
        `/customers/${external_id}/verification-checklist/?client_id=${client_id}`,
      providesTags: (_result, _error, { external_id }) => [
        { type: "Customer", id: external_id },
      ],
    }),

    listCaseNotes: builder.query<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any[],
      { external_id: string; client_id: string; note_type?: string }
    >({
      query: ({ external_id, client_id, note_type }) => {
        const params = new URLSearchParams();
        if (client_id) params.append("client_id", client_id);
        if (note_type) params.append("note_type", note_type);
        return `/case-notes/${external_id}/notes?${params.toString()}`;
      },
      providesTags: (_result, _error, { external_id }) => [
        { type: "CaseNote" as const, id: external_id },
      ],
    }),

    createCaseNote: builder.mutation<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      {
        external_id: string;
        content: string;
        note_type?: string;
        decision_id?: string;
        is_internal?: boolean;
      }
    >({
      query: ({ external_id, ...body }) => ({
        url: `/case-notes/${external_id}/notes`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { external_id }) => [
        { type: "CaseNote" as const, id: external_id },
      ],
    }),
  }),
});

export const {
  useListCustomersQuery,
  useGetCustomerQuery,
  useGetCustomerTierQuery,
  useGetCustomerHistoryQuery,
  useRegisterCustomerMutation,
  useReportVerificationMutation,
  useRequestUpgradeMutation,
  useCheckTransactionMutation,
  useUpdateCustomerManualMutation,
  useFreezeCustomerMutation,
  useUnfreezeCustomerMutation,
  useBulkImportCustomersMutation,
  useGetVerificationChecklistQuery,
  useListCaseNotesQuery,
  useCreateCaseNoteMutation,
} = customersApi;
