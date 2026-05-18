import { baseApi } from "./baseApi";
import type { ScreenNameResult, SanctionsStatus } from "@/types/api";

export interface ScreenNameRequest {
  name: string;
  nationality?: string;
  id_number?: string;
  limit_lists?: string[];
}

export const sanctionsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    screenName: b.mutation<ScreenNameResult, ScreenNameRequest>({
      query: (body) => ({ url: "/sanctions/screen", method: "POST", body }),
    }),
    screenBatch: b.mutation<ScreenNameResult[], { names: ScreenNameRequest[] }>({
      query: (body) => ({ url: "/sanctions/screen/batch", method: "POST", body }),
    }),
    getSanctionsStatus: b.query<SanctionsStatus, void>({
      query: () => "/sanctions/status",
      providesTags: [{ type: "Sanctions", id: "STATUS" }],
    }),
  }),
});

export const {
  useScreenNameMutation,
  useScreenBatchMutation,
  useGetSanctionsStatusQuery,
} = sanctionsApi;
