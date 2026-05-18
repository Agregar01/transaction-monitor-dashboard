import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  clientId: string | null;
  clientName: string | null;
  isAdmin: boolean;
  isRegulator: boolean;
  isAuthenticated: boolean;
  isTeamMember: boolean;
  userRole: string | null; // OWNER | ADMIN | VIEWER (for team members)
  csrfToken: string | null;
}

const initialState: AuthState = {
  clientId: null,
  clientName: null,
  isAdmin: false,
  isRegulator: false,
  isAuthenticated: false,
  isTeamMember: false,
  userRole: null,
  csrfToken: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        clientId: string;
        clientName: string;
        isAdmin: boolean;
        isRegulator?: boolean;
        isTeamMember?: boolean;
        userRole?: string | null;
        csrfToken?: string | null;
      }>
    ) {
      state.clientId = action.payload.clientId;
      state.clientName = action.payload.clientName;
      state.isAdmin = action.payload.isAdmin;
      state.isRegulator = action.payload.isRegulator || false;
      state.isAuthenticated = true;
      state.isTeamMember = action.payload.isTeamMember || false;
      state.userRole = action.payload.userRole || null;
      state.csrfToken = action.payload.csrfToken || null;
    },
    logout(state) {
      state.clientId = null;
      state.clientName = null;
      state.isAdmin = false;
      state.isRegulator = false;
      state.isAuthenticated = false;
      state.isTeamMember = false;
      state.userRole = null;
      state.csrfToken = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
