"use client";

import { useEffect, useState } from "react";
import ActionBadge from "@/components/ActionBadge";
import QueryState from "@/components/QueryState";
import TravelRuleTabs from "@/components/TravelRuleTabs";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { useAppSelector } from "@/redux/store";
import { useListTravelRuleProfilesQuery, useRequestProfileVersionMutation } from "@/redux/slices/api/travelRuleApi";
import type { TravelRuleProfile } from "@/types/api";

const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";

const EDITABLE: { key: keyof TravelRuleProfile; label: string; kind: "number" | "text" | "select"; options?: string[] }[] = [
  { key: "legal_status", label: "Legal status", kind: "select", options: ["CONFIRMED", "UNCONFIRMED"] },
  { key: "source_reference", label: "Source reference", kind: "text" },
  { key: "threshold_amount", label: "Full data set threshold", kind: "number" },
  { key: "data_set_version", label: "Data set", kind: "select", options: ["FATF_2021", "ZA_DIRECTIVE_9"] },
  { key: "unhosted_policy", label: "Unhosted wallets", kind: "select", options: ["ALLOW", "REQUIRE_OWNERSHIP_PROOF", "BLOCK"] },
  { key: "ownership_proof_threshold", label: "Ownership proof from", kind: "number" },
  { key: "unregistered_counterparty_policy", label: "Unassessed counterparty", kind: "select", options: ["ALLOW", "HOLD", "BLOCK"] },
  { key: "inbound_missing_info_policy", label: "Inbound missing data", kind: "select", options: ["SUSPEND", "REQUEST_INFO", "RETURN", "EXECUTE_AND_FLAG"] },
  { key: "inbound_grace_minutes", label: "Inbound grace (minutes)", kind: "number" },
  { key: "request_info_deadline_hours", label: "Request info deadline (hours)", kind: "number" },
  { key: "retention_years", label: "Retention (years)", kind: "number" },
];

const INT_FIELDS = new Set(["inbound_grace_minutes", "request_info_deadline_hours", "retention_years"]);

function VersionForm({ profile }: { profile: TravelRuleProfile }) {
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [request, { isLoading }] = useRequestProfileVersionMutation();
  const submit = async () => {
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(changes)) {
      if (v === "") continue;
      body[k] = INT_FIELDS.has(k) ? parseInt(v, 10) : v;
    }
    if (Object.keys(body).length === 0) return;
    try {
      await request({ code: profile.jurisdiction_code, changes: body }).unwrap();
      showToast({ type: "success", title: "New version requested", message: "A second platform user approves it on the Approvals page." });
      setChanges({});
    } catch (e) {
      showToast({ type: "error", title: "Request failed", message: errorMessage(e) });
    }
  };
  return (
    <div className="mt-4 border-t border-gray-100 dark:border-navy-600 pt-4 space-y-3">
      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Propose a new version (four-eyes)</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {EDITABLE.map((f) => (
          <label key={f.key} className="text-xs text-gray-500 dark:text-gray-400">
            {f.label}
            {f.kind === "select" ? (
              <select className={INPUT} value={changes[f.key] ?? ""} onChange={(e) => setChanges({ ...changes, [f.key]: e.target.value })}>
                <option value="">unchanged ({String(profile[f.key] ?? "none")})</option>
                {f.options!.map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g, " ").toLowerCase()}</option>
                ))}
              </select>
            ) : (
              <input
                className={INPUT}
                type={f.kind === "number" ? "number" : "text"}
                placeholder={String(profile[f.key] ?? "")}
                value={changes[f.key] ?? ""}
                onChange={(e) => setChanges({ ...changes, [f.key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <button onClick={submit} disabled={isLoading} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">
        {isLoading ? "Submitting..." : "Request new version"}
      </button>
    </div>
  );
}

export default function TravelRuleProfilesPage() {
  useEffect(() => {
    document.title = "Travel Rule profiles | Transaction Monitor";
  }, []);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const institutionId = useAppSelector((s) => s.auth.institutionId);
  const canEdit = !institutionId && permissions.includes("configure_thresholds");
  const [editing, setEditing] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useListTravelRuleProfilesQuery();

  return (
    <div className="space-y-6">
      <TravelRuleTabs subtitle="Per-jurisdiction Travel Rule profiles: thresholds, data sets and policies. Changes are versioned and approved by a second platform user." />
      <QueryState isLoading={isLoading} isError={isError} error={error} isEmpty={(data ?? []).length === 0} emptyMessage="No profiles.">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {(data ?? []).map((p) => (
            <section key={p.jurisdiction_code} className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {p.jurisdiction_code} <span className="text-sm text-gray-500 dark:text-gray-400">v{p.version}{p.is_builtin ? " (built-in)" : ""}</span>
                </h2>
                <ActionBadge action={p.legal_status} />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{p.source_reference}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Full data set from</dt>
                <dd className="text-gray-900 dark:text-white">{p.threshold_amount == null ? "every transfer" : `${Number(p.threshold_amount).toLocaleString()} ${p.currency}`}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Data set</dt>
                <dd className="text-gray-900 dark:text-white">{p.data_set_version.replace(/_/g, " ")}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Unhosted wallets</dt>
                <dd className="text-gray-900 dark:text-white">{p.unhosted_policy.replace(/_/g, " ").toLowerCase()}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Unassessed counterparty</dt>
                <dd className="text-gray-900 dark:text-white">{p.unregistered_counterparty_policy.toLowerCase()}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Inbound missing data</dt>
                <dd className="text-gray-900 dark:text-white">{p.inbound_missing_info_policy.replace(/_/g, " ").toLowerCase()}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Inbound grace</dt>
                <dd className="text-gray-900 dark:text-white">{p.inbound_grace_minutes} minutes</dd>
                <dt className="text-gray-500 dark:text-gray-400">Repeat offender</dt>
                <dd className="text-gray-900 dark:text-white">{p.repeat_offender_threshold} failures in {p.repeat_offender_window_days} days</dd>
                <dt className="text-gray-500 dark:text-gray-400">Retention</dt>
                <dd className="text-gray-900 dark:text-white">{p.retention_years} years</dd>
              </dl>
              {p.legal_status !== "CONFIRMED" && (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                  Unconfirmed: placeholder values pending a published regulator threshold and data set.
                </p>
              )}
              {canEdit && (
                editing === p.jurisdiction_code ? (
                  <VersionForm profile={p} />
                ) : (
                  <button onClick={() => setEditing(p.jurisdiction_code)} className="mt-4 text-sm text-primary hover:underline">
                    Propose a change
                  </button>
                )
              )}
            </section>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
