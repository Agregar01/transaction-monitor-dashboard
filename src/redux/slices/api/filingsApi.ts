import { baseApi } from "./baseApi";

/** Regulator filings store — immutable STR/CTR snapshots (CONTRACT.md §7). */

export type FilingReportType = "STR" | "CTR";

export interface FilingListItem {
  id: string;
  report_id: string;
  report_type: FilingReportType;
  jurisdiction_code: string;
  institution_id: string;
  filing_reference: string;
  filed_at: string;
  has_goaml_xml: boolean;
  created_at: string;
}

export interface FilingListResponse {
  total: number;
  page: number;
  page_size: number;
  items: FilingListItem[];
}

/** snapshot_data is the frozen report payload; STR and CTR have different shapes. */
export interface FilingDetail extends FilingListItem {
  filed_by: string | null;
  snapshot_data: Record<string, unknown>;
}

export interface FilingAnalytics {
  total_str: number;
  total_ctr: number;
  total: number;
  by_type: Record<string, number>;
  recent_30d: { STR: number; CTR: number; total: number };
  by_jurisdiction?: Record<string, number>;
}

export interface ListFilingsParams {
  report_type?: FilingReportType;
  jurisdiction_code?: string;
  filed_after?: string;
  filed_before?: string;
  page?: number;
  page_size?: number;
}

export const filingsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getFilingAnalytics: b.query<FilingAnalytics, void>({
      query: () => "/filings/analytics",
      providesTags: [{ type: "Filing", id: "ANALYTICS" }],
    }),
    listFilings: b.query<FilingListResponse, ListFilingsParams>({
      query: (params) => ({ url: "/filings", params }),
      providesTags: (result) => [
        { type: "Filing", id: "LIST" },
        ...(result?.items ?? []).map((f) => ({ type: "Filing" as const, id: f.id })),
      ],
    }),
    getFiling: b.query<FilingDetail, string>({
      query: (id) => `/filings/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Filing", id }],
    }),
  }),
});

export const {
  useGetFilingAnalyticsQuery,
  useListFilingsQuery,
  useGetFilingQuery,
} = filingsApi;
