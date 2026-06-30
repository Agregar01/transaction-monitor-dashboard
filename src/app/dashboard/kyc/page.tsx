"use client";

import { useState, useEffect, useCallback } from "react";
import {
  VIDEO_KYC_URL,
  VIDEO_KYC_ORIGIN,
  VIDEO_KYC_TYPE,
  VERIFICATION_TYPES,
  type VerificationTypeLabel,
} from "@/config/kyc";
import {
  useRequestDocumentVerificationMutation,
  useLazyGetDocumentVerificationStatusQuery,
  type KycDestinationType,
  type DocumentVerificationResult,
} from "@/redux/slices/api/kycApi";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import {
  IdentificationIcon,
  VideoCameraIcon,
  FingerPrintIcon,
  ArrowTopRightOnSquareIcon,
  PaperAirplaneIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

/** Build the standalone Video-KYC agent-portal URL (interim — backend send-link not yet wired). */
function buildVideoKycUrl(verificationId: string): string {
  const u = new URL(VIDEO_KYC_URL);
  u.searchParams.set("verification_id", verificationId);
  return u.toString();
}

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  SENT: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  PENDING: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  IN_PROGRESS: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  FAILED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  EXPIRED: "bg-gray-200 dark:bg-navy-600 text-gray-600 dark:text-gray-300",
};

// ── Central-KYC: send a link to the customer ─────────────────────────────────

/**
 * The customer-facing path. The agent supplies the customer id + a destination
 * (email/phone); the backend mints the verification_id, builds the central-KYC
 * link, and sends it. The agent never operates the capture UI — they only
 * dispatch the link and watch the status.
 */
