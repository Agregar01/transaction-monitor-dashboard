"use client";

import { useEffect, useRef, useState } from "react";
import {
  useUploadBatchFileMutation,
  useGetBatchStatusQuery,
  useUploadWatchlistCsvMutation,
  useUploadCustomerProfilesCsvMutation,
} from "@/redux/slices/api/ingestionApi";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { FileUploadResponse } from "@/types/api";
import {
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const TERMINAL = new Set(["completed", "failed"]);

// ── CSV templates ────────────────────────────────────────────────────────────

// The device-bearing rows below double as a behavioral-signal demo:
//  • DEMO-002 seen twice on DEV-A1 with a changed ICCID → SIM-swap signal
//  • DEMO-003 on the SAME DEV-A1 → shared-device signal (2 distinct customers)
const TRANSACTION_TEMPLATE = [
  "customer_id,timestamp,amount,transaction_type,channel,flow_type,receiver_id,receiver_country,device_id,geo_location,is_rooted,iccid,imei,mno,ip_country,customer_name,customer_type,customer_occupation,customer_kyc_score,declared_monthly_income",
  "DEMO-001,2026-06-01T10:00:00Z,450.00,transfer,momo,,,GH,,,,,,,,,Individual,teacher,75,3000",
  "DEMO-002,2026-06-02T11:30:00Z,9500.00,deposit,agent,,,GH,DEV-A1,,false,ICC-001,IMEI-001,MTN,GH,,,,,",
  "DEMO-002,2026-06-02T14:00:00Z,9400.00,deposit,agent,,,GH,DEV-A1,,false,ICC-002,IMEI-001,MTN,GH,,,,,",
  "DEMO-003,2026-06-03T09:15:00Z,1200.00,deposit,agent,,,GH,DEV-A1,,false,ICC-003,IMEI-001,MTN,GH,,,,,",
].join("\n");

// list_name must be an EXISTING watchlist name (not a list type). Seeded names:
// OFAC_SDN, EU_SANCTIONS, UN_CONSOLIDATED, LOCAL_PEP_GHANA/NIGERIA/KENYA, FATF_HIGH_RISK_JURISDICTIONS.
const WATCHLIST_TEMPLATE = [
  "list_name,value,notes",
  "LOCAL_PEP_GHANA,Kwame Demo Minister,Cabinet member — demo PEP",
  "LOCAL_PEP_GHANA,Demo PEP Person,Politically exposed — demo",
  "OFAC_SDN,Sanctioned Demo Entity,Blocked counterparty — demo",
].join("\n");

const CUSTOMER_TEMPLATE = [
  "customer_id,is_pep,kyc_score,occupation,customer_type",
  "DEMO-002,true,85,government_official,Individual",
  "DEMO-003,false,90,teacher,Individual",
  "DEMO-004,false,60,cash_intensive_business,Merchant",
].join("\n");

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── BatchProgress ────────────────────────────────────────────────────────────

function BatchProgress({ batchId }: { batchId: string }) {
  const [poll, setPoll] = useState(2000);
  const { data } = useGetBatchStatusQuery(batchId, { skip: !batchId, pollingInterval: poll });
  useEffect(() => {
    if (data && TERMINAL.has(data.status.toLowerCase())) setPoll(0);
  }, [data]);
  if (!data) return null;
  const { progress, status } = data;
  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const done = TERMINAL.has(status.toLowerCase());
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="uppercase tracking-wider font-medium">{status}</span>
        <span>{progress.processed}/{progress.total} processed</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-navy-600 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-green-600 dark:text-green-400">{progress.successful} successful</span>
        <span className="text-red-600 dark:text-red-400">{progress.failed} failed</span>
      </div>
    </div>
  );
}

// ── Upload card ──────────────────────────────────────────────────────────────

interface UploadCardProps {
  title: string;
  description: string;
  accept?: string;
  templateFilename: string;
  templateContent: string;
  isLoading: boolean;
  onUpload: (file: File) => void;
  result?: React.ReactNode;
}

