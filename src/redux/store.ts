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

// Endpoint-injection imports get added in Phase 2 as each slice is created.

const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: [
    "userId",
    "email",
    "fullName",
    "roles",
    "isAuthenticated",
    "csrfToken",
    "jurisdictionCode",
    "jurisdictionDisplayName",
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
