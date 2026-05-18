"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { logout } from "@/redux/slices/authSlice";
import { baseApi } from "@/redux/slices/api/baseApi";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToastContainer from "@/components/Toast";
import { useDecisionNotifications } from "@/hooks/useDecisionNotifications";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Paths regulators are allowed to access
const REGULATOR_ALLOWED_PATHS = ["/dashboard/regulator", "/dashboard/settings"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isRegulator, isAdmin } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Poll for new BLOCK/FREEZE/REVIEW decisions and add as notifications
  useDecisionNotifications(60000);

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
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
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

  // Enforce regulator path restrictions — regulators can only access regulator pages and settings
  useEffect(() => {
    if (isAuthenticated && isRegulator && !isAdmin && pathname) {
      const allowed = REGULATOR_ALLOWED_PATHS.some((p) => pathname.startsWith(p));
      if (!allowed) {
        router.replace("/dashboard/regulator");
      }
    }
  }, [isAuthenticated, isRegulator, isAdmin, pathname, router]);

  if (!isAuthenticated) {
    return sessionExpired ? (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="bg-white dark:bg-navy-700 rounded-xl shadow-lg p-8 max-w-sm text-center space-y-4">
          <div className="text-amber-500 text-4xl">⏱</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session Expired</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your session expired due to inactivity. Please log in again.
          </p>
          <button
            onClick={() => { setSessionExpired(false); router.replace("/login"); }}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Log In
          </button>
        </div>
      </div>
    ) : null;
  }

  return (
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
  );
}
