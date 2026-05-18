"use client";

import { useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useRegisterCustomerMutation } from "@/redux/slices/api/customersApi";
import { useAppSelector } from "@/redux/store";
import type { EntityType } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RegisterCustomerModal({ open, onClose }: Props) {
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const [register, { isLoading }] = useRegisterCustomerMutation();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    external_id: "",
    entity_type: "INDIVIDUAL" as EntityType,
    name: "",
    email: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  // Focus trap: focus first input when opened
  useEffect(() => {
    if (open) {
      const firstInput = dialogRef.current?.querySelector<HTMLInputElement>("input");
      firstInput?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.external_id.trim()) {
      errs.external_id = "External ID is required";
    } else if (form.external_id.length < 2) {
      errs.external_id = "External ID must be at least 2 characters";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email format";
    }
    if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone)) {
      errs.phone = "Invalid phone (7-15 digits, optional +)";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;
    try {
      const res = await register({
        ...form,
        client_id: clientId,
      }).unwrap();
      setSuccess(`Customer ${res.external_id} registered at ${res.current_tier}`);
      setForm({ external_id: "", entity_type: "INDIVIDUAL", name: "", email: "", phone: "" });
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="register-modal-title" ref={dialogRef}>
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <h2 id="register-modal-title" className="text-lg font-semibold dark:text-white">Register Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="reg-external-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External ID *</label>
            <input
              id="reg-external-id"
              required
              value={form.external_id}
              onChange={(e) => { setForm({ ...form, external_id: e.target.value }); setFieldErrors((p) => ({ ...p, external_id: "" })); }}
              className={`w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${fieldErrors.external_id ? "border-red-400 dark:border-red-500" : ""}`}
              placeholder="USR-001 or unique identifier"
              aria-describedby={fieldErrors.external_id ? "reg-external-id-err" : undefined}
            />
            {fieldErrors.external_id && <p id="reg-external-id-err" className="text-xs text-red-500 mt-1">{fieldErrors.external_id}</p>}
          </div>
          <div>
            <label htmlFor="reg-entity-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
            <select
              id="reg-entity-type"
              value={form.entity_type}
              onChange={(e) => setForm({ ...form, entity_type: e.target.value as EntityType })}
              className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="INDIVIDUAL">Individual (KYC)</option>
              <option value="BUSINESS">Business (KYB)</option>
            </select>
          </div>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              id="reg-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "" })); }}
                className={`w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${fieldErrors.email ? "border-red-400 dark:border-red-500" : ""}`}
                aria-describedby={fieldErrors.email ? "reg-email-err" : undefined}
              />
              {fieldErrors.email && <p id="reg-email-err" className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                id="reg-phone"
                value={form.phone}
                onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFieldErrors((p) => ({ ...p, phone: "" })); }}
                className={`w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${fieldErrors.phone ? "border-red-400 dark:border-red-500" : ""}`}
                aria-describedby={fieldErrors.phone ? "reg-phone-err" : undefined}
              />
              {fieldErrors.phone && <p id="reg-phone-err" className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{error}</p>}
          {success && <p role="status" className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">{success}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Registering..." : "Register Customer"}
          </button>
        </form>
      </div>
    </div>
  );
}
