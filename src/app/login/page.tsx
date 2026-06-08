"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAppDispatch } from "@/redux/store";
import { setCredentials } from "@/redux/slices/authSlice";
import { API_V1 } from "@/config/api";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

function getSafeRedirect(params: URLSearchParams): string {
  const redirect = params.get("redirect") ?? "/dashboard";
  if (redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("://")) {
    return redirect;
  }
  return "/dashboard";
}

interface LoginResponse {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  permissions: string[];
  csrf_token: string;
  jurisdiction_code: string | null;
  jurisdiction_display_name: string | null;
  features: { ctr: boolean; str: boolean; sanctions: boolean; ml: boolean } | null;
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

      if (!res.ok) {
        if (res.status === 401) {
          setError("Invalid email or password");
        } else if (res.status === 502) {
          setError("Cannot reach the transaction monitor backend");
        } else {
          let detail = `Login failed (${res.status})`;
          try {
            const body = await res.json();
            if (body.detail) detail = body.detail;
          } catch {
            // keep default
          }
          setError(detail);
        }
        return;
      }

      const data: LoginResponse = await res.json();
      dispatch(
        setCredentials({
          userId: data.user_id,
          email: data.email,
          fullName: data.full_name,
          roles: data.roles,
          permissions: data.permissions,
          csrfToken: data.csrf_token,
          jurisdictionCode: data.jurisdiction_code,
          jurisdictionDisplayName: data.jurisdiction_display_name,
          features: data.features,
        }),
      );

      router.replace(getSafeRedirect(searchParams));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-700 px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-navy-600 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <Image
            src="/images/Autheo_this.png"
            alt="Autheo"
            width={160}
            height={42}
            priority
            className="mx-auto"
          />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Transaction Monitor
          </h1>
          <p className="text-sm text-gray-500 dark:text-navy-200">
            AML/CFT analyst console — sign in to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-navy-100 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="analyst@autheo.test"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-navy-100 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-white"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 dark:text-navy-300">
          Autheo Transaction Monitoring System
        </p>
      </div>
    </div>
  );
}
