import { baseApi } from "./baseApi";

export type InstitutionType = "BANK" | "FINTECH" | "MOMO_PROVIDER" | "REGULATOR";

/** Governs which cases a plain L1 analyst can see. Per-institution, admin-toggled. */
export type CaseAccessMode = "all" | "originator" | "none";
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
  /** L1 analyst case-access policy. Absent on older backends → treat as "originator". */
  analyst_case_access?: CaseAccessMode;
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
      query: (params) => ({ url: "/institutions", params }),
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
    // Set the L1 analyst case-access policy for an institution (MANAGE_INSTITUTIONS).
    setAnalystCaseAccess: b.mutation<
      ActionResponse,
      { id: string; analyst_case_access: CaseAccessMode }
    >({
      query: ({ id, analyst_case_access }) => ({
        url: `/institutions/${id}/analyst-case-access`,
        method: "PATCH",
        body: { analyst_case_access },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Institution", id }],
    }),
    // Re-sends the email-verification link to a REGISTERED institution's contact.
    // Backend returns a generic 200 regardless (no email enumeration).
    resendVerification: b.mutation<{ message?: string }, { contact_email: string }>({
      query: (body) => ({
        url: "/institutions/signup/resend-verification",
        method: "POST",
        body,
      }),
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
  useSetAnalystCaseAccessMutation,
  useResendVerificationMutation,
} = institutionsApi;
