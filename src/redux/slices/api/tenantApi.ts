import { baseApi } from "./baseApi";
import type { TenantInfo } from "@/types/api";

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getTenantInfo: b.query<TenantInfo, void>({
      query: () => "/tenant/info",
      providesTags: [{ type: "TenantInfo", id: "CURRENT" }],
    }),
  }),
});

export const { useGetTenantInfoQuery } = tenantApi;
