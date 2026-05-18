"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    use_case: "",
    password: "",
    confirm_password: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.company_name.trim()) errs.company_name = "Company name is required";
    if (!form.contact_name.trim()) errs.contact_name = "Contact name is required";
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email format";
    }
    if (!form.use_case.trim()) errs.use_case = "Please describe your use case";
    if (!form.password) {
      errs.password = "Password is required";
    } else if (form.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.password)) {
      errs.password = "Password must contain an uppercase letter";
    } else if (!/[a-z]/.test(form.password)) {
      errs.password = "Password must contain a lowercase letter";
    } else if (!/\d/.test(form.password)) {
      errs.password = "Password must contain a digit";
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(form.password)) {
      errs.password = "Password must contain a special character";
    }
    if (form.password !== form.confirm_password) {
      errs.confirm_password = "Passwords do not match";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirm_password, ...payload } = form;
      const res = await fetch("/api/proxy/api/v1/signup-requests/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFieldErrors({ email: data?.detail || "Submission failed. Please try again." });
        return;
      }
    } catch {
      setFieldErrors({ email: "Could not connect to the server. Please try again later." });
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-primary-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-navy-700 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-6">
          <div className="text-green-500 text-5xl">&#10003;</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request Submitted</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Thank you, <strong>{form.contact_name}</strong>. Our team will review your application
            and notify you at <strong>{form.email}</strong> within 1-2 business days.
          </p>
          <div className="bg-gray-50 dark:bg-navy-600 rounded-lg p-4 text-left text-sm space-y-2">
            <p className="text-gray-500 dark:text-gray-400">What happens next:</p>
            <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 space-y-1">
              <li>Our team reviews your application</li>
              <li>Once approved, your account is activated</li>
              <li>Log in with your email and password</li>
              <li>Find your API key in the dashboard for integration</li>
            </ol>
          </div>
          <Link
            href="/login"
            className="inline-block text-primary hover:text-primary-600 text-sm font-medium"
          >
            Already have an account? Log in &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = "w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500";
  const errorInput = "border-red-400 dark:border-red-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-primary-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-700 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-8 pt-8 pb-4 text-center space-y-3">
          <Image src="/images/agregar-brand-logo.png" alt="Agregar" width={140} height={36} className="mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Get Started with Autheo</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Apply for API access to the Deferred KYC Engine. We&apos;ll review your application and send credentials within 1-2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          <div>
            <label htmlFor="signup-company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
            <input
              id="signup-company"
              value={form.company_name}
              onChange={(e) => { setForm({ ...form, company_name: e.target.value }); setFieldErrors((p) => ({ ...p, company_name: "" })); }}
              className={`${inputCls} ${fieldErrors.company_name ? errorInput : ""}`}
              placeholder="Acme Bank Ghana"
            />
            {fieldErrors.company_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.company_name}</p>}
          </div>

          <div>
            <label htmlFor="signup-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name *</label>
            <input
              id="signup-contact"
              value={form.contact_name}
              onChange={(e) => { setForm({ ...form, contact_name: e.target.value }); setFieldErrors((p) => ({ ...p, contact_name: "" })); }}
              className={`${inputCls} ${fieldErrors.contact_name ? errorInput : ""}`}
              placeholder="Kwame Asante"
            />
            {fieldErrors.contact_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "" })); }}
                className={`${inputCls} ${fieldErrors.email ? errorInput : ""}`}
                placeholder="kwame@acmebank.com"
              />
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="signup-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                id="signup-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
                placeholder="+233 20 000 0000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-usecase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Use Case *</label>
            <textarea
              id="signup-usecase"
              value={form.use_case}
              onChange={(e) => { setForm({ ...form, use_case: e.target.value }); setFieldErrors((p) => ({ ...p, use_case: "" })); }}
              className={`${inputCls} ${fieldErrors.use_case ? errorInput : ""}`}
              placeholder="Describe how you plan to use the Deferred KYC Engine (e.g., mobile money onboarding, digital banking, etc.)"
              rows={3}
            />
            {fieldErrors.use_case && <p className="text-xs text-red-500 mt-1">{fieldErrors.use_case}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
              <input
                id="signup-password"
                type="password"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((p) => ({ ...p, password: "" })); }}
                className={`${inputCls} ${fieldErrors.password ? errorInput : ""}`}
                placeholder="Min. 8 characters"
              />
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>
            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
              <input
                id="signup-confirm"
                type="password"
                value={form.confirm_password}
                onChange={(e) => { setForm({ ...form, confirm_password: e.target.value }); setFieldErrors((p) => ({ ...p, confirm_password: "" })); }}
                className={`${inputCls} ${fieldErrors.confirm_password ? errorInput : ""}`}
                placeholder="Re-enter password"
              />
              {fieldErrors.confirm_password && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm_password}</p>}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Submit Application
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary-600 font-medium">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
