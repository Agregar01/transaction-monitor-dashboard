"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import {
  useGetCustomerQuery,
  useGetCustomerTierQuery,
  useGetCustomerHistoryQuery,
  useRequestUpgradeMutation,
  useUpdateCustomerManualMutation,
  useFreezeCustomerMutation,
  useUnfreezeCustomerMutation,
  useGetVerificationChecklistQuery,
  useListCaseNotesQuery,
  useCreateCaseNoteMutation,
} from "@/redux/slices/api/customersApi";
import { useEvaluateDecisionMutation, useGetDecisionHistoryQuery } from "@/redux/slices/api/decisionsApi";
import { useListDocumentsQuery, useUploadDocumentMutation, useUpdateDocumentStatusMutation } from "@/redux/slices/api/documentsApi";
import { useSendKycReminderMutation } from "@/redux/slices/api/notificationsApi";
import TierBadge from "@/components/TierBadge";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { ArrowLeftIcon, BoltIcon, ArrowUpIcon, XMarkIcon, BellAlertIcon, DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon, LockClosedIcon, LockOpenIcon, PencilSquareIcon, ChatBubbleLeftEllipsisIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { SkeletonCard, SkeletonStats } from "@/components/Skeleton";
import ClientGuard from "@/components/ClientGuard";

function formatCurrency(v: number) {
  if (v < 0) return "Unlimited";
  return `GHS ${v.toLocaleString()}`;
}

function getNextTier(current: string): string | null {
  const kycTiers = ["T0", "T1", "T2", "T3"];
  const kybTiers = ["B0", "B1", "B2", "B3"];
  const tiers = current.startsWith("B") ? kybTiers : kycTiers;
  const idx = tiers.indexOf(current);
  if (idx < 0 || idx >= tiers.length - 1) return null;
  return tiers[idx + 1];
}

const WORKFLOW_REQUIREMENTS: Record<string, { code: string; name: string; steps: string[] }> = {
  "T0→T1": { code: "W1", name: "Auto-Approve", steps: ["OTP verification"] },
  "T1→T2": { code: "W2", name: "ID + Selfie + Liveness", steps: ["Valid ID document (Ghana Card)", "Selfie capture", "Liveness detection check"] },
  "T2→T3": { code: "W4", name: "Video KYC + Supervisor", steps: ["Live video call with KYC agent", "Supervisor review & approval", "Enhanced due diligence documents"] },
  "B0→B1": { code: "BW1", name: "Basic Business Verification", steps: ["Business registration documents", "Director ID verification"] },
  "B1→B2": { code: "BW2", name: "Standard KYB", steps: ["Ultimate Beneficial Owner (UBO) identification", "Business address verification"] },
  "B2→B3": { code: "BW3", name: "Enhanced Business EDD", steps: ["Video KYB session", "Site visit verification", "Enhanced AML screening"] },
};

function UpgradeModal({
  open,
  onClose,
  externalId,
  clientId,
  currentTier,
  entityType,
}: {
  open: boolean;
  onClose: () => void;
  externalId: string;
  clientId: string;
  currentTier: string;
  entityType: string;
}) {
  const [requestUpgrade, { isLoading }] = useRequestUpgradeMutation();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [error, setError] = useState("");
  const nextTier = getNextTier(currentTier);
  const workflowKey = nextTier ? `${currentTier}→${nextTier}` : null;
  const workflow = workflowKey ? WORKFLOW_REQUIREMENTS[workflowKey] : null;

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextTier) return;
    setError("");
    try {
      const res = await requestUpgrade({
        external_id: externalId,
        client_id: clientId,
        target_tier: nextTier,
        reason,
      }).unwrap();
      setResult(res);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e?.data?.detail || "Upgrade request failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{result ? "Upgrade Initiated" : "Request Tier Upgrade"}</h2>
          <button onClick={() => { onClose(); setResult(null); setReason(""); setError(""); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">{result.message}</p>
            </div>
            <button
              onClick={() => { onClose(); setResult(null); setReason(""); }}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-4 py-2">
              <TierBadge tier={currentTier} />
              <span className="text-gray-400 text-lg">&rarr;</span>
              {nextTier ? <TierBadge tier={nextTier} /> : <span className="text-gray-400 text-sm">Max tier</span>}
            </div>

            {!nextTier ? (
              <p className="text-sm text-gray-500 text-center">
                This {entityType === "BUSINESS" ? "business" : "customer"} is already at the maximum tier.
              </p>
            ) : (
              <>
                {workflow && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Workflow {workflow.code}: {workflow.name}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                      The {entityType === "BUSINESS" ? "business" : "customer"} must complete:
                    </p>
                    <ul className="space-y-1">
                      {workflow.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                          <ClipboardDocumentCheckIcon className="h-4 w-4 mt-0.5 shrink-0" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                  <textarea
                    required
                    minLength={10}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Customer completed ID verification for standard KYC"
                    rows={3}
                  />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
                <button
                  type="submit"
                  disabled={isLoading || !nextTier}
                  className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
                >
                  {isLoading ? "Requesting..." : `Upgrade to ${nextTier}`}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = useAppSelector((s) => s.auth.clientId) || "";

  const { data: customer, isLoading } = useGetCustomerQuery({ external_id: id, client_id: clientId });
  const { data: tier } = useGetCustomerTierQuery({ external_id: id, client_id: clientId });
  const { data: history } = useGetCustomerHistoryQuery({ external_id: id, client_id: clientId });
  const { data: decisions } = useGetDecisionHistoryQuery({ client_id: clientId, customer_external_id: id, limit: 10 });
  const [evaluate, { isLoading: evaluating }] = useEvaluateDecisionMutation();
  const [sendReminder, { isLoading: sendingReminder }] = useSendKycReminderMutation();
  const [uploadDoc, { isLoading: uploading }] = useUploadDocumentMutation();
  const [updateDocStatus] = useUpdateDocumentStatusMutation();
  const { data: documents } = useListDocumentsQuery({ customer_external_id: id, client_id: clientId });
  const [updateManual, { isLoading: updating }] = useUpdateCustomerManualMutation();
  const [freezeCustomer, { isLoading: freezing }] = useFreezeCustomerMutation();
  const [unfreezeCustomer, { isLoading: unfreezing }] = useUnfreezeCustomerMutation();
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showManualActions, setShowManualActions] = useState(false);
  const [manualRiskScore, setManualRiskScore] = useState("");
  const [manualRiskLevel, setManualRiskLevel] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [freezeReason, setFreezeReason] = useState("");
  const [actionResult, setActionResult] = useState<string | null>(null);
  const { data: checklist } = useGetVerificationChecklistQuery({ external_id: id, client_id: clientId });
  const { data: caseNotes } = useListCaseNotesQuery({ external_id: id, client_id: clientId });
  const [createNote, { isLoading: creatingNote }] = useCreateCaseNoteMutation();
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("GENERAL");

  const handleEvaluate = async (eventType: string, amount?: number) => {
    try {
      const result = await evaluate({
        event_id: `manual-${Date.now()}`,
        event_type: eventType as "TRANSACTION" | "ACTION" | "LOGIN",
        client_id: clientId,
        customer_external_id: id,
        entity_type: customer?.entity_type,
        amount,
        currency: "GHS",
      }).unwrap();
      setEvalResult(`${result.action} (score: ${result.risk_score}, ${result.processing_time_ms}ms)`);
    } catch {
      setEvalResult("Evaluation failed");
    }
  };

  const handleSendReminder = async () => {
    try {
      const res = await sendReminder({ customer_external_id: id, client_id: clientId }).unwrap();
      const parts = [];
      if (res.email_sent) parts.push("Email sent");
      if (res.sms_sent) parts.push("SMS sent");
      setReminderResult(parts.length > 0 ? parts.join(" & ") : "No contact info available");
    } catch {
      setReminderResult("Failed to send reminder");
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File;
    const docType = formData.get("document_type") as string;
    const notes = formData.get("notes") as string;
    if (!file || !docType) return;
    try {
      await uploadDoc({ customer_external_id: id, document_type: docType, file, notes: notes || undefined }).unwrap();
      setShowUploadForm(false);
      form.reset();
    } catch {
      // error handled by RTK Query
    }
  };

  if (isLoading) return <div className="space-y-6"><SkeletonStats count={3} /><SkeletonCard /></div>;
  if (!customer) return <div className="text-red-500">Customer not found</div>;

  return (
    <ClientGuard>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{customer.external_id}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{customer.entity_type} customer</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {customer && (customer.current_tier === "T0" || customer.current_tier === "B0") && (
            <button
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <BellAlertIcon className="h-4 w-4" />
              {sendingReminder ? "Sending..." : "Send KYC Reminder"}
            </button>
          )}
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <ArrowUpIcon className="h-4 w-4" />
            Upgrade Tier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Profile</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ID</span>
              <span className="text-gray-900 font-mono text-xs">{customer.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Entity Type</span>
              <span className="text-gray-900">{customer.entity_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current Tier</span>
              <TierBadge tier={customer.current_tier} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Risk Level</span>
              <RiskBadge level={customer.risk_level} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Risk Score</span>
              <span className="text-gray-900">{customer.risk_score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-900">{new Date(customer.created_at).toLocaleString()}</span>
            </div>
            {!!customer.metadata?.name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900">{String(customer.metadata.name)}</span>
              </div>
            )}
            {!!customer.metadata?.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{String(customer.metadata.email)}</span>
              </div>
            )}
            {!!customer.metadata?.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-900">{String(customer.metadata.phone)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Limits & Usage */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Limits & Usage</h2>
          {tier ? (
            <div className="space-y-4">
              {[
                { label: "Daily", limit: tier.daily_limit, usage: tier.daily_usage, remaining: tier.daily_remaining },
                { label: "Monthly", limit: tier.monthly_limit, usage: tier.monthly_usage, remaining: tier.monthly_remaining },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-gray-700">{formatCurrency(row.usage)} / {formatCurrency(row.limit)}</span>
                  </div>
                  {row.limit > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (row.usage / row.limit) * 100)}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Remaining: {formatCurrency(row.remaining)}</p>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Per Transaction</span>
                  <span className="text-gray-700">{formatCurrency(tier.per_transaction_limit)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Loading tier info...</p>
          )}
        </div>

        {/* Tier History */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Tier History</h2>
          {history && history.history.length > 0 ? (
            <div className="space-y-3">
              {history.history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      {h.from_tier && <TierBadge tier={h.from_tier} />}
                      {h.from_tier && <span className="text-gray-400">&rarr;</span>}
                      <TierBadge tier={h.to_tier} />
                    </div>
                    <p className="text-gray-500 mt-1">{h.reason}</p>
                    <p className="text-gray-400 text-xs">{new Date(h.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No tier changes yet</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleEvaluate("TRANSACTION", 1000)}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            <BoltIcon className="h-4 w-4" />
            Test Transaction (GHS 1,000)
          </button>
          <button
            onClick={() => handleEvaluate("LOGIN")}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2 bg-navy-500 text-white rounded-lg text-sm font-medium hover:bg-navy-600 disabled:opacity-50"
          >
            <BoltIcon className="h-4 w-4" />
            Test Login Event
          </button>
          <button
            onClick={() => handleEvaluate("ACTION")}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
          >
            <BoltIcon className="h-4 w-4" />
            Test Action Event
          </button>
        </div>
        {evalResult && (
          <div className="mt-3 px-4 py-2 bg-gray-50 dark:bg-navy-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
            Result: <span className="font-semibold">{evalResult}</span>
          </div>
        )}
      </div>

      {/* Manual Actions Panel */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Manual Actions</h2>
          <button
            onClick={() => setShowManualActions(!showManualActions)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-600 font-medium"
          >
            <PencilSquareIcon className="h-4 w-4" />
            {showManualActions ? "Hide" : "Show Actions"}
          </button>
        </div>

        {showManualActions && (
          <div className="space-y-4">
            {/* Freeze / Unfreeze */}
            <div className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {customer.metadata?._frozen ? "Unfreeze Customer" : "Freeze Customer"}
              </h3>
              {customer.metadata?._frozen ? (
                <button
                  onClick={async () => {
                    try {
                      await unfreezeCustomer({ external_id: id, client_id: clientId }).unwrap();
                      setActionResult("Customer unfrozen successfully");
                    } catch { setActionResult("Failed to unfreeze"); }
                  }}
                  disabled={unfreezing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <LockOpenIcon className="h-4 w-4" />
                  {unfreezing ? "Unfreezing..." : "Unfreeze Customer"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Reason for freezing..."
                    className="flex-1 border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!freezeReason.trim()) return;
                      try {
                        await freezeCustomer({ external_id: id, client_id: clientId, reason: freezeReason }).unwrap();
                        setActionResult("Customer frozen successfully");
                        setFreezeReason("");
                      } catch { setActionResult("Failed to freeze"); }
                    }}
                    disabled={freezing || !freezeReason.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    <LockClosedIcon className="h-4 w-4" />
                    {freezing ? "Freezing..." : "Freeze"}
                  </button>
                </div>
              )}
            </div>

            {/* Update Risk Score */}
            <div className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Update Risk</h3>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={manualRiskScore}
                  onChange={(e) => setManualRiskScore(e.target.value)}
                  placeholder="Risk score (0-100)"
                  className="w-40 border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={manualRiskLevel}
                  onChange={(e) => setManualRiskLevel(e.target.value)}
                  className="border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Risk Level</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
                <button
                  onClick={async () => {
                    const body: Record<string, unknown> = {};
                    if (manualRiskScore) body.risk_score = Number(manualRiskScore);
                    if (manualRiskLevel) body.risk_level = manualRiskLevel;
                    if (!Object.keys(body).length) return;
                    try {
                      await updateManual({ external_id: id, client_id: clientId, body }).unwrap();
                      setActionResult("Risk updated successfully");
                      setManualRiskScore("");
                      setManualRiskLevel("");
                    } catch { setActionResult("Failed to update risk"); }
                  }}
                  disabled={updating || (!manualRiskScore && !manualRiskLevel)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update Risk"}
                </button>
              </div>
            </div>

            {/* Add Note */}
            <div className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add Note</h3>
              <div className="flex gap-2">
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Add a note about this customer..."
                  rows={2}
                  className="flex-1 border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={async () => {
                    if (!manualNote.trim()) return;
                    try {
                      await updateManual({ external_id: id, client_id: clientId, body: { notes: manualNote } }).unwrap();
                      setActionResult("Note added successfully");
                      setManualNote("");
                    } catch { setActionResult("Failed to add note"); }
                  }}
                  disabled={updating || !manualNote.trim()}
                  className="self-end px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>

            {actionResult && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex justify-between items-center">
                <span>{actionResult}</span>
                <button onClick={() => setActionResult(null)} className="text-blue-400 hover:text-blue-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Actions — UPGRADE_REQUIRED decisions needing verification */}
      {decisions && decisions.filter((d) => d.action === "UPGRADE_REQUIRED").length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700 p-6">
          <h2 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <BellAlertIcon className="h-5 w-5" />
            Pending Verification ({decisions.filter((d) => d.action === "UPGRADE_REQUIRED").length})
          </h2>
          <div className="space-y-3">
            {decisions.filter((d) => d.action === "UPGRADE_REQUIRED").map((d) => (
              <div key={d.decision_id} className="bg-white dark:bg-navy-700 rounded-lg p-4 border border-amber-100 dark:border-navy-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Upgrade to {d.target_tier || "next tier"} via {d.workflow || "assigned workflow"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{d.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">Decision: {d.decision_id.slice(0, 12)}... &middot; {new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <ActionBadge action={d.action} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
            Complete the required verification workflow for each pending action, then call POST /customers/{'{'}id{'}'}/verification-complete.
          </p>
        </div>
      )}

      {/* Recent Decisions */}
      {decisions && decisions.length > 0 && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
          <div className="px-6 py-4 border-b dark:border-navy-600">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Decisions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-2 font-medium text-xs">Decision</th>
                  <th className="px-6 py-2 font-medium text-xs">Event</th>
                  <th className="px-6 py-2 font-medium text-xs">Action</th>
                  <th className="px-6 py-2 font-medium text-xs">Risk</th>
                  <th className="px-6 py-2 font-medium text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <tr key={d.decision_id} className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600">
                    <td className="px-6 py-2">
                      <Link href={`/dashboard/decisions/${d.decision_id}`} className="font-mono text-xs text-primary hover:underline">
                        {d.decision_id.slice(0, 12)}...
                      </Link>
                    </td>
                    <td className="px-6 py-2 text-gray-600 dark:text-gray-300 text-xs">{d.event_type}</td>
                    <td className="px-6 py-2"><ActionBadge action={d.action} /></td>
                    <td className="px-6 py-2"><RiskBadge level={d.risk_level} /></td>
                    <td className="px-6 py-2 text-gray-400 text-xs">{new Date(d.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reminder Result */}
      {reminderResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800">{reminderResult}</p>
          <button onClick={() => setReminderResult(null)} className="text-amber-400 hover:text-amber-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Documents */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-navy-600 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Documents</h2>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-600"
          >
            <DocumentArrowUpIcon className="h-4 w-4" />
            Upload
          </button>
        </div>

        {showUploadForm && (
          <form onSubmit={handleUpload} className="px-6 py-4 border-b dark:border-navy-600 bg-gray-50 dark:bg-navy-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select name="document_type" required className="border rounded-lg px-3 py-2 text-sm dark:bg-navy-700 dark:border-navy-600 dark:text-white">
                <option value="">Select type...</option>
                <option value="ID_CARD">ID Card</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                <option value="UTILITY_BILL">Utility Bill</option>
                <option value="BANK_STATEMENT">Bank Statement</option>
                <option value="SELFIE">Selfie</option>
                <option value="BUSINESS_REG">Business Registration</option>
                <option value="TAX_CERT">Tax Certificate</option>
                <option value="OTHER">Other</option>
              </select>
              <input type="file" name="file" required className="border rounded-lg px-3 py-2 text-sm dark:bg-navy-700 dark:border-navy-600 dark:text-white" />
            </div>
            <input type="text" name="notes" placeholder="Notes (optional)" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-navy-700 dark:border-navy-600 dark:text-white" />
            <button type="submit" disabled={uploading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        )}

        {documents && documents.documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-2 font-medium text-xs">Type</th>
                  <th className="px-6 py-2 font-medium text-xs">File</th>
                  <th className="px-6 py-2 font-medium text-xs">Status</th>
                  <th className="px-6 py-2 font-medium text-xs">Uploaded</th>
                  <th className="px-6 py-2 font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.documents.map((doc) => (
                  <tr key={doc.id} className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600">
                    <td className="px-6 py-2 text-gray-900 dark:text-white text-xs">{doc.document_type.replace(/_/g, " ")}</td>
                    <td className="px-6 py-2 text-gray-600 dark:text-gray-300 text-xs">{doc.file_name}</td>
                    <td className="px-6 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === "VERIFIED" ? "bg-green-100 text-green-800" :
                        doc.status === "REJECTED" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-gray-400 text-xs">{new Date(doc.created_at).toLocaleString()}</td>
                    <td className="px-6 py-2">
                      {doc.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateDocStatus({ document_id: doc.id, status: "VERIFIED", customer_external_id: id })}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => updateDocStatus({ document_id: doc.id, status: "REJECTED", customer_external_id: id })}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-4 text-gray-400 text-sm">No documents uploaded yet</p>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h2>
        {(() => {
          type TimelineItem = { type: string; date: string; content: React.ReactNode };
          const items: TimelineItem[] = [];

          // Tier changes
          if (history?.history) {
            for (const h of history.history) {
              items.push({
                type: "tier",
                date: h.created_at,
                content: (
                  <div>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Tier Change</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                      {h.from_tier ? `${h.from_tier} → ${h.to_tier}` : `Assigned ${h.to_tier}`} — {h.reason}
                    </p>
                  </div>
                ),
              });
            }
          }

          // Decisions
          if (decisions) {
            for (const d of decisions) {
              items.push({
                type: "decision",
                date: d.created_at,
                content: (
                  <div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Decision</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                      {d.event_type} → <span className="font-medium">{d.action}</span> (risk: {d.risk_level}, score: {d.risk_score})
                    </p>
                  </div>
                ),
              });
            }
          }

          // Documents
          if (documents?.documents) {
            for (const doc of documents.documents) {
              items.push({
                type: "document",
                date: doc.created_at,
                content: (
                  <div>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Document</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                      {doc.document_type.replace(/_/g, " ")} uploaded — {doc.status}
                    </p>
                  </div>
                ),
              });
            }
          }

          items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (items.length === 0) {
            return <p className="text-gray-400 text-sm">No activity recorded yet</p>;
          }

          const dotColor: Record<string, string> = {
            tier: "bg-purple-400",
            decision: "bg-blue-400",
            document: "bg-green-400",
          };

          return (
            <div className="relative space-y-4 pl-6 border-l-2 border-gray-200 dark:border-navy-600">
              {items.map((item, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full ${dotColor[item.type] || "bg-gray-400"} ring-2 ring-white dark:ring-navy-700`} />
                  <div>
                    {item.content}
                    <p className="text-xs text-gray-400 mt-1">{new Date(item.date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Verification Checklist */}
      {checklist && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden="true" />
              Verification Checklist
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              checklist.completion.percentage === 100 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : checklist.completion.percentage >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {checklist.completion.percentage}% Complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-navy-600 rounded-full h-2 mb-6">
            <div
              className={`h-2 rounded-full transition-all ${
                checklist.completion.percentage === 100 ? "bg-green-500" : checklist.completion.percentage >= 50 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${checklist.completion.percentage}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity Verification */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Identity Verification</h3>
              <div className="space-y-2">
                {checklist.identity_verification?.map((item: { check: string; label: string; status: string; completed: boolean }) => (
                  <div key={item.check} className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" aria-hidden="true" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-navy-500 shrink-0" />
                    )}
                    <span className={`text-sm ${item.completed ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                      {item.label}
                    </span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                      item.status === "VERIFIED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : item.status === "PENDING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : item.status === "REJECTED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-100 text-gray-500 dark:bg-navy-600 dark:text-gray-400"
                    }`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Completeness */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Profile Completeness</h3>
              <div className="space-y-2">
                {checklist.profile_completeness?.map((item: { check: string; label: string; status: string; completed: boolean }) => (
                  <div key={item.check} className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" aria-hidden="true" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-navy-500 shrink-0" />
                    )}
                    <span className={`text-sm ${item.completed ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                      {item.label}
                    </span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                      item.completed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-navy-600 dark:text-gray-400"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Progression */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tier Progression</h3>
              <div className="flex items-center gap-2">
                {checklist.tier_progression?.map((item: { tier: string; status: string; completed: boolean }, i: number) => (
                  <div key={item.tier} className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      item.status === "CURRENT" ? "bg-primary text-white"
                        : item.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-400 dark:bg-navy-600 dark:text-gray-500"
                    }`}>
                      {item.tier}
                    </div>
                    {i < (checklist.tier_progression?.length || 0) - 1 && (
                      <span className="text-gray-300 dark:text-navy-500">&rarr;</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Assessment */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Risk Assessment</h3>
              <div className="space-y-2">
                {checklist.risk_assessment?.map((item: { check: string; label: string; status: string; completed: boolean }) => (
                  <div key={item.check} className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" aria-hidden="true" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-navy-500 shrink-0" />
                    )}
                    <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                    <RiskBadge level={item.status} />
                  </div>
                ))}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Total decisions: {checklist.total_decisions}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Notes */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5" aria-hidden="true" />
          Case Notes
          {caseNotes && caseNotes.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-navy-600 text-xs text-gray-600 dark:text-gray-400">
              {caseNotes.length}
            </span>
          )}
        </h2>

        {/* Add Note Form */}
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            >
              <option value="GENERAL">General</option>
              <option value="INVESTIGATION">Investigation</option>
              <option value="ESCALATION">Escalation</option>
              <option value="REVIEW">Review</option>
              <option value="EDD">Enhanced Due Diligence</option>
              <option value="RESOLUTION">Resolution</option>
            </select>
            <input
              type="text"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a case note..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400"
            />
            <button
              onClick={async () => {
                if (!noteContent.trim()) return;
                try {
                  await createNote({ external_id: id, content: noteContent, note_type: noteType }).unwrap();
                  setNoteContent("");
                } catch { /* handled by RTK */ }
              }}
              disabled={creatingNote || !noteContent.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {creatingNote ? "..." : "Add"}
            </button>
          </div>
        </div>

        {/* Notes List */}
        {!caseNotes || caseNotes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No case notes yet.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {caseNotes.map((note: { id: string; author_email: string; author_role?: string; note_type: string; content: string; created_at: string }) => {
              const typeColors: Record<string, string> = {
                GENERAL: "bg-gray-100 text-gray-600 dark:bg-navy-600 dark:text-gray-400",
                INVESTIGATION: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                ESCALATION: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                EDD: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                RESOLUTION: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              };
              return (
                <div key={note.id} className="border border-gray-100 dark:border-navy-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[note.note_type] || typeColors.GENERAL}`}>
                      {note.note_type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{note.author_email}</span>
                    {note.author_role && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">({note.author_role})</span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metadata */}
      {customer.metadata && Object.keys(customer.metadata).length > 0 && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Metadata</h2>
          <pre className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
            {JSON.stringify(customer.metadata, null, 2)}
          </pre>
        </div>
      )}

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        externalId={id}
        clientId={clientId}
        currentTier={customer.current_tier}
        entityType={customer.entity_type}
      />
    </div>
    </ClientGuard>
  );
}
