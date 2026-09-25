"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ActionBadge from "@/components/ActionBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { useAppSelector } from "@/redux/store";
import {
  useCreateCounterpartyReviewMutation,
  useGetCounterpartyQuery,
  useUpdateCounterpartyMutation,
} from "@/redux/slices/api/travelRuleApi";
import type { CounterpartyReviewInput, CounterpartyVasp } from "@/types/api";

const CARD = "bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6";
const H2 = "text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3";
const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";

const CHECKLIST: { key: string; label: string }[] = [
  { key: "licence_verified", label: "Licence or registration verified with the regulator" },
  { key: "sanctions_screened", label: "Entity and owners screened against sanctions lists" },
  { key: "aml_programme_audited", label: "AML/CFT programme independently audited" },
  { key: "travel_rule_capable", label: "Can send and receive Travel Rule data (protocol confirmed)" },
  { key: "confidentiality", label: "Can protect the confidentiality of transmitted data" },
  { key: "questionnaire_received", label: "Due diligence questionnaire received" },
];

function EditForm({ vasp }: { vasp: CounterpartyVasp }) {
  const [form, setForm] = useState({
    licence_status: vasp.licence_status,
    licence_source: vasp.licence_source ?? "",
    travel_rule_protocols: vasp.travel_rule_protocols.join(", "),
    notes: vasp.notes ?? "",
    confidentiality_assessed: vasp.confidentiality_assessed,
  });
  const [update, { isLoading }] = useUpdateCounterpartyMutation();
  const save = async () => {
    try {
      await update({
        id: vasp.id,
        licence_status: form.licence_status,
        licence_source: form.licence_source.trim() || null,
        travel_rule_protocols: form.travel_rule_protocols.split(",").map((s) => s.trim()).filter(Boolean),
        notes: form.notes.trim() || null,
        confidentiality_assessed: form.confidentiality_assessed,
      }).unwrap();
      showToast({ type: "success", title: "Saved", message: "Counterparty details updated." });
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: errorMessage(e) });
    }
  };
  return (
    <section className={CARD}>
      <h2 className={H2}>Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Licence status
          <select className={INPUT} value={form.licence_status} onChange={(e) => setForm({ ...form, licence_status: e.target.value })}>
            {["UNKNOWN", "LICENSED", "REGISTERED", "EXEMPT", "UNLICENSED"].map((s) => (
              <option key={s} value={s}>{s.toLowerCase()}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Licence source (register URL or document)
          <input className={INPUT} value={form.licence_source} onChange={(e) => setForm({ ...form, licence_source: e.target.value })} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Travel Rule protocols (comma separated)
          <input className={INPUT} value={form.travel_rule_protocols} onChange={(e) => setForm({ ...form, travel_rule_protocols: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-5">
          <input type="checkbox" checked={form.confidentiality_assessed} onChange={(e) => setForm({ ...form, confidentiality_assessed: e.target.checked })} />
          Confidentiality assessed
        </label>
        <label className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
          Notes
          <textarea className={INPUT} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Due diligence status and risk rating change only through a review approved by a second user.
      </p>
      <button onClick={save} disabled={isLoading} className="mt-3 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">
        {isLoading ? "Saving..." : "Save details"}
      </button>
    </section>
  );
}

function ReviewForm({ vaspId }: { vaspId: string }) {
  const [form, setForm] = useState<CounterpartyReviewInput>({
    review_type: "INITIAL",
    proposed_outcome: "APPROVED",
    risk_rating: "LOW",
    checklist: {},
    evidence_notes: "",
  });
  const [create, { isLoading }] = useCreateCounterpartyReviewMutation();
  const submit = async () => {
    try {
      await create({ id: vaspId, ...form, evidence_notes: form.evidence_notes?.trim() || null }).unwrap();
      showToast({ type: "success", title: "Review submitted", message: "A second user approves it on the Approvals page." });
      setForm({ ...form, checklist: {}, evidence_notes: "" });
    } catch (e) {
      showToast({ type: "error", title: "Review failed", message: errorMessage(e) });
    }
  };
  return (
    <section className={CARD}>
      <h2 className={H2}>New due diligence review</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className={INPUT} aria-label="Review type" value={form.review_type} onChange={(e) => setForm({ ...form, review_type: e.target.value as CounterpartyReviewInput["review_type"] })}>
          <option value="INITIAL">Initial</option>
          <option value="PERIODIC">Periodic</option>
          <option value="TRIGGERED">Triggered</option>
        </select>
        <select className={INPUT} aria-label="Proposed outcome" value={form.proposed_outcome} onChange={(e) => setForm({ ...form, proposed_outcome: e.target.value as CounterpartyReviewInput["proposed_outcome"] })}>
          <option value="APPROVED">Approve</option>
          <option value="RESTRICTED">Restrict</option>
          <option value="REJECTED">Reject</option>
        </select>
        <select className={INPUT} aria-label="Risk rating" value={form.risk_rating} onChange={(e) => setForm({ ...form, risk_rating: e.target.value as CounterpartyReviewInput["risk_rating"] })}>
          {["LOW", "MEDIUM", "HIGH", "PROHIBITED"].map((r) => (
            <option key={r} value={r}>{r.toLowerCase()} risk</option>
          ))}
        </select>
      </div>
      <div className="mt-3 space-y-1">
        {CHECKLIST.map((c) => (
          <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={!!form.checklist[c.key]}
              onChange={(e) => setForm({ ...form, checklist: { ...form.checklist, [c.key]: e.target.checked } })}
            />
            {c.label}
          </label>
        ))}
      </div>
      <textarea
        className={`${INPUT} mt-3`}
        rows={3}
        placeholder="Evidence and notes (sources checked, dates, findings)"
        value={form.evidence_notes ?? ""}
        onChange={(e) => setForm({ ...form, evidence_notes: e.target.value })}
      />
      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
        Submitting creates a four-eyes approval. The outcome applies only after a different user approves it on the{" "}
        <Link href="/dashboard/approvals" className="underline">Approvals</Link> page.
      </p>
      <button onClick={submit} disabled={isLoading} className="mt-3 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">
        {isLoading ? "Submitting..." : "Submit review"}
      </button>
    </section>
  );
}

export default function CounterpartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canManage = permissions.includes("manage_counterparty_vasps");
  const { data: v, isLoading, isError, error } = useGetCounterpartyQuery(id);

  useEffect(() => {
    document.title = "Counterparty VASP | Transaction Monitor";
  }, []);

  if (isLoading) return <SkeletonCard />;
  if (isError || !v) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        {errorMessage(error) || "Failed to load this counterparty."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/travel-rule/counterparties" className="text-xs text-primary hover:underline">Counterparty VASPs</Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{v.legal_name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <ActionBadge action={v.dd_status} />
          {v.risk_rating && <ActionBadge action={v.risk_rating} />}
          <span className="text-gray-500 dark:text-gray-400">Sanctions</span> <ActionBadge action={v.sanctions_status} />
          {v.auto_created && <span className="text-xs text-amber-600 dark:text-amber-300">auto-created from a transfer</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ["LEI", v.lei ?? "n/a"],
          ["Registration", v.registration_number ?? "n/a"],
          ["Country", v.country ?? "n/a"],
          ["Travel Rule failures (window)", String(v.failure_count ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 font-mono text-sm text-gray-900 dark:text-white break-all">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {canManage ? <EditForm vasp={v} /> : (
            <section className={CARD}>
              <h2 className={H2}>Details</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">Licence: {v.licence_status.toLowerCase()}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">Protocols: {v.travel_rule_protocols.join(", ") || "n/a"}</p>
              {v.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{v.notes}</p>}
            </section>
          )}
          {canManage && <ReviewForm vaspId={v.id} />}
        </div>
        <section className={CARD}>
          <h2 className={H2}>Review history</h2>
          {(v.reviews ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No reviews yet.</p>
          ) : (
            <ul className="space-y-3">
              {(v.reviews ?? []).map((rv) => (
                <li key={rv.id} className="border-l-2 border-primary/40 pl-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{rv.review_type.toLowerCase()} review</span>
                    <ActionBadge action={rv.proposed_outcome} />
                    <ActionBadge action={rv.status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Risk {rv.risk_rating.toLowerCase()} · {new Date(rv.created_at).toLocaleString()}
                    {rv.next_review_at && <> · next review {new Date(rv.next_review_at).toLocaleDateString()}</>}
                  </p>
                  {rv.evidence_notes && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{rv.evidence_notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
