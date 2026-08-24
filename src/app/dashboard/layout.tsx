"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { logout, refreshProfile } from "@/redux/slices/authSlice";
import { baseApi } from "@/redux/slices/api/baseApi";
import { useMeQuery } from "@/redux/slices/api/authApi";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToastContainer from "@/components/Toast";
import { LiveFeedProvider } from "@/components/LiveFeedProvider";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Login only sets roles/permissions once; nothing else ever refreshes them,
  // so a permission granted to your role after you logged in sits stale in
  // persisted state until the next full login. Refetch once per app load
  // (this layout mounts once and persists across dashboard navigation) so a
  // reload is enough to pick up a newly-granted permission — no logout needed.
  const { data: me } = useMeQuery(undefined, { skip: !isAuthenticated });
  useEffect(() => {
    if (!me) return;
    dispatch(
      refreshProfile({
        roles: me.roles,
        permissions: me.permissions,
        fullName: me.full_name,
        institutionId: me.institution_id,
        institutionName: me.institution_name,
      }),
    );
  }, [me, dispatch]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      dispatch(baseApi.util.resetApiState());
      dispatch(logout());
      setSessionExpired(true);
    }, SESSION_TIMEOUT_MS);
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const events: (keyof WindowEventMap)[] = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return sessionExpired ? (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="bg-white dark:bg-navy-700 rounded-xl shadow-lg p-8 max-w-sm text-center space-y-4">
          <div className="text-amber-500 text-4xl">⏱</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Session Expired
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your session expired due to inactivity. Please log in again.
          </p>
          <button
            onClick={() => {
              setSessionExpired(false);
              router.replace("/login");
            }}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Log In
          </button>
        </div>
      </div>
    ) : null;
  }

  return (
    <LiveFeedProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
        <Sidebar />
        <div className="lg:ml-64 flex flex-col min-h-screen">
          <div className="sticky top-0 z-10 hidden lg:block">
            <TopBar />
          </div>
          <main id="main-content" className="flex-1 p-4 pt-16 lg:pt-6 lg:p-8">
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </main>
        </div>
        <ToastContainer />
      </div>
    </LiveFeedProvider>
  );
}
