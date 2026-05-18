import { baseApi } from "./baseApi";

export interface SignupRequestItem {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  use_case: string;
  status: "pending_verification" | "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  rejection_reason: string | null;
  api_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignupListResponse {
  items: SignupRequestItem[];
  total: number;
}

export interface ApproveResponse {
  signup_request: SignupRequestItem;
  client_name: string;
  client_id: string;
  api_key: string;
  welcome_email_sent: boolean;
}

const signupRequestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listSignupRequests: builder.query<SignupListResponse, { status?: string }>({
      query: (params) => ({
        url: "/signup-requests/",
        params,
      }),
      providesTags: ["SignupRequest"],
    }),
    approveSignupRequest: builder.mutation<ApproveResponse, string>({
      query: (id) => ({
        url: `/signup-requests/${id}/approve/`,
        method: "POST",
      }),
      invalidatesTags: ["SignupRequest", "Client"],
    }),
    rejectSignupRequest: builder.mutation<SignupRequestItem, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/signup-requests/${id}/reject/`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["SignupRequest"],
    }),
  }),
});

export const {
  useListSignupRequestsQuery,
  useApproveSignupRequestMutation,
  useRejectSignupRequestMutation,
} = signupRequestsApi;
