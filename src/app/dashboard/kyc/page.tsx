"use client";

import { useState, useEffect } from "react";
import {
  VIDEO_KYC_TYPE,
  VERIFICATION_TYPES,
  type VerificationTypeLabel,
} from "@/config/kyc";
import {
  useRequestDocumentVerificationMutation,
  useLazyGetDocumentVerificationStatusQuery,
  useRequestVideoVerificationMutation,
  useLazyGetVideoVerificationStatusQuery,
  VIDEO_ID_TYPES,
  type KycDestinationType,
  type DocumentVerificationResult,
  type RequestVideoVerificationBody,
  type VideoVerificationResult,
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
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

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
      // A 2xx means the verification was CREATED — not necessarily delivered.
      // Only status "SENT" confirms the link actually went out; anything else
      // (e.g. "PENDING" when SMTP fails) must not show a green "sent" toast.
      const delivered = res.status === "SENT";
      showToast({
        type: delivered ? "success" : "warning",
        title: delivered ? "Verification link sent" : "Created — but not delivered",
        message: delivered
          ? `Sent to ${destination.trim()}.`
          : res.message ||
            "Verification created, but the link couldn't be delivered. Use “Copy link” to share it manually.",
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

// ── Video KYC (agent-initiated live session) ─────────────────────────────────

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";
const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5";

/**
 * Two-step flow. Step 1: the agent fills the candidate's details and submits.
 * Step 2 (after a 2xx): show the agent-portal URL the backend returns, so the
 * agent runs the live session — while the candidate is invited by email. The
 * agent never captures on the customer's behalf.
 */
function VideoKycFlow() {
  const [form, setForm] = useState<RequestVideoVerificationBody>({
    customer_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_type: VIDEO_ID_TYPES[0],
    id_number: "",
  });
  const [result, setResult] = useState<VideoVerificationResult | null>(null);

  const [requestVideo, { isLoading }] = useRequestVideoVerificationMutation();
  const [triggerStatus, { isFetching: statusFetching }] =
    useLazyGetVideoVerificationStatusQuery();

  // Pre-fill Customer ID when navigated here with ?customer_id=… (from a customer page).
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("customer_id");
    if (cid) setForm((f) => ({ ...f, customer_id: cid }));
  }, []);

  const set =
    (k: keyof RequestVideoVerificationBody) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
  const canSubmit =
    form.first_name.trim() !== "" &&
    form.last_name.trim() !== "" &&
    emailValid &&
    form.phone_number.trim().replace(/\D/g, "").length >= 7 &&
    form.id_number.trim() !== "" &&
    form.customer_id.trim() !== "" &&
    !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const res = await requestVideo({
        customer_id: form.customer_id.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        id_type: form.id_type,
        id_number: form.id_number.trim(),
      }).unwrap();
      setResult(res);
      showToast({
        type: "success",
        title: "Candidate invited",
        message: `Video-KYC invite sent to ${form.email.trim()}.`,
      });
    } catch (e) {
      showToast({ type: "error", title: "Could not start video KYC", message: errorMessage(e) });
    }
  };

  const refresh = async () => {
    if (!result) return;
    try {
      setResult(await triggerStatus(result.verification_id).unwrap());
    } catch (e) {
      showToast({ type: "error", title: "Status check failed", message: errorMessage(e) });
    }
  };

  // Step 2 — agent portal view
  if (result) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Video session
              </h2>
              <span
                className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                  STATUS_STYLES[result.status] ?? STATUS_STYLES.SENT
                }`}
              >
                {result.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Invite sent to{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{form.email.trim()}</span>.
              Open the agent portal to run the live session.
            </p>
            <a
              href={result.agent_portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open Agent Portal
            </a>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={refresh}
                disabled={statusFetching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${statusFetching ? "animate-spin" : ""}`} />
                Refresh status
              </button>
              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
              >
                New session
              </button>
            </div>
            <div className="pt-1 text-[11px] font-mono text-gray-400 space-y-0.5 break-all">
              <p>ref {result.reference}</p>
              <p>id {result.verification_id}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
            <iframe
              key={result.verification_id}
              src={result.agent_portal_url}
              title="Video KYC agent portal"
              allow="camera; microphone"
              className="w-full h-[640px] border-0"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            If the embedded portal stays blank, use{" "}
            <span className="font-medium">Open Agent Portal</span> to run it in a new tab.
          </p>
        </div>
      </div>
    );
  }

  // Step 1 — initiation form
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Start a video verification
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Enter the candidate&apos;s details. They&apos;re invited by email; you&apos;ll get the
          agent portal to run the live session.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>First name</label>
          <input value={form.first_name} onChange={set("first_name")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last name</label>
          <input value={form.last_name} onChange={set("last_name")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            Email <span className="text-gray-400 normal-case">(sent to candidate)</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            className={inputCls}
            placeholder="candidate@example.com"
          />
          {form.email.length > 0 && !emailValid && (
            <p className="text-xs text-red-500 mt-1">Enter a valid email.</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Phone number</label>
          <input
            type="tel"
            value={form.phone_number}
            onChange={set("phone_number")}
            className={inputCls}
            placeholder="+233 …"
          />
        </div>
        <div>
          <label className={labelCls}>ID type</label>
          <select value={form.id_type} onChange={set("id_type")} className={inputCls}>
            {VIDEO_ID_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>ID number</label>
          <input value={form.id_number} onChange={set("id_number")} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Customer ID</label>
          <input
            value={form.customer_id}
            onChange={set("customer_id")}
            className={`${inputCls} font-mono`}
            placeholder="e.g. CUST-00123"
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
      >
        <PaperAirplaneIcon className="h-5 w-5" />
        {isLoading ? "Starting…" : "Start video verification"}
      </button>
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
        <VideoKycFlow />
      ) : (
        <CentralKycSendLink verificationType={verificationType} />
      )}
    </div>
  );
}
