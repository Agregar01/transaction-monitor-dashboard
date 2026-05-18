import { baseApi } from "./baseApi";
import type { Paginated, ModelRegistryEntry, DriftCheck, LabeledTransaction } from "@/types/api";

/**
 * NOTE: These endpoints (/api/v1/models, /api/v1/drift, /api/v1/labeled) are not
 * yet exposed by the TMS backend (see docs/OPEN_ISSUES.md — "No ML model registry
 * endpoint exposed"). The slices are defined so pages can call them; queries
 * will 404 until the backend lands the routers. Pages should render a
 * placeholder card when isError is true.
 */
export interface ListDriftParams {
  page?: number;
  page_size?: number;
  model_id?: string;
  is_drifting?: boolean;
}

export const mlApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listModels: b.query<ModelRegistryEntry[], void>({
      query: () => "/models",
      providesTags: [{ type: "ModelRegistry", id: "LIST" }],
    }),
    getModel: b.query<ModelRegistryEntry, string>({
      query: (id) => `/models/${id}`,
      providesTags: (_r, _e, id) => [{ type: "ModelRegistry", id }],
    }),
    listDrift: b.query<Paginated<DriftCheck>, ListDriftParams>({
      query: (params) => ({ url: "/drift", params }),
      providesTags: [{ type: "DriftDetection", id: "LIST" }],
    }),
    listLabeledTransactions: b.query<
      Paginated<LabeledTransaction>,
      { page?: number; page_size?: number; label?: string; label_source?: string }
    >({
      query: (params) => ({ url: "/labeled", params }),
      providesTags: [{ type: "LabeledTransaction", id: "LIST" }],
    }),
  }),
});

export const {
  useListModelsQuery,
  useGetModelQuery,
  useListDriftQuery,
  useListLabeledTransactionsQuery,
} = mlApi;
