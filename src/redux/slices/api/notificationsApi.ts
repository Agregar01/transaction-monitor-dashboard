import { baseApi } from "./baseApi";

interface SendReminderResponse {
  email_sent: boolean;
  sms_sent: boolean;
  customer_external_id: string;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendKycReminder: builder.mutation<
      SendReminderResponse,
      { customer_external_id: string; client_id: string }
    >({
      query: ({ customer_external_id, client_id }) => ({
        url: `/notifications/remind/${customer_external_id}?client_id=${client_id}`,
        method: "POST",
      }),
    }),
  }),
});

export const { useSendKycReminderMutation } = notificationsApi;
