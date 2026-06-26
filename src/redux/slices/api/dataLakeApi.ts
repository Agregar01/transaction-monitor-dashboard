import { baseApi } from "./baseApi";

export interface DataLakeExportResult {
  transactions: number;
  alerts: number;
  cases: number;
  str_reports: number;
  ctr_reports: number;
  audit_logs: number;
}

export interface DataLakeStatus {
  status: "ok" | "no_export_yet";
  message?: string;
  last_run?: string;
  export_date?: string;
  results?: DataLakeExportResult;
  errors?: string[];
  bucket?: string;
  region?: string;
  total_rows?: number;
}

export interface TriggerExportResponse {
  status: "queued";
  task_id: string;
  export_date: string;
}

export const dataLakeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDataLakeStatus: build.query<DataLakeStatus, void>({
      query: () => "/data-lake/status",
      providesTags: ["DataLake"],
    }),
    triggerDataLakeExport: build.mutation<TriggerExportResponse, { export_date?: string }>({
      query: (body) => ({
        url: "/data-lake/export",
        method: "POST",
        params: body.export_date ? { export_date: body.export_date } : undefined,
      }),
      invalidatesTags: ["DataLake"],
    }),
  }),
});

export const { useGetDataLakeStatusQuery, useTriggerDataLakeExportMutation } = dataLakeApi;
