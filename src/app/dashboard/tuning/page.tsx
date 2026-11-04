"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useListBtlSamplesQuery,
  useReviewBtlSampleMutation,
  useGetBtlReportQuery,
  useRunBtlSamplingMutation,
} from "@/redux/slices/api/tuningApi";
import { SkeletonTable, SkeletonCard } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { BtlDisposition, BtlSample, BtlSignal } from "@/types/api";

const SIGNAL_LEGEND: Record<BtlSignal, { label: string; blurb: string; tone: string }> = {
  threshold_may_be_too_high: {
    label: "Threshold may be too high",
    blurb:
      "A high share of below-the-line samples turned out suspicious on review — the current threshold may be missing real risk. Consider lowering it.",
    tone: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20",
  },
  band_appears_safe: {
    label: "Band appears safe",
    blurb:
      "Reviewed below-the-line samples came back mostly not-suspicious — the threshold looks appropriately placed for this jurisdiction.",
    tone: "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20",
  },
  monitor: {
    label: "Monitor",
    blurb:
      "The suspicious rate is borderline — not alarming, but worth continuing to sample and review before concluding either way.",
    tone: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20",
  },
  insufficient_reviews: {
    label: "Insufficient reviews",
    blurb: "Not enough samples have been reviewed yet to produce a reliable signal.",
    tone: "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-navy-800",
  },
};

function EffectivenessCard() {
  const { data: report, isLoading, error } = useGetBtlReportQuery();

  if (isLoading) return <SkeletonCard />;
  if (error || !report) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
        Failed to load the effectiveness report.
      </div>
    );
  }

  const signal = SIGNAL_LEGEND[report.signal];

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Total sampled</p>
          <p className="mt-1 text-xl font-mono text-gray-900 dark:text-white">{report.total_samples}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Pending review</p>
          <p className="mt-1 text-xl font-mono text-gray-900 dark:text-white">{report.pending_review}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Reviewed</p>
          <p className="mt-1 text-xl font-mono text-gray-900 dark:text-white">{report.reviewed}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Suspicious</p>
          <p className="mt-1 text-xl font-mono text-gray-900 dark:text-white">{report.suspicious}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Suspicious rate</p>
          <p className="mt-1 text-xl font-mono text-gray-900 dark:text-white">
            {(report.suspicious_rate * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      <div className={`rounded-lg p-3 text-sm ${signal.tone}`}>
        <p className="font-semibold">{signal.label}</p>
        <p className="mt-0.5 text-xs">{signal.blurb}</p>
      </div>
    </div>
  );
}

function ReviewModal({
  sample,
  onClose,
}: {
  sample: BtlSample;
  onClose: () => void;
}) {
  const [disposition, setDisposition] = useState<BtlDisposition | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewBtlSample, { isLoading: submitting }] = useReviewBtlSampleMutation();

  const submit = async () => {
    if (!disposition) return;
    try {
      await reviewBtlSample({ id: sample.id, disposition, notes: notes || undefined }).unwrap();
      showToast({ type: "success", title: "Reviewed", message: `Marked ${disposition.replace("_", " ").toLowerCase()}.` });
      onClose();
    } catch (e) {
      showToast({ type: "error", title: "Review failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl p-6 max-w-lg w-full space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Below-the-line sample
          </p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
            {sample.transaction_id.slice(0, 16)}…
          </h2>
          <Link
            href={`/dashboard/transactions/${sample.transaction_id}`}
            className="text-xs text-primary hover:underline"
          >
            Open transaction →
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">Jurisdiction</dt>
          <dd>{sample.jurisdiction_code}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Combined risk score</dt>
          <dd className="font-mono">{sample.combined_risk_score}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Threshold / band floor</dt>
          <dd className="font-mono">{sample.threshold} / {sample.band_floor}</dd>
        </dl>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Disposition
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setDisposition("NOT_SUSPICIOUS")}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                disposition === "NOT_SUSPICIOUS"
                  ? "bg-green-600 text-white border-green-600"
                  : "border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
              }`}
            >
              Not suspicious
            </button>
            <button
              onClick={() => setDisposition("SUSPICIOUS")}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                disposition === "SUSPICIOUS"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
              }`}
            >
              Suspicious
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional review notes"
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!disposition || submitting}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ThresholdTuningPage() {
  const { data, isLoading, error } = useListBtlSamplesQuery({ sample_status: "PENDING" });
  const [selected, setSelected] = useState<BtlSample | null>(null);
  const [runBtlSampling, { isLoading: sampling }] = useRunBtlSamplingMutation();

  const runNow = async () => {
    try {
      await runBtlSampling({}).unwrap();
      showToast({ type: "success", title: "Sampling run started", message: "New below-the-line samples will appear once scored." });
    } catch (e) {
      showToast({ type: "error", title: "Run failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Threshold Tuning</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Below-the-line review — proves the flag threshold isn&apos;t missing suspicious activity
            that falls just under it.
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={sampling}
          className="shrink-0 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 rounded-lg disabled:opacity-50"
        >
          {sampling ? "Running…" : "Run sampling now"}
        </button>
      </div>

      <EffectivenessCard />

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Pending review
        </h2>
        {isLoading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
            Failed to load below-the-line samples.
          </div>
        ) : !data || data.length === 0 ? (
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No samples pending review.
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Transaction</th>
                  <th className="px-4 py-2 text-left">Jurisdiction</th>
                  <th className="px-4 py-2 text-right">Risk score</th>
                  <th className="px-4 py-2 text-right">Threshold</th>
                  <th className="px-4 py-2 text-left">Sampled</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {data.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/transactions/${s.transaction_id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {s.transaction_id.slice(0, 10)}…
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-xs">{s.jurisdiction_code}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{s.combined_risk_score}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{s.threshold}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(s.sampled_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setSelected(s)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <ReviewModal sample={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
