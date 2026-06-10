"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_V1 } from "@/config/api";

type Status = "loading" | "success" | "error";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React 18 StrictMode double-invoke
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_V1}/institutions/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus("error");
          setMessage(data?.detail || "This link is invalid or has expired.");
          return;
        }
        setStatus("success");
        setMessage(data?.message || "Email verified. Your application is now pending review.");
      } catch {
        setStatus("error");
        setMessage("Could not reach the server. Please try again later.");
      }
    })();
  }, [token]);

  const resend = async () => {
    if (!resendEmail.trim()) return;
    try {
      await fetch(`${API_V1}/institutions/signup/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email: resendEmail.trim() }),
      });
    } catch {
      /* generic success regardless — backend never reveals enumeration */
    }
    setResent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900 px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-navy-700 rounded-2xl shadow-xl p-8 text-center space-y-5">
        {status === "loading" && (
          <>
            <div className="text-primary text-4xl animate-pulse">…</div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Verifying your email</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">One moment…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-500 text-5xl">&#10003;</div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Email verified</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You&apos;ll receive an invite to set your password once Agregar approves your institution.
            </p>
            <Link href="/login" className="inline-block text-primary hover:text-primary-600 text-sm font-medium">
              Go to sign in &rarr;
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 text-5xl">&#10007;</div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Verification failed</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
            {resent ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                If that email has a pending signup, a new verification link is on its way.
              </p>
            ) : (
              <div className="space-y-2 text-left">
                <label htmlFor="resend" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resend verification link
                </label>
                <div className="flex gap-2">
                  <input
                    id="resend"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="admin@firstbank.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={resend}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
