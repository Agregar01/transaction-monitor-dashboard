import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  /** RBAC role names from /auth/me, e.g. ["COMPLIANCE_OFFICER", "ML_ENGINEER"]. */
  roles: string[];
  isAuthenticated: boolean;
  /** Double-submit CSRF token. Read from a non-httpOnly cookie at login, mirrored
   *  in Redux for RTK Query to attach to mutation headers. */
  csrfToken: string | null;
  /** Active jurisdiction for this deployment (GHA / NGA / KEN). */
  jurisdictionCode: string | null;
  jurisdictionDisplayName: string | null;
}

const initialState: AuthState = {
  userId: null,
  email: null,
  fullName: null,
  roles: [],
  isAuthenticated: false,
  csrfToken: null,
  jurisdictionCode: null,
  jurisdictionDisplayName: null,
};

interface SetCredentialsPayload {
  userId: string;
  email: string;
  fullName?: string | null;
  roles: string[];
  csrfToken?: string | null;
  jurisdictionCode?: string | null;
  jurisdictionDisplayName?: string | null;
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
      state.isAuthenticated = true;
      state.csrfToken = action.payload.csrfToken ?? null;
      state.jurisdictionCode = action.payload.jurisdictionCode ?? null;
      state.jurisdictionDisplayName = action.payload.jurisdictionDisplayName ?? null;
    },
    logout(state) {
      state.userId = null;
      state.email = null;
      state.fullName = null;
      state.roles = [];
      state.isAuthenticated = false;
      state.csrfToken = null;
      state.jurisdictionCode = null;
      state.jurisdictionDisplayName = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
