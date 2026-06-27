import { baseApi } from "./baseApi";
import type { FileUploadResponse, BatchStatusResponse } from "@/types/api";

interface WatchlistUploadResponse {
  added: number;
  skipped_duplicates: number;
  failed: number;
  unknown_lists?: string[];
  hint?: string;
}

interface CustomerProfileUploadResponse {
  updated: number;
  not_found: number;
  failed: number;
}

export const ingestionApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    uploadBatchFile: b.mutation<
      FileUploadResponse,
      { file: File; source_system?: string }
    >({
      query: ({ file, source_system }) => {
        const form = new FormData();
        form.append("file", file);
        if (source_system) form.append("source_system", source_system);
        return { url: "/ingestion/upload", method: "POST", body: form };
      },
    }),
    getBatchStatus: b.query<BatchStatusResponse, string>({
      query: (batch_id) => `/ingestion/batch/${batch_id}/status`,
    }),
    uploadWatchlistCsv: b.mutation<WatchlistUploadResponse, { file: File }>({
      query: ({ file }) => {
        const form = new FormData();
        form.append("file", file);
        return { url: "/ingestion/upload/watchlist", method: "POST", body: form };
      },
    }),
    uploadCustomerProfilesCsv: b.mutation<CustomerProfileUploadResponse, { file: File }>({
      query: ({ file }) => {
        const form = new FormData();
        form.append("file", file);
        return { url: "/ingestion/upload/customers", method: "POST", body: form };
      },
    }),
  }),
});

export const {
  useUploadBatchFileMutation,
  useGetBatchStatusQuery,
  useUploadWatchlistCsvMutation,
  useUploadCustomerProfilesCsvMutation,
} = ingestionApi;
