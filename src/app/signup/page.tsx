"use client";

import { useState } from "react";
import Link from "next/link";
import { API_V1 } from "@/config/api";

const INSTITUTION_TYPES = [
  { value: "BANK", label: "Bank" },
  { value: "FINTECH", label: "Fintech" },
  { value: "MOMO_PROVIDER", label: "Mobile Money Operator" },
  { value: "REGULATOR", label: "Regulator (EOCO / FIC)" },
] as const;

const JURISDICTIONS = [
  { value: "GHA", label: "Ghana" },
  { value: "NGA", label: "Nigeria" },
  { value: "KEN", label: "Kenya" },
] as const;

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    institution_type: "BANK",
    jurisdiction_code: "GHA",
    contact_email: "",
    contact_name: "",
    phone: "",
    use_case: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Institution name is required";
    if (!form.contact_email.trim()) {
      errs.contact_email = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      errs.contact_email = "Invalid email format";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_V1}/institutions/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail =
          res.status === 409
            ? "A signup request already exists for this email."
            : data?.detail || "Submission failed. Please try again.";
        setErrors({ contact_email: typeof detail === "string" ? detail : "Submission failed." });
        return;
      }
      setSubmitted(true);
    } catch {
      setErrors({ contact_email: "Could not reach the server. Please try again later." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const errCls = "border-red-400 dark:border-red-500";

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900 px-4 py-12">
        <div className="w-full max-w-md bg-white dark:bg-navy-700 rounded-2xl shadow-xl p-8 text-center space-y-5">
          <div className="text-green-500 text-5xl">&#10003;</div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Check your email</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We&apos;ve sent a verification link to <strong>{form.contact_email}</strong>. Click it to
            confirm your address — then our team reviews your application.
          </p>
          <div className="bg-gray-50 dark:bg-navy-600 rounded-lg p-4 text-left text-sm space-y-1">
            <p className="text-gray-500 dark:text-gray-400 mb-1">What happens next:</p>
            <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 space-y-1">
              <li>Verify your email from the link we sent</li>
              <li>Agregar reviews and approves your institution</li>
              <li>You receive an invite to set your password and sign in</li>
            </ol>
          </div>
          <Link href="/login" className="inline-block text-primary hover:text-primary-600 text-sm font-medium">
            Already have an account? Sign in &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900 px-4 py-12">
      <div className="w-full max-w-lg bg-white dark:bg-navy-700 rounded-2xl shadow-xl">
        <div className="px-8 pt-8 pb-2 text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Register your institution</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Apply for access to the Autheo Transaction Monitor. We review every application before activation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-4">
          <div>
            <label htmlFor="su-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Institution Name *
            </label>
            <input
              id="su-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={`${inputCls} ${errors.name ? errCls : ""}`}
              placeholder="First Bank of Ghana"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="su-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Institution Type *
              </label>
              <select
                id="su-type"
                value={form.institution_type}
                onChange={(e) => setField("institution_type", e.target.value)}
                className={inputCls}
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="su-jur" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jurisdiction *
              </label>
              <select
                id="su-jur"
                value={form.jurisdiction_code}
                onChange={(e) => setField("jurisdiction_code", e.target.value)}
                className={inputCls}
              >
                {JURISDICTIONS.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="su-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Email *
              </label>
              <input
                id="su-email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setField("contact_email", e.target.value)}
                className={`${inputCls} ${errors.contact_email ? errCls : ""}`}
                placeholder="admin@firstbank.com"
              />
              {errors.contact_email && <p className="text-xs text-red-500 mt-1">{errors.contact_email}</p>}
            </div>
            <div>
              <label htmlFor="su-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Name
              </label>
              <input
                id="su-contact"
                value={form.contact_name}
                onChange={(e) => setField("contact_name", e.target.value)}
                className={inputCls}
                placeholder="Kwame Mensah"
              />
            </div>
          </div>

          <div>
            <label htmlFor="su-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <input
              id="su-phone"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className={inputCls}
              placeholder="+233 20 000 0000"
            />
          </div>

          <div>
            <label htmlFor="su-usecase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Use Case
            </label>
            <textarea
              id="su-usecase"
              value={form.use_case}
              onChange={(e) => setField("use_case", e.target.value)}
              className={inputCls}
              rows={3}
              placeholder="How you plan to use the platform (e.g. monitoring mobile money AML flows)"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary-600 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
