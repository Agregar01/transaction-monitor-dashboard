import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { API_V1 } from "@/config/api";
import { logout } from "@/redux/slices/authSlice";
import type { RootState } from "@/redux/store";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_V1,
  timeout: 30000,
  credentials: "same-origin", // BFF cookies travel with same-origin requests
  prepareHeaders: (headers, { getState }) => {
    // Attach the double-submit CSRF token on mutations. Prefer the Redux-held value
    // (set at login), fall back to the __csrf cookie if Redux was rehydrated stale.
    const state = getState() as RootState;
    let csrfToken = state.auth?.csrfToken ?? null;
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

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  // The BFF proxy already attempts a transparent refresh on 401 and clears
  // cookies if it fails. Any 401 that reaches us here means the session is
  // unrecoverable — kick the user back to /login.
  if (result.error && result.error.status === 401) {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    api.dispatch(baseApi.util.resetApiState());
    api.dispatch(logout());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "User",
    "Role",
    "Transaction",
    "Customer",
    "Baseline",
    "Alert",
    "Case",
    "CaseHistory",
    "Rule",
    "ShadowStats",
    "STRReport",
    "CTRReport",
    "Approval",
    "Watchlist",
    "WatchlistEntry",
    "Audit",
    "Jurisdiction",
    "Tenant",
    "TenantInfo",
    "Sanctions",
    "Health",
    "Metrics",
    "ModelRegistry",
    "DriftDetection",
    "LabeledTransaction",
  ],
  endpoints: () => ({}),
});
