"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useGetInstitutionQuery,
  useSetAnalystCaseAccessMutation,
  useSetKycAutoThresholdMutation,
  type CaseAccessMode,
} from "@/redux/slices/api/institutionsApi";
import QueryState from "@/components/QueryState";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const MODES: { value: CaseAccessMode; label: string; blurb: string }[] = [
  {
    value: "all",
    label: "All",
    blurb: "L1 analysts see every case in the institution. Best for a small team with a unified analyst role.",
  },
  {
    value: "originator",
    label: "Originator",
    blurb: "L1 analysts see only cases they escalated or are assigned. Balanced — keeps the triage loop without an institution-wide pool.",
  },
  {
    value: "none",
    label: "None",
    blurb: "L1 analysts have no case access. Strict separation of duties — casework sits with senior/compliance roles.",
  },
];

/** Default when the backend hasn't set (or doesn't yet return) the field. */
const DEFAULT_MODE: CaseAccessMode = "originator";

export default function InstitutionPolicyPage() {
  const institutionId = useAppSelector((s) => s.auth.institutionId);
  const institutionName = useAppSelector((s) => s.auth.institutionName);
  const permissions = useAppSelector((s) => s.auth.permissions);
  // A client admin manages their own institution (manage_institution_users);
  // Agregar platform admins (manage_institutions) can manage any tenant.
  const canManage =
    permissions.includes("manage_institution_users") ||
    permissions.includes("manage_institutions");

  useEffect(() => {
    document.title = "Institution Policy | Transaction Monitor";
  }, []);

  // GET /institutions/{id} now serves the institution's own admin (backend #65),
  // returning analyst_case_access. This is the source of truth for current mode.
  const { data, isLoading, isError, error } = useGetInstitutionQuery(institutionId ?? "", {
    skip: !institutionId,
  });
  const [setMode, { isLoading: saving }] = useSetAnalystCaseAccessMutation();
  const [pending, setPending] = useState<CaseAccessMode | null>(null);
  // Optimistic override: GET /institutions/{id} doesn't yet echo the field, so
  // fall back to what we last set (or the default) to show the active mode.
  const [applied, setApplied] = useState<CaseAccessMode | null>(null);

  const current = applied ?? data?.analyst_case_access ?? DEFAULT_MODE;

  // KYC auto-initiation threshold. GET doesn't echo it yet → optimistic override.
  const [setThreshold, { isLoading: savingThreshold }] = useSetKycAutoThresholdMutation();
  const [appliedThreshold, setAppliedThreshold] = useState<number | null | undefined>(undefined);
  const currentThreshold =
    appliedThreshold !== undefined ? appliedThreshold : data?.kyc_auto_threshold ?? null;
  const [thresholdInput, setThresholdInput] = useState<string>("");

  const saveThreshold = async (value: number | null) => {
    if (!institutionId) return;
    try {
      await setThreshold({ id: institutionId, threshold: value }).unwrap();
      setAppliedThreshold(value);
      showToast({
        type: "success",
        title: "Threshold updated",
        message:
          value === null
            ? "Auto-KYC disabled — the system will notify an analyst instead."
            : `System will auto-initiate KYC at risk ≥ ${value}.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Update failed", message: errorMessage(e) });
    }
  };

  const choose = async (mode: CaseAccessMode) => {
    if (!institutionId || mode === current) return;
    setPending(mode);
    try {
      await setMode({ id: institutionId, analyst_case_access: mode }).unwrap();
      setApplied(mode);
      showToast({
        type: "success",
        title: "Policy updated",
        message: `Analyst case access set to “${mode}”. Applies on the analyst's next request.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Update failed", message: errorMessage(e) });
    } finally {
      setPending(null);
    }
  };

  if (!institutionId) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-6 rounded-xl text-sm">
        This account isn&apos;t scoped to an institution, so there is no tenant policy to manage.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Institution Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tenant-wide settings for {institutionName ?? "your institution"}.
        </p>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} rows={3} cols={1}>
        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Analyst case access
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Which cases a Level-1 (junior) analyst can see. Senior analysts and compliance are
              unaffected. Changes take effect on the analyst&apos;s next request.
            </p>
          </div>

          <div className="space-y-2">
            {MODES.map((m) => {
              const active = m.value === current;
              const busy = saving && pending === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => choose(m.value)}
                  disabled={!canManage || saving}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${
                    active
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-gray-200 dark:border-navy-500 hover:bg-gray-50 dark:hover:bg-navy-600"
                  } ${!canManage ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {m.label}
                    </span>
                    {active && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <CheckCircleIcon className="h-4 w-4" />
                        {busy ? "Saving…" : "Current"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.blurb}</p>
                </button>
              );
            })}
          </div>

          {!canManage && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              You need institution-admin rights to change this. Shown read-only.
            </p>
          )}
        </section>

        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Auto-KYC risk threshold
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              When a transaction&apos;s risk score reaches this value, the system automatically sends
              the customer a KYC document-verification link. Below it (but still STEP_UP), an analyst
              is notified instead. Leave disabled to only ever notify.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Current:{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {currentThreshold === null ? "Disabled (notify-only)" : `≥ ${currentThreshold}`}
              </span>
            </span>
          </div>

          {canManage && (
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Set threshold (0–1000)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-32 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={() => {
                  const n = parseInt(thresholdInput, 10);
                  if (Number.isNaN(n) || n < 0 || n > 1000) {
                    showToast({ type: "error", title: "Invalid", message: "Enter a number 0–1000." });
                    return;
                  }
                  saveThreshold(n);
                }}
                disabled={savingThreshold || thresholdInput.trim() === ""}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {savingThreshold ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => saveThreshold(null)}
                disabled={savingThreshold || currentThreshold === null}
                className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
              >
                Disable
              </button>
            </div>
          )}
        </section>
      </QueryState>
    </div>
  );
}
