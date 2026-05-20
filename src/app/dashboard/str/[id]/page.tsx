"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  useGetSTRQuery,
  useUpdateSTRMutation,
  useFileSTRMutation,
  strXmlUrl,
} from "@/redux/slices/api/strApi";
import { SkeletonCard } from "@/components/Skeleton";
import ActionBadge from "@/components/ActionBadge";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";

export default function STRDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: str, isLoading, error } = useGetSTRQuery(id);
  const [updateSTR, { isLoading: saving }] = useUpdateSTRMutation();
  const [fileSTR, { isLoading: filing }] = useFileSTRMutation();

  const [narrative, setNarrative] = useState<string | null>(null);

  if (isLoading) return <SkeletonCard />;
  if (error || !str) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        Failed to load STR {id}.
      </div>
    );
  }

  const onSave = async () => {
    if (narrative === null || narrative === str.narrative) return;
    try {
      await updateSTR({ id, narrative }).unwrap();
      showToast({ type: "success", title: "Saved", message: "STR narrative updated." });
      setNarrative(null);
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: errorMessage(e) });
    }
  };

  const onFile = async () => {
    if (!confirm("File this STR? This triggers a four-eyes approval that another user must confirm.")) {
      return;
    }
    try {
      const res = (await fileSTR({ id }).unwrap()) as { approval_id?: string };
      if (res.approval_id) {
        showToast({
          type: "info",
          title: "Awaiting approval",
          message: `Approval ID ${res.approval_id.slice(0, 8)}…`,
        });
        router.push("/dashboard/approvals");
      } else {
        showToast({ type: "success", title: "Filed", message: "STR filed without approval queue." });
      }
    } catch (e) {
      showToast({ type: "error", title: "Filing failed", message: errorMessage(e) });
    }
  };

  const isDraft = str.status === "DRAFT";
  const isFiled = str.status === "FILED";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">STR</p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{str.subject_name}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Link
              href={`/dashboard/cases/${str.case_id}`}
              className="text-primary hover:underline font-mono"
            >
              ← {str.case_id.slice(0, 8)}…
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionBadge action={str.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</p>
          <p className="mt-1 text-2xl font-mono text-gray-900 dark:text-white">
            {str.total_amount.toLocaleString()}{" "}
            <span className="text-base text-gray-500 dark:text-gray-400">{str.currency}</span>
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Activity</p>
          <p className="mt-1 text-gray-900 dark:text-white">{str.suspicious_activity_type}</p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Filing</p>
          <p className="mt-1 text-gray-900 dark:text-white">
            {str.filing_reference ?? "—"}
          </p>
          {str.filed_at && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {new Date(str.filed_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Narrative
          </h2>
          {!isDraft && (
            <span className="text-xs text-gray-400">Read-only after filing</span>
          )}
        </div>
        {isDraft ? (
          <>
            <textarea
              rows={10}
              value={narrative ?? str.narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={onSave}
              disabled={saving || narrative === null || narrative === str.narrative}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save narrative"}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{str.narrative}</p>
        )}
      </section>

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isDraft ? "Ready to file?" : isFiled ? "goAML XML" : "Withdrawn"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isDraft
              ? "Filing creates a four-eyes approval. Another COMPLIANCE_OFFICER or SYSTEM_ADMIN must approve before the report is filed."
              : isFiled
              ? "Download the regulator-ready XML."
              : "This STR was withdrawn."}
          </p>
        </div>
        {isDraft && (
          <button
            onClick={onFile}
            disabled={filing}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {filing ? "Submitting…" : "File STR"}
          </button>
        )}
        {isFiled && (
          <a
            href={strXmlUrl(str.id)}
            download
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600"
          >
            Download goAML XML
          </a>
        )}
      </section>
    </div>
  );
}
