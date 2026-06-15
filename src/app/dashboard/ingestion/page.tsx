"use client";

import { useEffect, useState } from "react";
import {
  useUploadBatchFileMutation,
  useGetBatchStatusQuery,
} from "@/redux/slices/api/ingestionApi";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { FileUploadResponse } from "@/types/api";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

const ACCEPT = ".csv,.json,.jsonl,.xlsx";
const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const TERMINAL = new Set(["completed", "failed"]);

function BatchProgress({ batchId }: { batchId: string }) {
  // Poll the canonical status until the batch reaches a terminal state, then
  // stop (pollingInterval 0) so we don't hammer a finished batch.
  const [poll, setPoll] = useState(2000);
  const { data } = useGetBatchStatusQuery(batchId, { skip: !batchId, pollingInterval: poll });
  useEffect(() => {
    if (data && TERMINAL.has(data.status.toLowerCase())) setPoll(0);
  }, [data]);
  if (!data) return null;
  const { progress, status } = data;
  const pct =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const done = TERMINAL.has(status.toLowerCase());
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="uppercase tracking-wider font-medium">{status}</span>
        <span>
          {progress.processed}/{progress.total} processed
        </span>
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

export default function IngestionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceSystem, setSourceSystem] = useState("");
  const [result, setResult] = useState<FileUploadResponse | null>(null);
  const [uploadBatchFile, { isLoading }] = useUploadBatchFileMutation();

  const onUpload = async () => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      showToast({ type: "error", title: "File too large", message: `Maximum file size is ${MAX_MB} MB.` });
      return;
    }
    setResult(null);
    try {
      const res = await uploadBatchFile({
        file,
        source_system: sourceSystem.trim() || undefined,
      }).unwrap();
      setResult(res);
      showToast({
        type: res.failed > 0 ? "warning" : "success",
        title: "Upload processed",
        message: `${res.successful} of ${res.total_submitted} records ingested.`,
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
          Upload a transaction file to ingest in bulk. Records are screened the same way as
          live transactions.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
        <div>
          <label
            htmlFor="batch-file"
            className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1"
          >
            File
          </label>
          <input
            id="batch-file"
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          <p className="text-xs text-gray-400 mt-1">CSV, JSON, JSONL or Excel (.xlsx) · max {MAX_MB} MB</p>
        </div>

        <div>
          <label
            htmlFor="source-system"
            className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1"
          >
            Source system <span className="normal-case text-gray-400">(optional)</span>
          </label>
          <input
            id="source-system"
            type="text"
            value={sourceSystem}
            onChange={(e) => setSourceSystem(e.target.value)}
            placeholder="e.g. core-banking, momo-gateway"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>

        <button
          onClick={onUpload}
          disabled={!file || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          <CloudArrowUpIcon className="h-5 w-5" />
          {isLoading ? "Uploading…" : "Upload & ingest"}
        </button>
      </div>

      {result && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Result
            </h2>
            <span className="font-mono text-xs text-gray-400">{result.batch_id}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 dark:bg-navy-800 p-3">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{result.total_submitted}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
              <p className="text-xl font-semibold text-green-600 dark:text-green-400">{result.successful}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">{result.failed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
            </div>
          </div>

          <BatchProgress batchId={result.batch_id} />

          {result.failed_items.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-300">
                {result.failed_items.length} failed item(s)
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-gray-50 dark:bg-navy-800 p-3 text-xs text-gray-700 dark:text-gray-300">
                {JSON.stringify(result.failed_items.slice(0, 50), null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
