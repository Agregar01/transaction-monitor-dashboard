"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useGetTenantInfoQuery } from "@/redux/slices/api/tenantApi";
import { useCreateSTRMutation } from "@/redux/slices/api/strApi";
import { showToast } from "@/components/Toast";

export default function STRNewPage() {
  const router = useRouter();
  const search = useSearchParams();
  const caseId = search.get("case_id") ?? "";
  const { jurisdictionCode } = useAppSelector((s) => s.auth);
  const { data: tenant } = useGetTenantInfoQuery();
  const [createSTR, { isLoading }] = useCreateSTRMutation();

  const [subjectCustomerId, setSubjectCustomerId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [activityType, setActivityType] = useState("STRUCTURING");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [narrative, setNarrative] = useState("");
  const [jurisdictionId, setJurisdictionId] = useState(
    jurisdictionCode ?? tenant?.jurisdiction_code ?? "GHA",
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) {
      showToast({ type: "error", title: "Missing case", message: "STR must be drafted from a case." });
      return;
    }
    if (!narrative.trim()) {
      showToast({ type: "warning", title: "Narrative required", message: "Add a narrative before drafting." });
      return;
    }
    try {
      const draft = await createSTR({
        case_id: caseId,
        subject_customer_id: subjectCustomerId,
        subject_name: subjectName,
        suspicious_activity_type: activityType,
        total_amount: Number(amount),
        currency,
        narrative,
        jurisdiction_id: jurisdictionId,
      }).unwrap();
      showToast({ type: "success", title: "STR drafted", message: subjectName });
      router.push(`/dashboard/str/${draft.id}`);
    } catch (err) {
      showToast({ type: "error", title: "Draft failed", message: String(err) });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Draft STR</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {caseId ? (
            <>
              Linked to case <span className="font-mono">{caseId.slice(0, 8)}…</span>. Fill in the
              subject, amount, and narrative. Filing requires four-eyes approval.
            </>
          ) : (
            <span className="text-red-600">No case_id in the URL — open this page from a case.</span>
          )}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Subject customer ID
            </label>
            <input
              required
              value={subjectCustomerId}
              onChange={(e) => setSubjectCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Subject name
            </label>
            <input
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Suspicious activity type
          </label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="STRUCTURING">Structuring</option>
            <option value="LAYERING">Layering</option>
            <option value="MULES">Mule activity</option>
            <option value="CROSS_BORDER">Cross-border anomaly</option>
            <option value="SANCTIONS">Sanctions match</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Total amount
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Currency
            </label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Jurisdiction
          </label>
          <select
            value={jurisdictionId}
            onChange={(e) => setJurisdictionId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            {(tenant?.supported_jurisdictions ?? ["GHA", "NGA", "KEN"]).map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Narrative
          </label>
          <textarea
            required
            rows={8}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Describe the suspicious pattern, supporting evidence, and recommended actions…"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !caseId}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? "Drafting…" : "Save draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
