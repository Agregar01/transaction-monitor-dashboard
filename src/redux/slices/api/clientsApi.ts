import { baseApi } from "./baseApi";

export interface ApiClient {
  id: string;
  name: string;
  description: string | null;
  client_id: string;
  api_key_prefix: string | null;
  api_key?: string; // Only present on create/regenerate responses (raw key shown once)
  contact_email: string | null;
  webhook_url: string | null;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  is_active: boolean;
  is_admin: boolean;
  integration_mode: "api_only" | "full_platform";
  created_at: string;
  updated_at: string;
}

export interface ClientListResponse {
  items: ApiClient[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ClientCreateRequest {
  name: string;
  description?: string;
  contact_email?: string;
  webhook_url?: string;
  rate_limit_per_minute?: number;
  rate_limit_per_hour?: number;
  integration_mode?: "api_only" | "full_platform";
}

export interface ClientUpdateRequest {
  client_id: string;
  body: {
    name?: string;
    description?: string;
    contact_email?: string;
    webhook_url?: string;
    rate_limit_per_minute?: number;
    rate_limit_per_hour?: number;
    is_active?: boolean;
  };
}

export interface IntegrationStep {
  id: string;
  label: string;
  completed: boolean;
  detail: string;
}

export interface IntegrationStatusResponse {
  steps: IntegrationStep[];
  completed: number;
  total: number;
  progress_percent: number;
}

const clientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listClients: builder.query<ClientListResponse, { page?: number; page_size?: number; is_active?: boolean }>({
      query: (params) => ({
        url: "/clients/",
        params,
      }),
      providesTags: ["Client"],
    }),
    getClient: builder.query<ApiClient, string>({
      query: (client_id) => `/clients/${client_id}/`,
      providesTags: ["Client"],
    }),
    createClient: builder.mutation<ApiClient, ClientCreateRequest>({
      query: (body) => ({
        url: "/clients/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Client"],
    }),
    updateClient: builder.mutation<ApiClient, ClientUpdateRequest>({
      query: ({ client_id, body }) => ({
        url: `/clients/${client_id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Client"],
    }),
    regenerateKey: builder.mutation<ApiClient, string>({
      query: (client_id) => ({
        url: `/clients/${client_id}/regenerate-key/`,
        method: "POST",
      }),
      invalidatesTags: ["Client"],
    }),
    deleteClient: builder.mutation<void, string>({
      query: (client_id) => ({
        url: `/clients/${client_id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Client"],
    }),
    getIntegrationStatus: builder.query<IntegrationStatusResponse, void>({
      query: () => "/clients/me/integration-status/",
      providesTags: ["Client"],
    }),
  }),
});

export const {
  useListClientsQuery,
  useGetClientQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useRegenerateKeyMutation,
  useDeleteClientMutation,
  useGetIntegrationStatusQuery,
} = clientsApi;
