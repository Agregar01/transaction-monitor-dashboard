"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { API_V1 } from "@/config/api";
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface InviteInfo {
  name: string;
  email: string;
  client_name: string;
  role: string;
  expired: boolean;
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [preflightError, setPreflightError] = useState("");
  const [preflightLoading, setPreflightLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ name: string; client_name: string } | null>(null);

  useEffect(() => {
    document.title = "Accept Invitation | Autheo";
  }, []);

  // Redirect authenticated users away
  useEffect(() => {
    const cookies = document.cookie;
    if (cookies.includes("__sid=")) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Pre-validate the invite token on mount
  useEffect(() => {
    if (!token) {
      setPreflightLoading(false);
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(`${API_V1}/auth/invite-info?token=${encodeURIComponent(token)}`);
        if (res.status === 404) {
          setPreflightError("This invitation link is invalid. It may have already been used.");
        } else if (res.status === 400) {
          setPreflightError("This invitation has already been accepted. Please log in instead.");
        } else if (!res.ok) {
          setPreflightError("Unable to validate this invitation link.");
        } else {
          const data: InviteInfo = await res.json();
          if (data.expired) {
            setPreflightError("This invitation has expired. Please ask your administrator to resend it.");
          } else {
            setInviteInfo(data);
          }
        }
      } catch {
        setPreflightError("Connection failed. Please try again.");
      }
      setPreflightLoading(false);
    };
    validate();
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Image src="/images/agregar-brand-logo.png" alt="Agregar" width={200} height={50} className="mx-auto" />
          <div className="mt-8 bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 p-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invalid Invitation Link</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This link is missing the invitation token. Please use the link from your invitation email.
            </p>
            <Link href="/login" className="inline-block mt-4 text-primary hover:text-primary-600 text-sm font-medium">
              Go to Login &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (preflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Image src="/images/agregar-brand-logo.png" alt="Agregar" width={200} height={50} className="mx-auto" />
          <div className="mt-8 bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 p-6">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Validating invitation&hellip;</p>
          </div>
        </div>
      </div>
    );
  }

  if (preflightError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Image src="/images/agregar-brand-logo.png" alt="Agregar" width={200} height={50} className="mx-auto" />
          <div className="mt-8 bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 p-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invitation Unavailable</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{preflightError}</p>
            <Link href="/login" className="inline-block mt-4 text-primary hover:text-primary-600 text-sm font-medium">
              Go to Login &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(password)) {
      setError("Password must contain uppercase, lowercase, digit, and special character.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_V1}/auth/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.detail || "Failed to accept invitation. The link may be expired.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSuccess({ name: data.name, client_name: data.client_name });
    } catch {
      setError("Connection failed. Please try again.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Image src="/images/agregar-brand-logo.png" alt="Agregar" width={200} height={50} className="mx-auto" />
          <div className="mt-8 bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 p-6">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Welcome, {success.name}!</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You&apos;ve successfully joined <strong className="text-gray-700 dark:text-gray-300">{success.client_name}</strong>.
              Your account is ready.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-6 w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Sign In to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/images/agregar-brand-logo.png" alt="Agregar" width={200} height={50} className="mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Accept Invitation</h1>
          {inviteInfo && (
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Hi <strong className="text-gray-700 dark:text-gray-200">{inviteInfo.name}</strong>, you&apos;re joining{" "}
              <strong className="text-gray-700 dark:text-gray-200">{inviteInfo.client_name}</strong> as{" "}
              <span className="text-primary font-medium">{inviteInfo.role}</span>
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="invite-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="invite-pw"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="At least 8 characters"
                  minLength={8}
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
            <div>
              <label htmlFor="invite-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="invite-confirm"
                  required
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Re-enter your password"
                  minLength={8}
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

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Setting up..." : "Set Password & Join"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary-600 font-medium">
              Sign in &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
