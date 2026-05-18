import { baseApi } from "./baseApi";

export type VerificationType =
  | "IDENTITY"
  | "AML_SCREENING"
  | "BUSINESS_REGISTRY"
  | "ADDRESS_VERIFICATION";

export type VendorName =
  | "agregar"
  | "nia"
  | "smile_identity"
  | "qoreid"
  | "youverify"
  | "jumio"
  | "world_check"
  | "comply_advantage"
  | "seon"
  | "custom";

export interface VendorConfig {
  id: string;
  client_id: string;
  verification_type: VerificationType;
  vendor_name: VendorName;
  api_key_masked: string | null;
  api_url: string | null;
  priority: number;
  is_active: boolean;
  extra_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface VendorConfigCreate {
  verification_type: VerificationType;
  vendor_name: VendorName;
  api_key?: string;
  api_url?: string;
  priority?: number;
  is_active?: boolean;
  extra_config?: Record<string, unknown>;
}

export const vendorConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listVendorConfigs: builder.query<VendorConfig[], void>({
      query: () => "/vendor-config/",
      transformResponse: (response: VendorConfig[] | { items: VendorConfig[] } | unknown) => {
        if (Array.isArray(response)) return response;
        if (response && typeof response === "object" && "items" in response) return (response as { items: VendorConfig[] }).items;
        return [];
      },
      providesTags: [{ type: "VendorConfig", id: "LIST" }],
    }),
    upsertVendorConfig: builder.mutation<VendorConfig, VendorConfigCreate>({
      query: (body) => ({
        url: "/vendor-config/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "VendorConfig", id: "LIST" }],
    }),
    deleteVendorConfig: builder.mutation<void, string>({
      query: (id) => ({
        url: `/vendor-config/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "VendorConfig", id: "LIST" }],
    }),
  }),
});

export const {
  useListVendorConfigsQuery,
  useUpsertVendorConfigMutation,
  useDeleteVendorConfigMutation,
} = vendorConfigApi;
