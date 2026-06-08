import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/** Per-jurisdiction feature flags from /tenant/info (TenantConfig). */
export interface TenantFeatures {
  ctr: boolean;
  str: boolean;
  sanctions: boolean;
  ml: boolean;
}

export interface AuthState {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  /** RBAC role names from /auth/me, e.g. ["COMPLIANCE_OFFICER", "ML_ENGINEER"]. */
  roles: string[];
  /** Flat permission list resolved from all roles, e.g. ["view_cases", "file_str"]. */
  permissions: string[];
  isAuthenticated: boolean;
  /** Double-submit CSRF token. Read from a non-httpOnly cookie at login, mirrored
   *  in Redux for RTK Query to attach to mutation headers. */
  csrfToken: string | null;
  /** Active jurisdiction for this deployment (GHA / NGA / KEN / ZAF). */
  jurisdictionCode: string | null;
  jurisdictionDisplayName: string | null;
  /** Jurisdiction feature flags from /tenant/info. null until loaded. */
  features: TenantFeatures | null;
}

const initialState: AuthState = {
  userId: null,
  email: null,
  fullName: null,
  roles: [],
  permissions: [],
  isAuthenticated: false,
  csrfToken: null,
  jurisdictionCode: null,
  jurisdictionDisplayName: null,
  features: null,
};

interface SetCredentialsPayload {
  userId: string;
  email: string;
  fullName?: string | null;
  roles: string[];
  permissions?: string[];
  csrfToken?: string | null;
  jurisdictionCode?: string | null;
  jurisdictionDisplayName?: string | null;
  features?: TenantFeatures | null;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<SetCredentialsPayload>) {
      state.userId = action.payload.userId;
      state.email = action.payload.email;
      state.fullName = action.payload.fullName ?? null;
      state.roles = action.payload.roles ?? [];
      state.permissions = action.payload.permissions ?? [];
      state.isAuthenticated = true;
      state.csrfToken = action.payload.csrfToken ?? null;
      state.jurisdictionCode = action.payload.jurisdictionCode ?? null;
      state.jurisdictionDisplayName = action.payload.jurisdictionDisplayName ?? null;
      state.features = action.payload.features ?? null;
    },
    logout(state) {
      state.userId = null;
      state.email = null;
      state.fullName = null;
      state.roles = [];
      state.permissions = [];
      state.isAuthenticated = false;
      state.csrfToken = null;
      state.jurisdictionCode = null;
      state.jurisdictionDisplayName = null;
      state.features = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
