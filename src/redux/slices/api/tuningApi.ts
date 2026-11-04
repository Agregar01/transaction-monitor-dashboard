import { baseApi } from "./baseApi";
import type {
  BtlDisposition,
  BtlReport,
  BtlSample,
  BtlSampleStatus,
  MutationResponse,
} from "@/types/api";

export const tuningApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listBtlSamples: b.query<BtlSample[], { sample_status?: BtlSampleStatus }>({
      query: (params) => ({ url: "/tuning/btl/samples", params }),
      providesTags: (result) => [
        { type: "BtlSample", id: "LIST" },
        ...(result ?? []).map((s) => ({ type: "BtlSample" as const, id: s.id })),
      ],
    }),
    reviewBtlSample: b.mutation<
      MutationResponse,
      { id: string; disposition: BtlDisposition; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/tuning/btl/samples/${id}/review`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "BtlSample", id },
        { type: "BtlSample", id: "LIST" },
        "BtlReport",
      ],
    }),
    getBtlReport: b.query<BtlReport, void>({
      query: () => "/tuning/btl/report",
      providesTags: ["BtlReport"],
    }),
    runBtlSampling: b.mutation<
      MutationResponse,
      { margin?: number; lookback_days?: number; limit?: number }
    >({
      query: (body) => ({ url: "/tuning/btl/sample", method: "POST", body }),
      invalidatesTags: [{ type: "BtlSample", id: "LIST" }, "BtlReport"],
    }),
  }),
});

export const {
  useListBtlSamplesQuery,
  useReviewBtlSampleMutation,
  useGetBtlReportQuery,
  useRunBtlSamplingMutation,
} = tuningApi;
