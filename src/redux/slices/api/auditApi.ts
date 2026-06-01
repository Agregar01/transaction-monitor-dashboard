import { baseApi } from "./baseApi";
import type { AuditEntry, AuditAction } from "@/types/api";

/**
 * Backend `GET /api/v1/audit/changes` returns a bare list with limit/offset
 * pagination — no total count, no envelope. Dashboard derives "has more"
 * by checking whether the returned page is full.
 */
export interface ListAuditParams {
  resource_type?: string;
  resource_id?: string;
  changed_by?: string;
  action?: AuditAction;
  since?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listAuditChanges: b.query<AuditEntry[], ListAuditParams>({
      query: (params) => ({ url: "/audit/changes", params }),
      providesTags: [{ type: "Audit", id: "LIST" }],
    }),
  }),
});

export const { useListAuditChangesQuery } = auditApi;
