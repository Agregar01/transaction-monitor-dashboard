"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch } from "@/redux/store";
import { setCredentials } from "@/redux/slices/authSlice";
import { API_V1 } from "@/config/api";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function getSafeRedirect(params: URLSearchParams): string {
  const redirect = params.get("redirect") || "/dashboard";
  // Validate redirect is a safe relative path (prevent open redirect)
  if (redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("://")) {
    return redirect;
  }
  return "/dashboard";
}

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingLogin, setPendingLogin] = useState<{
    client_id: string;
    name: string;
    is_admin: boolean;
    is_regulator?: boolean;
    is_team_member?: boolean;
    user_role?: string | null;
    mfa_pending_token?: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_V1}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 401) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      if (res.status === 423) {
        setError("Account temporarily locked due to too many failed attempts. Try again in 30 minutes.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.detail || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Check if MFA is required
      if (data.mfa_required) {
        setPendingLogin({
          client_id: data.client_id,
          name: data.name || "",
          is_admin: data.is_admin || false,
          is_regulator: data.is_regulator || false,
          is_team_member: data.is_team_member,
          user_role: data.user_role,
          mfa_pending_token: data.mfa_pending_token,
        });
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      // Read CSRF token from cookie (double-submit cookie pattern)
      const csrfToken = getCookie("__csrf");

      dispatch(
        setCredentials({
          clientId: data.client_id,
          clientName: data.name || "",
          isAdmin: data.is_admin || false,
          isRegulator: data.is_regulator || false,
          isTeamMember: data.is_team_member || false,
          userRole: data.user_role || null,
          csrfToken: csrfToken || null,
        })
      );

      // Route regulators to their dashboard
      if (data.is_regulator) {
        router.push("/dashboard/regulator");
      } else {
        router.push(getSafeRedirect(searchParams));
      }
    } catch {
      setError("Connection failed. Is the KYC Engine running?");
    }
    setLoading(false);
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_V1}/auth/verify-mfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pendingLogin?.mfa_pending_token, code: mfaCode }),
      });
      if (res.status === 401) {
        setError("Invalid MFA code. Please try again.");
        setLoading(false);
        return;
      }
      if (res.status === 400) {
        setError("MFA session expired. Please log in again.");
        setMfaRequired(false);
        setMfaCode("");
        setPendingLogin(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.detail || "MFA verification failed.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      // Proxy sets httpOnly cookies; read CSRF from cookie
      const csrfToken = getCookie("__csrf");
      dispatch(
        setCredentials({
          clientId: data.client_id,
          clientName: data.name || "",
          isAdmin: data.is_admin || false,
          isRegulator: data.is_regulator || false,
          isTeamMember: data.is_team_member || false,
          userRole: data.user_role || null,
          csrfToken: csrfToken || null,
        })
      );
      if (data.is_regulator) {
        router.push("/dashboard/regulator");
      } else {
        router.push(getSafeRedirect(searchParams));
      }
    } catch {
      setError("Connection failed.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/images/agregar-brand-logo.png"
            alt="Agregar"
            width={200}
            height={50}
            className="mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Deferred KYC Engine</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to your dashboard</p>
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 overflow-hidden">
          {mfaRequired ? (
            <form onSubmit={handleMfaVerify} className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Enter the 6-digit code from your authenticator app</p>
              </div>
              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">MFA Code</label>
                <input
                  id="mfa-code"
                  required
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2.5 text-sm text-center tracking-widest text-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{error}</p>}
              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(""); setError(""); setPendingLogin(null); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Back to login
              </button>
            </form>
          ) : (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                id="login-email"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-primary hover:text-primary-600">
                Forgot password?
              </Link>
            </div>

            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          )}
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:text-primary-600 font-medium">
              Sign up &rarr;
            </Link>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Powered by Agregar Technologies
          </p>
        </div>
      </div>
    </div>
  );
}
