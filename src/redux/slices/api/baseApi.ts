import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { API_V1 } from "@/config/api";
import { logout } from "@/redux/slices/authSlice";
import type { RootState } from "@/redux/store";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_V1,
  timeout: 30000,
  credentials: "same-origin", // Send cookies with requests
  prepareHeaders: (headers, { getState }) => {
    // Include CSRF token in mutation requests (double-submit cookie pattern)
    const state = getState() as RootState;
    let csrfToken = state.auth?.csrfToken;
    // Fallback: read from __csrf cookie if Redux state lost it (e.g. pre-CSRF login session)
    if (!csrfToken && typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/);
      if (match) csrfToken = decodeURIComponent(match[1]);
    }
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    // Clear cookie by calling logout endpoint
    await fetch("/api/auth/logout", { method: "POST" });
    api.dispatch(baseApi.util.resetApiState());
    api.dispatch(logout());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Customer", "CustomerTier", "TierHistory", "Decision", "Usage", "Client", "Policy", "Tier", "Webhook", "SignupRequest", "CaseNote", "Case", "Workflow", "AuditLog", "VendorConfig"],
  endpoints: () => ({}),
});