function CentralKycSendLink({ verificationType }: { verificationType: VerificationTypeLabel }) {
  const [customerId, setCustomerId] = useState("");
  const [destinationType, setDestinationType] = useState<KycDestinationType>("email");
  const [destination, setDestination] = useState("");
  const [result, setResult] = useState<DocumentVerificationResult | null>(null);

  const [requestVerification, { isLoading }] = useRequestDocumentVerificationMutation();
  const [triggerStatus, { isFetching: statusFetching }] =
    useLazyGetDocumentVerificationStatusQuery();

  // A fresh result is meaningless once the agent switches verification type.
  useEffect(() => setResult(null), [verificationType]);

  const destinationValid =
    destinationType === "email"
      ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destination.trim())
      : destination.trim().replace(/\D/g, "").length >= 7;

  const canSend = customerId.trim().length > 0 && destinationValid && !isLoading;

  const send = async () => {
    if (!canSend) return;
    try {
      const res = await requestVerification({
        customer_id: customerId.trim(),
        verification_type: verificationType,
        destination: destination.trim(),
        destination_type: destinationType,
        return_url: null, // left blank for now per product decision
      }).unwrap();
      setResult(res);
      showToast({
        type: "success",
        title: "Verification link sent",
        message: `Sent to ${destination.trim()}.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Could not send link", message: errorMessage(e) });
    }
  };

  const refresh = async () => {
    if (!result) return;
    try {
      const fresh = await triggerStatus(result.verification_id).unwrap();
      setResult(fresh);
    } catch (e) {
      showToast({ type: "error", title: "Status check failed", message: errorMessage(e) });
    }
  };

  const copyLink = async () => {
    if (!result?.link) return;
    try {
      await navigator.clipboard.writeText(result.link);
      showToast({ type: "success", title: "Link copied", message: "Verification link copied to clipboard." });
    } catch {
      showToast({ type: "error", title: "Copy failed", message: "Could not copy the link." });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Send to customer
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The customer completes <span className="font-medium">{verificationType}</span> on their
            own device. Enter where to send the secure link — the backend creates the verification
            and delivers it.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Customer ID
            </label>
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. CUST-00123"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Send link via
            </label>
            <div className="flex gap-2">
              {(["email", "phone"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDestinationType(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    destinationType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
                  }`}
                >
                  {t === "email" ? "Email" : "SMS / Phone"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              {destinationType === "email" ? "Customer email" : "Customer phone"}
            </label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              type={destinationType === "email" ? "email" : "tel"}
              placeholder={destinationType === "email" ? "customer@example.com" : "+233 …"}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
            {destination.length > 0 && !destinationValid && (
              <p className="text-xs text-red-500 mt-1">
                Enter a valid {destinationType === "email" ? "email address" : "phone number"}.
              </p>
            )}
          </div>

          <button
            onClick={send}
            disabled={!canSend}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            {isLoading ? "Sending…" : "Send verification link"}
          </button>
        </div>

        {result && (
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Verification
              </h2>
              <span
                className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                  STATUS_STYLES[result.status] ?? STATUS_STYLES.PENDING
                }`}
              >
                {result.status}
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-400 break-all">
              {result.verification_id}
            </p>
            {result.message && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{result.message}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={refresh}
                disabled={statusFetching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${statusFetching ? "animate-spin" : ""}`} />
                Refresh status
              </button>
              {result.link && (
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
                >
                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                  Copy link
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-3 h-fit">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Covered checks
        </h2>
        {[
          { icon: IdentificationIcon, label: "Ghana Card capture (front, back, MRZ)" },
          { icon: FingerPrintIcon, label: "Selfie + liveness biometrics" },
          { icon: VideoCameraIcon, label: "Agent-assisted video KYC" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            <Icon className="h-5 w-5 text-primary shrink-0" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Video KYC launcher (interim — existing behaviour, not yet reworked) ───────

function VideoKycLauncher() {
  const [session, setSession] = useState<{ id: string; url: string } | null>(null);
  const [completed, setCompleted] = useState(false);

  const start = useCallback(() => {
    const id = crypto.randomUUID();
    setSession({ id, url: buildVideoKycUrl(id) });
    setCompleted(false);
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== VIDEO_KYC_ORIGIN) return;
      const msg = e.data as { type?: string } | undefined;
      if (msg && typeof msg.type === "string" && /SUCCESS|COMPLETE|VERIFIED/i.test(msg.type)) {
        setCompleted(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Agent video session
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Opens the Video-KYC agent portal. Customer-side link dispatch is handled by the
            existing Video-KYC flow (backend send-link integration pending).
          </p>
          <button
            onClick={start}
            className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            {session ? "Restart session" : "Start video session"}
          </button>
          {session && (
            <a
              href={session.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open in new tab
            </a>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {completed && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <CheckCircleIcon className="h-6 w-6 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Video verification complete.
            </p>
          </div>
        )}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          {session ? (
            <iframe
              key={session.id}
              src={session.url}
              title="Video KYC agent portal"
              allow="camera; microphone"
              className="w-full h-[640px] border-0"
            />
          ) : (
            <div className="h-[640px] flex flex-col items-center justify-center text-center px-6">
              <VideoCameraIcon className="h-12 w-12 text-gray-300 dark:text-navy-500 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Select <span className="font-medium text-gray-700 dark:text-gray-300">Start video session</span>{" "}
                to launch the agent portal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function KycPage() {
  const [verificationType, setVerificationType] =
    useState<VerificationTypeLabel>("DOCUMENT VERIFICATION");
  const isVideo = verificationType === VIDEO_KYC_TYPE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Identity Verification
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
          Initiate a customer KYC flow. The customer completes capture on their own device — you
          dispatch the link and track the outcome here.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 max-w-md">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Verification type
        </label>
        <select
          value={verificationType}
          onChange={(e) => setVerificationType(e.target.value as VerificationTypeLabel)}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        >
          {VERIFICATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isVideo ? (
        <VideoKycLauncher />
      ) : (
        <CentralKycSendLink verificationType={verificationType} />
      )}
    </div>
  );
}
