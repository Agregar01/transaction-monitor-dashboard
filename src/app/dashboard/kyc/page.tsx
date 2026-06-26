"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CENTRAL_KYC_URL,
  CENTRAL_KYC_ORIGIN,
  VERIFICATION_TYPES,
  type VerificationTypeLabel,
} from "@/config/kyc";
import {
  IdentificationIcon,
  VideoCameraIcon,
  FingerPrintIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

type KycEvent = { type: string; data?: unknown; at: string };

/** Build the central-KYC embed URL for a freshly minted verification session. */
function buildKycUrl(verificationId: string, verificationType: string): string {
  const u = new URL(CENTRAL_KYC_URL);
  u.searchParams.set("verification_id", verificationId);
  u.searchParams.set("verification_type", verificationType);
  u.searchParams.set("mode", "fetch");
  return u.toString();
}

export default function KycPage() {
  const [verificationType, setVerificationType] =
    useState<VerificationTypeLabel>("REMOTE CUSTOMER ONBOARDING");
  const [session, setSession] = useState<{ id: string; url: string } | null>(null);
  const [events, setEvents] = useState<KycEvent[]>([]);
  const [completed, setCompleted] = useState(false);

  const start = useCallback(() => {
    // crypto.randomUUID is available in all evergreen browsers.
    const id = crypto.randomUUID();
    setSession({ id, url: buildKycUrl(id, verificationType) });
    setEvents([]);
    setCompleted(false);
  }, [verificationType]);

  // The embedded KYC app reports progress back to the host via postMessage.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== CENTRAL_KYC_ORIGIN) return; // only trust the KYC origin
      const msg = e.data as { type?: string; data?: unknown } | undefined;
      if (!msg || typeof msg.type !== "string") return;
      setEvents((prev) => [
        { type: msg.type as string, data: msg.data, at: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      if (/SUCCESS|COMPLETE|VERIFIED/i.test(msg.type)) setCompleted(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Identity Verification
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
          Run a customer through the central-KYC orchestrator — Ghana Card capture,
          selfie + liveness biometrics, OTP and agent-assisted video KYC — without
          leaving the dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Launcher ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Start a verification
            </h2>
            <div>
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
            <button
              onClick={start}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              {session ? "Restart verification" : "Start verification"}
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
            {session && (
              <p className="text-[11px] font-mono text-gray-400 break-all">
                session {session.id.slice(0, 8)}…
              </p>
            )}
          </div>

          {/* What the orchestrator covers */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5 space-y-3">
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

          {/* Live event log from the embedded app */}
          {events.length > 0 && (
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Verification events
              </h2>
              <ul className="space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto">
                {events.map((ev, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-gray-400">{ev.at}</span>
                    <span className="text-gray-900 dark:text-white">{ev.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Embedded KYC flow ─────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {completed && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <CheckCircleIcon className="h-6 w-6 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Verification capture complete — result submitted to central-KYC.
              </p>
            </div>
          )}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
            {session ? (
              <iframe
                key={session.id}
                src={session.url}
                title="Central KYC verification"
                allow="camera; microphone"
                className="w-full h-[640px] border-0"
              />
            ) : (
              <div className="h-[640px] flex flex-col items-center justify-center text-center px-6">
                <IdentificationIcon className="h-12 w-12 text-gray-300 dark:text-navy-500 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  Choose a verification type and select{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">Start verification</span>{" "}
                  to launch the live central-KYC flow here. Camera access is requested
                  inside the capture step.
                </p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            If the embedded view stays blank, the KYC deployment may not allow framing
            from this origin — use <span className="font-medium">Open in new tab</span> instead.
          </p>
        </div>
      </div>
    </div>
  );
}
