import { baseApi } from "./baseApi";
import type { Paginated, AuditEntry, AuditAction } from "@/types/api";

export interface ListAuditParams {
  page?: number;
  page_size?: number;
  resource_type?: string;
  resource_id?: string;
  changed_by?: string;
  action?: AuditAction;
  start_date?: string;
  end_date?: string;
}

export const auditApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listAuditChanges: b.query<Paginated<AuditEntry>, ListAuditParams>({
      query: (params) => ({ url: "/audit/changes", params }),
      providesTags: [{ type: "Audit", id: "LIST" }],
    }),
  }),
});

export const { useListAuditChangesQuery } = auditApi;
