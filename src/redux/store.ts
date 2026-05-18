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

// Import endpoint injections so they register with baseApi
import "./slices/api/customersApi";
import "./slices/api/decisionsApi";
import "./slices/api/usageApi";
import "./slices/api/clientsApi";
import "./slices/api/policiesApi";
import "./slices/api/webhooksApi";
import "./slices/api/documentsApi";
import "./slices/api/notificationsApi";
import "./slices/api/auditLogsApi";
import "./slices/api/usersApi";
import "./slices/api/workflowsApi";
import "./slices/api/complianceApi";

const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: ["clientId", "clientName", "isAdmin", "isRegulator", "isAuthenticated", "isTeamMember", "userRole", "csrfToken"],
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
