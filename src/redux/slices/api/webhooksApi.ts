import { baseApi } from "./baseApi";

export interface WebhookConfig {
  id: string;
  client_id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  status_code: number;
  success: boolean;
  attempt: number;
  payload_preview: string;
  created_at: string;
}

const webhooksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listWebhooks: builder.query<WebhookConfig[], string>({
      query: (client_id) => ({
        url: "/webhooks/",
        params: { client_id },
      }),
      providesTags: ["Webhook"],
    }),
    createWebhook: builder.mutation<
      WebhookConfig,
      { client_id: string; url: string; events: string[] }
    >({
      query: (body) => ({
        url: "/webhooks/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Webhook"],
    }),
    deleteWebhook: builder.mutation<void, { id: string; client_id: string }>({
      query: ({ id, client_id }) => ({
        url: `/webhooks/${id}/`,
        method: "DELETE",
        params: { client_id },
      }),
      invalidatesTags: ["Webhook"],
    }),
    testWebhook: builder.mutation<{ success: boolean; status_code: number }, { id: string; client_id: string }>({
      query: ({ id, client_id }) => ({
        url: `/webhooks/${id}/test/`,
        method: "POST",
        params: { client_id },
      }),
    }),
    listWebhookDeliveries: builder.query<
      WebhookDelivery[],
      { webhook_id: string; client_id: string }
    >({
      query: ({ webhook_id, client_id }) => ({
        url: `/webhooks/${webhook_id}/deliveries/`,
        params: { client_id },
      }),
      providesTags: ["Webhook"],
    }),
    retryDelivery: builder.mutation<
      { success: boolean; status_code: number },
      { webhook_id: string; delivery_id: string; client_id: string }
    >({
      query: ({ webhook_id, delivery_id, client_id }) => ({
        url: `/webhooks/${webhook_id}/deliveries/${delivery_id}/retry/`,
        method: "POST",
        params: { client_id },
      }),
      invalidatesTags: ["Webhook"],
    }),
  }),
});

export const {
  useListWebhooksQuery,
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useListWebhookDeliveriesQuery,
  useRetryDeliveryMutation,
} = webhooksApi;
