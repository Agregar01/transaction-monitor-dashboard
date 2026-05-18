import { baseApi } from "./baseApi";
import type { TeamMember, InviteUserRequest, MfaSetupResponse, MfaStatusResponse } from "@/types/api";

const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listTeamMembers: builder.query<TeamMember[], void>({
      query: () => "/users/",
      transformResponse: (response: TeamMember[] | { items: TeamMember[] } | unknown) => {
        if (Array.isArray(response)) return response;
        if (response && typeof response === "object" && "items" in response) return (response as { items: TeamMember[] }).items;
        return [];
      },
      providesTags: ["Client"],
    }),
    inviteTeamMember: builder.mutation<TeamMember, InviteUserRequest>({
      query: (body) => ({
        url: "/users/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Client"],
    }),
    updateTeamMember: builder.mutation<TeamMember, { user_id: string; body: Partial<{ name: string; role: string; is_active: boolean }> }>({
      query: ({ user_id, body }) => ({
        url: `/users/${user_id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Client"],
    }),
    removeTeamMember: builder.mutation<void, string>({
      query: (user_id) => ({
        url: `/users/${user_id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Client"],
    }),
    resendInvite: builder.mutation<TeamMember, string>({
      query: (user_id) => ({
        url: `/users/${user_id}/resend-invite/`,
        method: "POST",
      }),
      invalidatesTags: ["Client"],
    }),
    changePassword: builder.mutation<{ status: string }, { current_password: string; new_password: string }>({
      query: (body) => ({
        url: "/clients/me/change-password/",
        method: "POST",
        body,
      }),
    }),
    getClientProfile: builder.query<import("./clientsApi").ApiClient, void>({
      query: () => "/clients/me/",
      providesTags: ["Client"],
    }),
    getMfaStatus: builder.query<MfaStatusResponse, void>({
      query: () => "/mfa/status/",
    }),
    setupMfa: builder.mutation<MfaSetupResponse, void>({
      query: () => ({
        url: "/mfa/setup/",
        method: "POST",
      }),
    }),
    verifyMfaSetup: builder.mutation<{ status: string }, { code: string }>({
      query: (body) => ({
        url: "/mfa/verify-setup/",
        method: "POST",
        body,
      }),
    }),
    disableMfa: builder.mutation<{ status: string }, { code: string }>({
      query: (body) => ({
        url: "/mfa/disable/",
        method: "POST",
        body,
      }),
    }),
    verifyMfaLogin: builder.mutation<{ status: string; verified: boolean }, { email: string; code: string }>({
      query: (body) => ({
        url: "/mfa/verify-login/",
        method: "POST",
        body,
      }),
    }),
    rotateMyKey: builder.mutation<
      import("./clientsApi").ApiClient & { api_key: string; grace_period_hours?: number; previous_key_expires_at?: string },
      { grace_period_hours?: number } | void
    >({
      query: (body) => ({
        url: "/clients/me/rotate-key/",
        method: "POST",
        body: body || {},
      }),
      invalidatesTags: ["Client"],
    }),
  }),
});

export const {
  useListTeamMembersQuery,
  useInviteTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useResendInviteMutation,
  useChangePasswordMutation,
  useGetClientProfileQuery,
  useGetMfaStatusQuery,
  useSetupMfaMutation,
  useVerifyMfaSetupMutation,
  useDisableMfaMutation,
  useVerifyMfaLoginMutation,
  useRotateMyKeyMutation,
} = usersApi;
