import { baseApi } from "./baseApi";

/** Institution-scoped API keys (CONTRACT.md §6). */

export interface ApiKey {
  id: string;
  label: string;
  institution_id: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
}

/** Returned only at creation — the raw `key` is shown exactly once. */
export interface ApiKeyCreated {
  id: string;
  label: string;
  key: string;
  institution_id: string;
  created_at: string;
  expires_at: string | null;
  message: string;
}

export interface ApiKeyRotated {
  id: string;
  new_key: string;
  old_key_expires_at: string;
  message: string;
}

export interface ApiKeyUsage {
  id: string;
  label: string;
  last_used_at: string | null;
  requests_today: number;
  requests_7d: number;
  requests_30d: number;
}

export const apiKeysApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listApiKeys: b.query<ApiKey[], void>({
      query: () => "/api-keys",
      providesTags: (result) => [
        { type: "ApiKey", id: "LIST" },
        ...(result ?? []).map((k) => ({ type: "ApiKey" as const, id: k.id })),
      ],
    }),
    createApiKey: b.mutation<ApiKeyCreated, { label: string }>({
      query: (body) => ({ url: "/api-keys", method: "POST", body }),
      invalidatesTags: [{ type: "ApiKey", id: "LIST" }],
    }),
    revokeApiKey: b.mutation<{ id: string; label: string; message: string }, string>({
      query: (key_id) => ({ url: `/api-keys/${key_id}/revoke`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "ApiKey", id },
        { type: "ApiKey", id: "LIST" },
      ],
    }),
    rotateApiKey: b.mutation<ApiKeyRotated, string>({
      query: (key_id) => ({ url: `/api-keys/${key_id}/rotate`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "ApiKey", id },
        { type: "ApiKey", id: "LIST" },
      ],
    }),
    getApiKeyUsage: b.query<ApiKeyUsage, string>({
      query: (key_id) => `/api-keys/${key_id}/usage`,
      providesTags: (_r, _e, id) => [{ type: "ApiKey", id }],
    }),
  }),
});

export const {
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
  useRotateApiKeyMutation,
  useGetApiKeyUsageQuery,
} = apiKeysApi;
