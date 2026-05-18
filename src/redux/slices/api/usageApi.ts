import { baseApi } from "./baseApi";
import type { UsageResponse, GetUsageParams } from "@/types/api";

export const usageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsage: builder.query<UsageResponse, GetUsageParams>({
      query: ({ client_id, start_date, end_date }) => {
        const params = new URLSearchParams();
        if (client_id) params.set("client_id", client_id);
        if (start_date) params.set("start_date", start_date);
        if (end_date) params.set("end_date", end_date);
        return `/usage/?${params.toString()}`;
      },
      providesTags: [{ type: "Usage", id: "LIST" }],
    }),
  }),
});

export const { useGetUsageQuery } = usageApi;
