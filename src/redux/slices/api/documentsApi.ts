import { baseApi } from "./baseApi";

export interface DocumentItem {
  id: string;
  document_type: string;
  status: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  notes: string | null;
  created_at: string;
}

interface DocumentListResponse {
  customer_external_id: string;
  documents: DocumentItem[];
  total: number;
}

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDocuments: builder.query<
      DocumentListResponse,
      { customer_external_id: string; client_id: string; status?: string }
    >({
      query: ({ customer_external_id, client_id, status }) => {
        const params = new URLSearchParams({ client_id });
        if (status) params.set("status", status);
        return `/documents/${customer_external_id}?${params.toString()}`;
      },
      providesTags: (_r, _e, { customer_external_id }) => [
        { type: "Customer", id: `docs-${customer_external_id}` },
      ],
    }),

    uploadDocument: builder.mutation<
      DocumentItem,
      { customer_external_id: string; document_type: string; file: File; notes?: string }
    >({
      query: ({ customer_external_id, document_type, file, notes }) => {
        const formData = new FormData();
        formData.append("document_type", document_type);
        formData.append("file", file);
        if (notes) formData.append("notes", notes);
        return {
          url: `/documents/${customer_external_id}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_r, _e, { customer_external_id }) => [
        { type: "Customer", id: `docs-${customer_external_id}` },
      ],
    }),

    updateDocumentStatus: builder.mutation<
      DocumentItem,
      { document_id: string; status: string; notes?: string; customer_external_id: string }
    >({
      query: ({ document_id, status, notes }) => {
        const params = new URLSearchParams({ status_update: status });
        if (notes) params.set("notes", notes);
        return {
          url: `/documents/${document_id}/status?${params.toString()}`,
          method: "PATCH",
        };
      },
      invalidatesTags: (_r, _e, { customer_external_id }) => [
        { type: "Customer", id: `docs-${customer_external_id}` },
      ],
    }),
  }),
});

export const {
  useListDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentStatusMutation,
} = documentsApi;
