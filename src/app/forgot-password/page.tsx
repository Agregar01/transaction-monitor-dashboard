"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { API_V1 } from "@/config/api";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Forgot Password | Autheo";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_V1}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.");
        setLoading(false);
        return;
      }
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } catch {
      setError("Connection failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/images/agregar-brand-logo.png" alt="Agregar" width={200} height={50} className="mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Forgot Password</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {submitted ? "Check your inbox" : "Enter your email to receive a reset link"}
          </p>
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 p-6">
          {submitted ? (
            <div className="text-center space-y-4">
              <EnvelopeIcon className="h-12 w-12 text-primary mx-auto" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                If <strong>{email}</strong> is registered, we&apos;ve sent a password reset link.
                The link expires in 1 hour.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="text-primary hover:text-primary-600 underline"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="you@company.com"
                />
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
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-primary hover:text-primary-600 font-medium">
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
