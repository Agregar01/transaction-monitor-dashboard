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
    getUserRoles: b.query<User, string>({
      query: (user_id) => `/auth/users/${user_id}/roles`,
      providesTags: (_r, _e, id) => [{ type: "User", id }],
    }),
    listRoles: b.query<Role[], void>({
      query: () => "/auth/roles",
      providesTags: [{ type: "Role", id: "LIST" }],
    }),
  }),
});

export const {
  useMeQuery,
  useListUsersQuery,
  useGetUserRolesQuery,
  useListRolesQuery,
} = authApi;
