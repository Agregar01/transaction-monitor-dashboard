"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useGetInstitutionQuery,
  useSetAnalystCaseAccessMutation,
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

  const { data, isLoading, isError, error } = useGetInstitutionQuery(institutionId ?? "", {
    skip: !institutionId,
  });
  const [setMode, { isLoading: saving }] = useSetAnalystCaseAccessMutation();
  const [pending, setPending] = useState<CaseAccessMode | null>(null);
  // Optimistic override: GET /institutions/{id} doesn't yet echo the field, so
  // fall back to what we last set (or the default) to show the active mode.
  const [applied, setApplied] = useState<CaseAccessMode | null>(null);

  const current = applied ?? data?.analyst_case_access ?? DEFAULT_MODE;

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
      </QueryState>
    </div>
  );
}
