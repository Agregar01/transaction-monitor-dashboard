"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_V1 } from "@/config/api";
import { useAppDispatch } from "@/redux/store";
import { logout } from "@/redux/slices/authSlice";
import { baseApi } from "@/redux/slices/api/baseApi";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

function AcceptInviteInner() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (): string | null => {
    if (password.length < 12) return "Password must be at least 12 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("This invite link is missing its token.");
      return;
    }
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_V1}/auth/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.detail || "This invite is invalid or has expired.");
        return;
      }
      // Account activated. Clear ANY pre-existing session in this browser first
      // — e.g. an admin who invited the user and clicked the link in the same
      // browser. Otherwise the middleware bounces /login → that stale session's
      // dashboard, landing the new user on the wrong account. Then send them to
      // a clean login to sign in with their brand-new password.
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        /* best-effort cookie clear */
      }
      dispatch(baseApi.util.resetApiState());
      dispatch(logout());
      setDone(true);
      setTimeout(() => router.replace("/login"), 1800);
    } catch {
      setError("Could not reach the server. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900 px-4 py-12">
        <div className="w-full max-w-md bg-white dark:bg-navy-700 rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="text-green-500 text-5xl">&#10003;</div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Account activated</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full px-3 py-2 pr-10 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900 px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-navy-700 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Set your password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a password to activate your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ai-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New password
            </label>
            <div className="relative">
              <input
                id="ai-pw"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 12 characters"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-white"
              >
                {show ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="ai-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm password
            </label>
            <input
              id="ai-confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Re-enter password"
            />
          </div>

          {error && (
            <div role="alert" className="px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Activating…" : "Activate account"}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            <Link href="/login" className="text-primary hover:text-primary-600 font-medium">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