function UploadCard({
  title,
  description,
  accept = ".csv",
  templateFilename,
  templateContent,
  isLoading,
  onUpload,
  result,
}: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasLoading = useRef(false);

  // Clear the selected file + reset the native input once the upload SETTLES
  // (never mid-stream — resetting input.value during the fetch can abort it).
  // This makes the picker clear after upload and lets the same filename be
  // re-selected without a stale File handle causing "Failed to fetch".
  useEffect(() => {
    if (wasLoading.current && !isLoading) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => downloadCsv(templateFilename, templateContent)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-500 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600"
        >
          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
          Template
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onClick={(e) => {
            (e.currentTarget as HTMLInputElement).value = "";
          }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
        <button
          onClick={() => {
            if (!file) return;
            if (file.size > MAX_BYTES) {
              showToast({ type: "error", title: "File too large", message: `Max ${MAX_MB} MB.` });
              return;
            }
            onUpload(file);
          }}
          disabled={!file || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex-shrink-0"
        >
          <CloudArrowUpIcon className="h-4 w-4" />
          {isLoading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {result}
    </div>
  );
}

// ── Column reference ─────────────────────────────────────────────────────────

const COLUMN_GROUPS = [
  {
    label: "Required",
    cols: ["customer_id", "timestamp", "amount", "transaction_type", "channel"],
  },
  {
    label: "Core (optional)",
    cols: ["flow_type", "receiver_id", "receiver_country", "geo_location", "transaction_id"],
  },
  {
    label: "Device fingerprint",
    cols: [
      "device_id", "is_rooted", "iccid", "imei", "imsi", "msisdn", "mno", "mcc_mnc",
      "os_type", "os_version", "device_model", "app_version", "app_install_date",
      "ip_country", "connection_type", "sim_count", "gps_lat", "gps_lon",
    ],
  },
  {
    label: "Behavioural signals",
    cols: [
      "browser_fingerprint", "screen_resolution", "browser_type", "fonts_hash",
      "typing_speed_ms", "paste_events", "mouse_entropy", "session_duration_ms",
      "auto_fill_detected", "click_count",
    ],
  },
  {
    label: "Customer profile",
    cols: [
      "customer_name", "customer_type", "customer_country", "customer_occupation",
      "customer_kyc_score", "declared_monthly_income", "customer_email", "customer_phone",
    ],
  },
  {
    label: "Travel Rule (FATF R.16)",
    cols: [
      "originator_name", "originator_account", "originator_address", "originator_national_id",
      "beneficiary_name", "beneficiary_account",
    ],
  },
];

function ColumnReference() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
      >
        <span>Transaction CSV — all supported columns</span>
        {open ? (
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-4">
          {COLUMN_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.cols.map((col) => (
                  <span
                    key={col}
                    className="px-2 py-0.5 rounded font-mono text-xs bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-300"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Boolean columns (<code>is_rooted</code>, <code>auto_fill_detected</code>) accept:{" "}
            <code>true</code> / <code>false</code> / <code>1</code> / <code>0</code>.
            Empty cells are treated as &ldquo;not provided&rdquo; and do not override existing data.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function IngestionPage() {
  // Transaction upload
  const [txnResult, setTxnResult] = useState<FileUploadResponse | null>(null);
  const [sourceSystem, setSourceSystem] = useState("");
  const [txnFile, setTxnFile] = useState<File | null>(null);
  const txnInputRef = useRef<HTMLInputElement>(null);
  const [uploadBatchFile, { isLoading: txnLoading }] = useUploadBatchFileMutation();

  // Watchlist upload
  const [wlResult, setWlResult] = useState<{ added: number; skipped_duplicates: number; failed: number; unknown_lists?: string[] } | null>(null);
  const [uploadWatchlist, { isLoading: wlLoading }] = useUploadWatchlistCsvMutation();

  // Customer profile upload
  const [cpResult, setCpResult] = useState<{ updated: number; not_found: number; failed: number } | null>(null);
  const [uploadCustomers, { isLoading: cpLoading }] = useUploadCustomerProfilesCsvMutation();

  const handleTxnUpload = async (file: File) => {
    setTxnResult(null);
    try {
      const res = await uploadBatchFile({ file, source_system: sourceSystem.trim() || undefined }).unwrap();
      setTxnResult(res);
      showToast({
        type: res.failed > 0 ? "warning" : "success",
        title: "Upload processed",
        message: `${res.successful} of ${res.total_submitted} transactions ingested.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Upload failed", message: errorMessage(e) });
    } finally {
      // Reset after the request settles (never mid-stream) so re-selecting the
      // same filename works and a stale File handle can't cause "Failed to fetch".
      setTxnFile(null);
      if (txnInputRef.current) txnInputRef.current.value = "";
    }
  };

  const handleWlUpload = async (file: File) => {
    setWlResult(null);
    try {
      const res = await uploadWatchlist({ file }).unwrap();
      setWlResult(res);
      showToast({
        type: res.failed > 0 ? "warning" : "success",
        title: "Watchlist updated",
        message: `${res.added} added, ${res.skipped_duplicates} already existed.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Upload failed", message: errorMessage(e) });
    }
  };

  const handleCpUpload = async (file: File) => {
    setCpResult(null);
    try {
      const res = await uploadCustomers({ file }).unwrap();
      setCpResult(res);
      showToast({
        type: res.failed > 0 ? "warning" : "success",
        title: "Customers updated",
        message: `${res.updated} updated, ${res.not_found} not found.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Upload failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Batch Upload</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload transaction files, watchlist entries, or customer profiles. All records are
          processed through the same pipeline as live transactions.
        </p>
      </div>

      {/* ── Transactions ── */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Transaction file
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              CSV, JSON, JSONL or Excel. Supports all device fingerprint, behavioural, and Travel
              Rule columns — see the column reference below.
            </p>
          </div>
          <button
            onClick={() => downloadCsv("transactions_template.csv", TRANSACTION_TEMPLATE)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-500 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Template
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            File
          </label>
          <input
            ref={txnInputRef}
            type="file"
            accept=".csv,.json,.jsonl,.xlsx"
            onClick={(e) => {
              (e.currentTarget as HTMLInputElement).value = "";
            }}
            onChange={(e) => setTxnFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          <p className="text-xs text-gray-400 mt-1">CSV, JSON, JSONL or Excel · max {MAX_MB} MB</p>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Source system <span className="normal-case text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={sourceSystem}
            onChange={(e) => setSourceSystem(e.target.value)}
            placeholder="e.g. core-banking, momo-gateway"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>

        <button
          onClick={() => txnFile && handleTxnUpload(txnFile)}
          disabled={!txnFile || txnLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          <CloudArrowUpIcon className="h-5 w-5" />
          {txnLoading ? "Uploading…" : "Upload & ingest"}
        </button>

        {txnResult && (
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-navy-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Result
              </span>
              <span className="font-mono text-xs text-gray-400">{txnResult.batch_id}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-gray-50 dark:bg-navy-800 p-3">
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{txnResult.total_submitted}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">{txnResult.successful}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">{txnResult.failed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
              </div>
            </div>
            <BatchProgress batchId={txnResult.batch_id} />
            {txnResult.failed_items.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-300">
                  {txnResult.failed_items.length} failed item(s)
                </summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-gray-50 dark:bg-navy-800 p-3 text-xs text-gray-700 dark:text-gray-300">
                  {JSON.stringify(txnResult.failed_items.slice(0, 50), null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ── Watchlist entries ── */}
      <UploadCard
        title="Watchlist / PEP entries"
        description="Bulk-add names to any watchlist (PEP, sanctions, internal blocklist). Columns: list_name, value, notes."
        templateFilename="watchlist_entries_template.csv"
        templateContent={WATCHLIST_TEMPLATE}
        isLoading={wlLoading}
        onUpload={handleWlUpload}
        result={
          wlResult ? (
            <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-gray-100 dark:border-navy-600">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">{wlResult.added}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Added</p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-navy-800 p-3">
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">{wlResult.skipped_duplicates}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Already existed</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">{wlResult.failed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
              </div>
              {wlResult.unknown_lists && (
                <div className="col-span-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                  Unknown list names: {wlResult.unknown_lists.join(", ")}. Use GET /watchlists to see valid names.
                </div>
              )}
            </div>
          ) : undefined
        }
      />

      {/* ── Customer profiles ── */}
      <UploadCard
        title="Customer profiles"
        description="Set is_pep, KYC score, occupation, or customer type on existing customers. Columns: customer_id, is_pep, kyc_score, occupation, customer_type."
        templateFilename="customer_profiles_template.csv"
        templateContent={CUSTOMER_TEMPLATE}
        isLoading={cpLoading}
        onUpload={handleCpUpload}
        result={
          cpResult ? (
            <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-gray-100 dark:border-navy-600">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">{cpResult.updated}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Updated</p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-navy-800 p-3">
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">{cpResult.not_found}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Not found</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">{cpResult.failed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* ── Column reference ── */}
      <ColumnReference />
    </div>
  );
}
