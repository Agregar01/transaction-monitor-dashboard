import { baseApi } from "./baseApi";
import type { AuditLogListResponse, GetAuditLogsParams } from "@/types/api";

export const auditLogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogListResponse, GetAuditLogsParams>({
      query: ({ action, resource_type, page = 1, page_size = 50 }) => {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(page_size),
        });
        if (action) params.set("action", action);
        if (resource_type) params.set("resource_type", resource_type);
        return `/audit-trail/?${params.toString()}`;
      },
      providesTags: [{ type: "AuditLog", id: "LIST" }],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditLogsApi;
