import { baseApi } from "./baseApi";
import type { CaseAttachment } from "@/types/api";

export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listAttachments: b.query<CaseAttachment[], string>({
      query: (case_id) => `/cases/${case_id}/attachments`,
      providesTags: (_r, _e, case_id) => [{ type: "Attachment" as const, id: case_id }],
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
  useDeleteAttachmentMutation,
} = attachmentsApi;
