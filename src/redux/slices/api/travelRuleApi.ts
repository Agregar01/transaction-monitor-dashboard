import { baseApi } from "./baseApi";
import type {
  CounterpartyReviewInput,
  CounterpartyVasp,
  CounterpartyVaspInput,
  CounterpartyVaspReview,
  TravelRuleListParams,
  TravelRuleMI,
  TravelRuleProfile,
  TravelRuleRecordDetail,
  TravelRuleRecordList,
  TravelRuleResolution,
  TravelRuleResolveResult,
} from "@/types/api";

/** Virtual asset Travel Rule: records, counterparty register, profiles, MI. */
export const travelRuleApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listTravelRuleRecords: b.query<TravelRuleRecordList, TravelRuleListParams>({
      query: (params) => ({ url: "/travel-rule/records", params }),
      providesTags: [{ type: "TravelRule", id: "RECORDS" }],
    }),
    getTravelRuleRecord: b.query<TravelRuleRecordDetail, string>({
      query: (id) => `/travel-rule/records/${encodeURIComponent(id)}`,
      providesTags: (_r, _e, id) => [{ type: "TravelRule", id }],
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
      invalidatesTags: [{ type: "TravelRule", id: "COUNTERPARTIES" }],
    }),
    updateCounterparty: b.mutation<CounterpartyVasp, { id: string } & CounterpartyVaspInput>({
      query: ({ id, ...body }) => ({
        url: `/travel-rule/counterparties/${encodeURIComponent(id)}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "TravelRule", id: `CP-${id}` },
        { type: "TravelRule", id: "COUNTERPARTIES" },
      ],
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
  useListTravelRuleProfilesQuery,
  useRequestProfileVersionMutation,
} = travelRuleApi;
