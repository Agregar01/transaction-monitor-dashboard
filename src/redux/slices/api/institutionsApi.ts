import { baseApi } from "./baseApi";

export type InstitutionType = "BANK" | "FINTECH" | "MOMO_PROVIDER" | "REGULATOR";
export type InstitutionStatus =
  | "REGISTERED"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

export interface Institution {
  id: string;
  name: string;
  institution_type: InstitutionType;
  jurisdiction_code: string;
  status: InstitutionStatus;
  contact_email: string;
  contact_name: string | null;
  phone: string | null;
  use_case: string | null;
  email_verified_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstitutionListResponse {
  items: Institution[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListInstitutionsParams {
  status?: InstitutionStatus;
  institution_type?: InstitutionType;
  jurisdiction_code?: string;
  page?: number;
  page_size?: number;
}

interface ActionResponse {
  institution_id: string;
  status: InstitutionStatus;
  message: string;
  admin_user_id?: string;
}

export const institutionsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listInstitutions: b.query<InstitutionListResponse, ListInstitutionsParams>({
      query: (params) => ({ url: "/institutions/", params }),
      providesTags: (result) => [
        { type: "Institution", id: "LIST" },
        ...(result?.items ?? []).map((i) => ({ type: "Institution" as const, id: i.id })),
      ],
    }),
    getInstitution: b.query<Institution, string>({
      query: (id) => `/institutions/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Institution", id }],
    }),
    approveInstitution: b.mutation<
      ActionResponse,
      { id: string; admin_email: string; admin_name?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/institutions/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Institution", id },
        { type: "Institution", id: "LIST" },
      ],
    }),
    rejectInstitution: b.mutation<ActionResponse, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/institutions/${id}/reject`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Institution", id },
        { type: "Institution", id: "LIST" },
      ],
    }),
    suspendInstitution: b.mutation<ActionResponse, string>({
      query: (id) => ({ url: `/institutions/${id}/suspend`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Institution", id },
        { type: "Institution", id: "LIST" },
      ],
    }),
    reactivateInstitution: b.mutation<ActionResponse, string>({
      query: (id) => ({ url: `/institutions/${id}/reactivate`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Institution", id },
        { type: "Institution", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListInstitutionsQuery,
  useGetInstitutionQuery,
  useApproveInstitutionMutation,
  useRejectInstitutionMutation,
  useSuspendInstitutionMutation,
  useReactivateInstitutionMutation,
} = institutionsApi;
