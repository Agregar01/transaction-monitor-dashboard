import { baseApi } from "./baseApi";
import type { Paginated, STRReport, STRStatus, MutationResponse } from "@/types/api";

export interface ListSTRParams {
  page?: number;
  page_size?: number;
  status?: STRStatus;
  jurisdiction_id?: string;
}

export interface CreateSTRPayload {
  case_id: string;
  subject_customer_id: string;
  subject_name: string;
  suspicious_activity_type: string;
  total_amount: number;
  currency: string;
  narrative: string;
  jurisdiction_id: string;
  reporting_entity?: string;
  transaction_count?: number;
  date_range_start?: string;
  date_range_end?: string;
}

export const strApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listSTR: b.query<Paginated<STRReport>, ListSTRParams>({
      query: (params) => ({ url: "/str-reports", params }),
      providesTags: (result) => [
        { type: "STRReport", id: "LIST" },
        ...(result?.items ?? []).map((r) => ({ type: "STRReport" as const, id: r.id })),
      ],
    }),
    getSTR: b.query<STRReport, string>({
      query: (id) => `/str-reports/${id}`,
      providesTags: (_r, _e, id) => [{ type: "STRReport", id }],
    }),
    createSTR: b.mutation<STRReport, CreateSTRPayload>({
      query: (body) => ({ url: "/str-reports", method: "POST", body }),
      invalidatesTags: [{ type: "STRReport", id: "LIST" }],
    }),
    updateSTR: b.mutation<STRReport, Partial<CreateSTRPayload> & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/str-reports/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "STRReport", id },
        { type: "STRReport", id: "LIST" },
      ],
    }),
    fileSTR: b.mutation<
      MutationResponse | { approval_id: string; expires_at: string },
      { id: string }
    >({
      query: ({ id }) => ({ url: `/str-reports/${id}/file`, method: "POST" }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "STRReport", id },
        { type: "STRReport", id: "LIST" },
        { type: "Approval", id: "LIST" },
        "Analytics",
      ],
    }),
  }),
});

export const {
  useListSTRQuery,
  useGetSTRQuery,
  useCreateSTRMutation,
  useUpdateSTRMutation,
  useFileSTRMutation,
} = strApi;

/** Helper to download the goAML XML for a filed STR. */
export const strXmlUrl = (id: string) => `/api/proxy/api/v1/str-reports/${id}/xml`;
