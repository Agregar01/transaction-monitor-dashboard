import { baseApi } from "./baseApi";
import type {
  CounterpartyReviewInput,
  CounterpartyVasp,
  CounterpartyVaspInput,
  CounterpartyVaspReview,
  CustomerWallet,
  CustomerWalletInput,
  CustomerWalletPatch,
  TravelRuleListParams,
  TravelRuleMI,
  TravelRuleProfile,
  TravelRuleRecordDetail,
  TravelRuleRecordList,
  TravelRuleResolution,
  TravelRuleResolveResult,
} from "@/types/api";

/**
 * Counterparty edits change verdict inputs (identity resets DD, sanctions escalation holds
 * transfers), so they also refresh the record list, every record detail and MI.
 */
export const COUNTERPARTY_MUTATION_INVALIDATES = [
  { type: "TravelRule" as const, id: "COUNTERPARTIES" },
  { type: "TravelRule" as const, id: "RECORDS" },
  { type: "TravelRule" as const, id: "RECORD_DETAIL" },
  { type: "TravelRule" as const, id: "MI" },
];

/**
 * A wallet that becomes VERIFIED makes the backend re-evaluate held records, so wallet
 * mutations refresh the wallet lists, the record list, record details and MI.
 */
export const WALLET_MUTATION_INVALIDATES = [
  { type: "TravelRule" as const, id: "WALLETS" },
  { type: "TravelRule" as const, id: "RECORDS" },
  { type: "TravelRule" as const, id: "RECORD_DETAIL" },
  { type: "TravelRule" as const, id: "MI" },
];

/** Virtual asset Travel Rule: records, counterparty register, wallets, profiles, MI. */
export const travelRuleApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listTravelRuleRecords: b.query<TravelRuleRecordList, TravelRuleListParams>({
      query: (params) => ({ url: "/travel-rule/records", params }),
      providesTags: [{ type: "TravelRule", id: "RECORDS" }],
    }),
    getTravelRuleRecord: b.query<TravelRuleRecordDetail, string>({
      query: (id) => `/travel-rule/records/${encodeURIComponent(id)}`,
      providesTags: (_r, _e, id) => [
        { type: "TravelRule", id },
        { type: "TravelRule", id: "RECORD_DETAIL" },
      ],
    }),
    resolveTravelRuleRecord: b.mutation<
      TravelRuleResolveResult,
      { id: string; resolution: TravelRuleResolution; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/travel-rule/records/${encodeURIComponent(id)}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "TravelRule", id },
        { type: "TravelRule", id: "RECORDS" },
        { type: "TravelRule", id: "MI" },
        { type: "Approval" },
        // TravelRulePanel reads the summary from the transaction and alert detail.
        "Transaction",
        "Alert",
      ],
    }),
    getTravelRuleMI: b.query<TravelRuleMI, { from?: string; to?: string } | void>({
      query: (params) => ({ url: "/travel-rule/mi", params: params ?? undefined }),
      providesTags: [{ type: "TravelRule", id: "MI" }],
    }),
    listCounterparties: b.query<CounterpartyVasp[], { dd_status?: string; q?: string } | void>({
      query: (params) => ({ url: "/travel-rule/counterparties", params: params ?? undefined }),
      providesTags: [{ type: "TravelRule", id: "COUNTERPARTIES" }],
    }),
    getCounterparty: b.query<CounterpartyVasp, string>({
      query: (id) => `/travel-rule/counterparties/${encodeURIComponent(id)}`,
      providesTags: (_r, _e, id) => [{ type: "TravelRule", id: `CP-${id}` }],
    }),
    createCounterparty: b.mutation<CounterpartyVasp, CounterpartyVaspInput & { legal_name: string }>({
      query: (body) => ({ url: "/travel-rule/counterparties", method: "POST", body }),
      invalidatesTags: COUNTERPARTY_MUTATION_INVALIDATES,
    }),
    updateCounterparty: b.mutation<CounterpartyVasp, { id: string } & CounterpartyVaspInput>({
      query: ({ id, ...body }) => ({
        url: `/travel-rule/counterparties/${encodeURIComponent(id)}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "TravelRule", id: `CP-${id}` }, ...COUNTERPARTY_MUTATION_INVALIDATES],
    }),
    createCounterpartyReview: b.mutation<CounterpartyVaspReview, { id: string } & CounterpartyReviewInput>({
      query: ({ id, ...body }) => ({
        url: `/travel-rule/counterparties/${encodeURIComponent(id)}/reviews`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "TravelRule", id: `CP-${id}` },
        { type: "TravelRule", id: "COUNTERPARTIES" },
        { type: "Approval" },
      ],
    }),
    listCustomerWallets: b.query<CustomerWallet[], string>({
      query: (customerId) => ({ url: "/travel-rule/wallets", params: { customer_id: customerId } }),
      providesTags: (_r, _e, customerId) => [
        { type: "TravelRule", id: "WALLETS" },
        { type: "TravelRule", id: `WALLETS-${customerId}` },
      ],
    }),
    createCustomerWallet: b.mutation<CustomerWallet, CustomerWalletInput>({
      query: (body) => ({ url: "/travel-rule/wallets", method: "POST", body }),
      invalidatesTags: WALLET_MUTATION_INVALIDATES,
    }),
    updateCustomerWallet: b.mutation<CustomerWallet, { id: string } & CustomerWalletPatch>({
      query: ({ id, ...body }) => ({
        url: `/travel-rule/wallets/${encodeURIComponent(id)}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: WALLET_MUTATION_INVALIDATES,
    }),
    listTravelRuleProfiles: b.query<TravelRuleProfile[], void>({
      query: () => "/travel-rule/profiles",
      providesTags: [{ type: "TravelRule", id: "PROFILES" }],
    }),
    requestProfileVersion: b.mutation<
      { approval_id: string; status: string },
      { code: string; changes: Record<string, unknown> }
    >({
      query: ({ code, changes }) => ({
        url: `/travel-rule/profiles/${encodeURIComponent(code)}`,
        method: "POST",
        body: { changes },
      }),
      invalidatesTags: [{ type: "Approval" }],
    }),
  }),
});

export const {
  useListTravelRuleRecordsQuery,
  useGetTravelRuleRecordQuery,
  useResolveTravelRuleRecordMutation,
  useGetTravelRuleMIQuery,
  useListCounterpartiesQuery,
  useGetCounterpartyQuery,
  useCreateCounterpartyMutation,
  useUpdateCounterpartyMutation,
  useCreateCounterpartyReviewMutation,
  useListCustomerWalletsQuery,
  useCreateCustomerWalletMutation,
  useUpdateCustomerWalletMutation,
  useListTravelRuleProfilesQuery,
  useRequestProfileVersionMutation,
} = travelRuleApi;
