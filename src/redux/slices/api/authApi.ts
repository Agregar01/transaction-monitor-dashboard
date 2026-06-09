import { baseApi } from "./baseApi";
import type { User, Role } from "@/types/api";

export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    me: b.query<User, void>({
      query: () => "/auth/me",
      providesTags: [{ type: "Auth", id: "ME" }],
    }),
    listUsers: b.query<User[], void>({
      query: () => "/auth/users",
      providesTags: (result) => [
        { type: "User", id: "LIST" },
        ...(result ?? []).map((u) => ({ type: "User" as const, id: u.user_id })),
      ],
    }),
    // Minimal active-user roster for assignment pickers. Gated by ASSIGN_CASES,
    // so supervisory roles (not just user admins) can populate the picker.
    listAssignableUsers: b.query<User[], void>({
      query: () => "/auth/assignable-users",
      providesTags: [{ type: "User", id: "ASSIGNABLE" }],
    }),
    getUserRoles: b.query<User, string>({
      query: (user_id) => `/auth/users/${user_id}/roles`,
      providesTags: (_r, _e, id) => [{ type: "User", id }],
    }),
    listRoles: b.query<Role[], void>({
      query: () => "/auth/roles",
      providesTags: [{ type: "Role", id: "LIST" }],
    }),
    createUser: b.mutation<
      User,
      { email: string; password: string; full_name?: string; active?: boolean; roles?: string[] }
    >({
      query: (body) => ({ url: "/auth/users", method: "POST", body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: b.mutation<
      User,
      { user_id: string; full_name?: string; active?: boolean }
    >({
      query: ({ user_id, ...body }) => ({ url: `/auth/users/${user_id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { user_id }) => [
        { type: "User", id: user_id },
        { type: "User", id: "LIST" },
      ],
    }),
    updateUserRoles: b.mutation<
      { user_id: string; email: string; roles: string[] },
      { user_id: string; roles: string[] }
    >({
      query: ({ user_id, ...body }) => ({
        url: `/auth/users/${user_id}/roles`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { user_id }) => [
        { type: "User", id: user_id },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useMeQuery,
  useListUsersQuery,
  useListAssignableUsersQuery,
  useGetUserRolesQuery,
  useListRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserRolesMutation,
} = authApi;
