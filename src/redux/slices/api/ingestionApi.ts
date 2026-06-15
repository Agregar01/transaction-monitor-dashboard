import { baseApi } from "./baseApi";
import type { FileUploadResponse, BatchStatusResponse } from "@/types/api";

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
        // FormData passes through fetchBaseQuery untouched; the browser sets the
        // multipart boundary. The BFF proxy streams it to the backend.
        return { url: "/ingestion/upload", method: "POST", body: form };
      },
    }),
    getBatchStatus: b.query<BatchStatusResponse, string>({
      query: (batch_id) => `/ingestion/batch/${batch_id}/status`,
    }),
  }),
});

export const { useUploadBatchFileMutation, useGetBatchStatusQuery } = ingestionApi;
