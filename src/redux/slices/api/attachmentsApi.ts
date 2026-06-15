import { baseApi } from "./baseApi";
import type { CaseAttachment } from "@/types/api";

export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listAttachments: b.query<CaseAttachment[], string>({
      query: (case_id) => `/cases/${case_id}/attachments`,
      providesTags: (_r, _e, case_id) => [{ type: "Attachment" as const, id: case_id }],
    }),
    uploadAttachment: b.mutation<
      CaseAttachment,
      { case_id: string; file: File; description?: string; transition_id?: string }
    >({
      query: ({ case_id, file, description, transition_id }) => {
        const form = new FormData();
        form.append("file", file);
        if (description) form.append("description", description);
        if (transition_id) form.append("transition_id", transition_id);
        // Let the browser set the multipart Content-Type (with boundary);
        // fetchBaseQuery passes FormData through untouched.
        return { url: `/cases/${case_id}/attachments`, method: "POST", body: form };
      },
      invalidatesTags: (_r, _e, { case_id }) => [
        { type: "Attachment" as const, id: case_id },
        { type: "CaseHistory" as const, id: case_id },
      ],
    }),
    getAttachment: b.query<CaseAttachment, { case_id: string; attachment_id: string }>({
      query: ({ case_id, attachment_id }) =>
        `/cases/${case_id}/attachments/${attachment_id}`,
    }),
    deleteAttachment: b.mutation<void, { case_id: string; attachment_id: string }>({
      query: ({ case_id, attachment_id }) => ({
        url: `/cases/${case_id}/attachments/${attachment_id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { case_id }) => [
        { type: "Attachment" as const, id: case_id },
      ],
    }),
  }),
});

export const {
  useListAttachmentsQuery,
  useGetAttachmentQuery,
  useUploadAttachmentMutation,
  useDeleteAttachmentMutation,
} = attachmentsApi;
