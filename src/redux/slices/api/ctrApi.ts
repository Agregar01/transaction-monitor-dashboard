import { baseApi } from "./baseApi";
import type { Paginated, CTRReport, CTRStatus, MutationResponse } from "@/types/api";

export interface ListCTRParams {
  page?: number;
  page_size?: number;
  status?: CTRStatus;
  jurisdiction_id?: string;
}

export const ctrApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listCTR: b.query<Paginated<CTRReport>, ListCTRParams>({
      query: (params) => ({ url: "/ctr-reports", params }),
      providesTags: (result) => [
        { type: "CTRReport", id: "LIST" },
        ...(result?.items ?? []).map((r) => ({ type: "CTRReport" as const, id: r.id })),
      ],
    }),
    getCTR: b.query<CTRReport, string>({
      query: (id) => `/ctr-reports/${id}`,
      providesTags: (_r, _e, id) => [{ type: "CTRReport", id }],
    }),
    fileCTR: b.mutation<MutationResponse, { id: string }>({
      query: ({ id }) => ({ url: `/ctr-reports/${id}/file`, method: "POST" }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "CTRReport", id },
        { type: "CTRReport", id: "LIST" },
        "Analytics",
      ],
    }),
    exemptCTR: b.mutation<
      MutationResponse | { approval_id: string },
      { id: string; reason: string }
    >({
      query: ({ id, ...body }) => ({ url: `/ctr-reports/${id}/exempt`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "CTRReport", id },
        { type: "CTRReport", id: "LIST" },
        { type: "Approval", id: "LIST" },
        "Analytics",
      ],
    }),
  }),
});

export const {
  useListCTRQuery,
  useGetCTRQuery,
  useFileCTRMutation,
  useExemptCTRMutation,
} = ctrApi;

export const ctrXmlUrl = (id: string) => `/api/proxy/api/v1/ctr-reports/${id}/xml`;
