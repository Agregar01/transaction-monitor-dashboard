import { baseApi } from "./baseApi";
import type { Jurisdiction, MutationResponse } from "@/types/api";

export const jurisdictionsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listJurisdictions: b.query<Jurisdiction[], void>({
      query: () => "/jurisdictions",
      providesTags: (result) => [
        { type: "Jurisdiction", id: "LIST" },
        ...(result ?? []).map((j) => ({ type: "Jurisdiction" as const, id: j.code })),
      ],
    }),
    getJurisdiction: b.query<Jurisdiction, string>({
      query: (code) => `/jurisdictions/${code}`,
      providesTags: (_r, _e, code) => [{ type: "Jurisdiction", id: code }],
    }),
    updateJurisdiction: b.mutation<
      MutationResponse | { approval_id: string },
      { code: string; ctr_threshold?: number; str_deadline_hours?: number; regulator_name?: string; active?: boolean }
    >({
      query: ({ code, ...body }) => ({ url: `/jurisdictions/${code}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { code }) => [
        { type: "Jurisdiction", id: code },
        { type: "Jurisdiction", id: "LIST" },
        { type: "Approval", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListJurisdictionsQuery,
  useGetJurisdictionQuery,
  useUpdateJurisdictionMutation,
} = jurisdictionsApi;
