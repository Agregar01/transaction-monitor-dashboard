import { baseApi } from "./baseApi";

/**
 * Institution-scoped team management (CONTRACT.md §5). Distinct from the
 * platform-level /auth/users endpoints (authApi) — these are the new
 * institution-scoped /users/ routes with the invite lifecycle.
 */

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  active: boolean;
  invite_pending: boolean;
  roles: string[];
  created_at: string;
}

/** Roles a CLIENT_ADMIN may assign when inviting (AGREGAR/SYSTEM admin blocked).
 *  ML_ENGINEER is intentionally excluded — ML/rules ops are Agregar-owned, so
 *  institutions can't create ML engineers. */
export const INVITABLE_ROLES = [
  "ANALYST",
  "SENIOR_ANALYST",
  "COMPLIANCE_OFFICER",
  "DPO",
  "AUDITOR",
  "OPERATIONS",
  "READONLY",
  "CLIENT_ADMIN",
  "REGULATOR_VIEWER",
] as const;

interface InviteResponse {
  user_id: string;
  email: string;
  role: string;
  invite_pending: boolean;
  message: string;
}

interface UserStateResponse {
  user_id: string;
  email: string;
  active: boolean;
  message: string;
}

export const teamApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listTeam: b.query<TeamMember[], { include_inactive?: boolean } | void>({
      query: (params) => ({ url: "/users", params: params || undefined }),
      providesTags: (result) => [
        { type: "TeamUser", id: "LIST" },
        ...(result ?? []).map((u) => ({ type: "TeamUser" as const, id: u.id })),
      ],
    }),
    inviteTeamMember: b.mutation<
      InviteResponse,
      { email: string; role: string; full_name?: string }
    >({
      query: (body) => ({ url: "/users/invite", method: "POST", body }),
      invalidatesTags: [{ type: "TeamUser", id: "LIST" }],
    }),
    reinviteTeamMember: b.mutation<InviteResponse, string>({
      query: (user_id) => ({ url: `/users/${user_id}/reinvite`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "TeamUser", id },
        { type: "TeamUser", id: "LIST" },
      ],
    }),
    deactivateTeamMember: b.mutation<UserStateResponse, string>({
      query: (user_id) => ({ url: `/users/${user_id}/deactivate`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "TeamUser", id },
        { type: "TeamUser", id: "LIST" },
      ],
    }),
    reactivateTeamMember: b.mutation<UserStateResponse, string>({
      query: (user_id) => ({ url: `/users/${user_id}/reactivate`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "TeamUser", id },
        { type: "TeamUser", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListTeamQuery,
  useInviteTeamMemberMutation,
  useReinviteTeamMemberMutation,
  useDeactivateTeamMemberMutation,
  useReactivateTeamMemberMutation,
} = teamApi;
