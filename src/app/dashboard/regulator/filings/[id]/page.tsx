"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGetFilingQuery } from "@/redux/slices/api/filingsApi";
import { API_V1 } from "@/config/api";
import RegulatorGuard from "@/components/RegulatorGuard";
import QueryState from "@/components/QueryState";
import { showToast } from "@/components/Toast";
import { ArrowLeftIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const humanize = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function renderValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

export default function FilingDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const { data, isLoading, isError, error } = useGetFilingQuery(id);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.title = "Filing Detail | Transaction Monitor";
  }, []);

  const downloadGoaml = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_V1}/filings/${id}/goaml`, { credentials: "same-origin" });
      if (!res.ok) {
        const msg =
          res.status === 409
            ? "goAML XML was not captured for this filing."
            : `Download failed (${res.status}).`;
        showToast({ type: "error", title: "Download failed", message: msg });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.filing_reference}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast({ type: "error", title: "Download failed", message: "Could not reach the server." });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <Link
          href="/dashboard/regulator/filings"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to filed reports
        </Link>

        <QueryState isLoading={isLoading} isError={isError} error={error} cols={2} rows={6}>
          {data && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                    {data.filing_reference}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {data.report_type} · {data.jurisdiction_code} · filed{" "}
                    {new Date(data.filed_at).toLocaleString()}
                  </p>
                </div>
                {data.has_goaml_xml && (
                  <button
                    onClick={downloadGoaml}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {downloading ? "Downloading…" : "Download goAML XML"}
                  </button>
                )}
              </div>

              <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Report snapshot</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(data.snapshot_data ?? {}).map(([k, v]) => {
                    const val = renderValue(v);
                    const isLong = val.length > 80 || val.includes("\n");
                    return (
                      <div key={k} className={isLong ? "sm:col-span-2" : ""}>
                        <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {humanize(k)}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                          {val}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>

              <p className="text-xs text-gray-400">
                This is an immutable snapshot captured at filing time — it does not change if the source
                report is later edited.
              </p>
            </>
          )}
        </QueryState>
      </div>
    </RegulatorGuard>
  );
}
