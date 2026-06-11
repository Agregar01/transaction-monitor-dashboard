import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import authReducer from "./slices/authSlice";
import notificationsReducer from "./slices/notificationsSlice";
import { baseApi } from "./slices/api/baseApi";

// Endpoint-injection imports — each slice registers itself with baseApi
// at import time, so consumer hooks resolve to real endpoints.
import "./slices/api/authApi";
import "./slices/api/tenantApi";
import "./slices/api/transactionsApi";
import "./slices/api/customersApi";
import "./slices/api/alertsApi";
import "./slices/api/casesApi";
import "./slices/api/rulesApi";
import "./slices/api/sanctionsApi";
import "./slices/api/watchlistsApi";
import "./slices/api/strApi";
import "./slices/api/ctrApi";
import "./slices/api/approvalsApi";
import "./slices/api/jurisdictionsApi";
import "./slices/api/auditApi";
import "./slices/api/shadowApi";
import "./slices/api/healthApi";
import "./slices/api/mlApi";
import "./slices/api/institutionsApi";
import "./slices/api/teamApi";
import "./slices/api/apiKeysApi";
import "./slices/api/filingsApi";

const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: [
    "userId",
    "email",
    "fullName",
    "roles",
    // permissions + features drive the permission-nav Sidebar. They MUST be
    // persisted, else a page reload rehydrates them empty and the nav collapses
    // to only the always-on routes (Overview/Settings) for every role.
    "permissions",
    "features",
    "isAuthenticated",
    "csrfToken",
    "jurisdictionCode",
    "jurisdictionDisplayName",
    // Persisted so a switched persona survives reloads (validated against roles
    // on read via effectivePersona).
    "activePersona",
  ],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  notifications: notificationsReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
