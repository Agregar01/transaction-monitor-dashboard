"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useCreateCaseMutation } from "@/redux/slices/api/casesApi";
import { useGetTenantInfoQuery } from "@/redux/slices/api/tenantApi";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { CaseType, CasePriority } from "@/types/api";

export default function NewCasePage() {
  const router = useRouter();
  const { jurisdictionCode } = useAppSelector((s) => s.auth);
  const { data: tenant } = useGetTenantInfoQuery();
  const [createCase, { isLoading }] = useCreateCaseMutation();

  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("AML");
  const [priority, setPriority] = useState<CasePriority>("MEDIUM");
  const [jurisdictionId, setJurisdictionId] = useState(jurisdictionCode ?? tenant?.jurisdiction_code ?? "GHA");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const newCase = await createCase({
        title,
        case_type: caseType,
        priority,
        jurisdiction_id: jurisdictionId,
      }).unwrap();
      showToast({ type: "success", title: "Case created", message: title });
      router.push(`/dashboard/cases/${newCase.id}`);
    } catch (err) {
      showToast({ type: "error", title: "Create failed", message: errorMessage(err) });
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">New case</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Open an investigation case. Alerts can be linked from the case detail page.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4"
      >
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Suspicious mobile money structuring — customer X"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Type
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            >
              <option value="AML">AML</option>
              <option value="FRAUD">FRAUD</option>
              <option value="SANCTIONS">SANCTIONS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CasePriority)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            >
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
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
            disabled={isLoading || !title.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? "Creating…" : "Create case"}
          </button>
        </div>
      </form>
    </div>
  );
}
