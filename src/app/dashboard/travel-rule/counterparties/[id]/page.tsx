"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ActionBadge from "@/components/ActionBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import QueryState from "@/components/QueryState";
import { SkeletonCard } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import {
  ageLabel,
  canClearSanctionsHit,
  humaniseReason,
  IDENTITY_FIELDS,
  identityChangeResetsDd,
  normaliseIdentityValue,
  primaryReason,
  SANCTIONS_ESCALATIONS,
  statusLabel,
} from "@/lib/travelRule";
import { useAppSelector } from "@/redux/store";
import {
  useCreateCounterpartyReviewMutation,
  useGetCounterpartyQuery,
  useListTravelRuleRecordsQuery,
  useUpdateCounterpartyMutation,
} from "@/redux/slices/api/travelRuleApi";
import type { CounterpartyReviewInput, CounterpartyVasp, CounterpartyVaspInput } from "@/types/api";

const CARD = "bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6";
const H2 = "text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3";
const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";
const TH = "px-4 py-3 text-left font-semibold";
const TD = "px-4 py-3 text-sm";
const TRANSFERS_PAGE = 20;

const CHECKLIST: { key: string; label: string }[] = [
  { key: "licence_verified", label: "Licence or registration verified with the regulator" },
  { key: "sanctions_screened", label: "Entity and owners screened against sanctions lists" },
  { key: "aml_programme_audited", label: "AML/CFT programme independently audited" },
  { key: "travel_rule_capable", label: "Can send and receive Travel Rule data (protocol confirmed)" },
  { key: "confidentiality", label: "Can protect the confidentiality of transmitted data" },
  { key: "questionnaire_received", label: "Due diligence questionnaire received" },
];

function EditForm({ vasp }: { vasp: CounterpartyVasp }) {
  const initial = {
    legal_name: vasp.legal_name,
    lei: vasp.lei ?? "",
    registration_number: vasp.registration_number ?? "",
    registration_authority: vasp.registration_authority ?? "",
    country: vasp.country ?? "",
    licence_status: vasp.licence_status,
    licence_source: vasp.licence_source ?? "",
    travel_rule_protocols: vasp.travel_rule_protocols.join(", "),
    notes: vasp.notes ?? "",
    confidentiality_assessed: vasp.confidentiality_assessed,
  };
  const [form, setForm] = useState(initial);
  const [confirmReset, setConfirmReset] = useState(false);
  const [update, { isLoading }] = useUpdateCounterpartyMutation();

  const legalNameMissing = !form.legal_name.trim();

  // Only fields the analyst actually changed are sent (the backend resets due
  // diligence when an identity field of a reviewed counterparty changes). Identity
  // values are compared the way the backend stores them (trimmed, LEI and country
  // upper-cased), so retyping the same LEI in lower case is not a change.
  const changes = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const k of IDENTITY_FIELDS) {
      const next = normaliseIdentityValue(k, form[k]);
      if (next === normaliseIdentityValue(k, initial[k])) continue;
      // legal_name is required: never send null for it (the save button is disabled instead).
      if (k === "legal_name" && next === null) continue;
      out[k] = next;
    }
    (["licence_source", "notes"] as const).forEach((k) => {
      const v = String(form[k]).trim();
      if (v !== String(initial[k]).trim()) out[k] = v || null;
    });
    if (form.licence_status !== initial.licence_status) out.licence_status = form.licence_status;
    if (form.confidentiality_assessed !== initial.confidentiality_assessed) {
      out.confidentiality_assessed = form.confidentiality_assessed;
    }
    const protocols = form.travel_rule_protocols.split(",").map((p) => p.trim()).filter(Boolean);
    if (protocols.join(",") !== vasp.travel_rule_protocols.join(",")) out.travel_rule_protocols = protocols;
    return out;
  };

  const doSave = async () => {
    setConfirmReset(false);
    if (legalNameMissing) return;
    const body = changes();
    if (Object.keys(body).length === 0) {
      showToast({ type: "info", title: "No changes", message: "Nothing to save." });
      return;
    }
    try {
      const saved = await update({ id: vasp.id, ...(body as CounterpartyVaspInput) }).unwrap();
      showToast({
        type: "success",
        title: "Saved",
        message:
          saved.dd_status !== vasp.dd_status
            ? `Counterparty updated. Due diligence is now ${saved.dd_status.replace(/_/g, " ").toLowerCase()}.`
            : "Counterparty details updated.",
      });
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: errorMessage(e) });
    }
  };

  const save = () => {
    if (legalNameMissing) return;
    if (identityChangeResetsDd(vasp.dd_status, initial, changes())) setConfirmReset(true);
    else void doSave();
  };

  const field = (key: keyof typeof initial, label: string, extra?: string) => (
    <label className="text-xs text-gray-500 dark:text-gray-400">
      {label}
      <input
        className={`${INPUT}${extra ?? ""}`}
        value={String(form[key])}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <section className={CARD}>
      <h2 className={H2}>Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          {field("legal_name", "Legal name (required)")}
          {legalNameMissing && <p className="mt-1 text-xs text-red-600 dark:text-red-300">Legal name cannot be empty.</p>}
        </div>
        {field("lei", "LEI (20 characters)", " font-mono uppercase")}
        {field("registration_number", "Registration number")}
        {field("registration_authority", "Registration authority (GLEIF RA code)")}
        {field("country", "Country (ISO 3166 alpha-2)", " uppercase")}
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Licence status
          <select className={INPUT} value={form.licence_status} onChange={(e) => setForm({ ...form, licence_status: e.target.value })}>
            {["UNKNOWN", "LICENSED", "REGISTERED", "EXEMPT", "UNLICENSED"].map((s) => (
              <option key={s} value={s}>{s.toLowerCase()}</option>
            ))}
          </select>
        </label>
        {field("licence_source", "Licence source (register URL or document)")}
        {field("travel_rule_protocols", "Travel Rule protocols (comma separated)")}
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
        Changing the legal name, LEI, registration number, registration authority or country of a
        reviewed counterparty resets its due diligence to not started.
      </p>
      <button onClick={save} disabled={isLoading || legalNameMissing} className="mt-3 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">
        {isLoading ? "Saving..." : "Save details"}
      </button>
      <ConfirmDialog
        open={confirmReset}
        title="Reset due diligence?"
        message="You are changing an identity field of a counterparty that has been reviewed. Its due diligence will be reset to not started, and outbound transfers to it will be held until a new review is approved."
        confirmLabel="Save and reset"
        onConfirm={() => void doSave()}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  );
}

function ReviewForm({ vasp }: { vasp: CounterpartyVasp }) {
  const [form, setForm] = useState<CounterpartyReviewInput>({
    review_type: "INITIAL",
    proposed_outcome: "APPROVED",
    risk_rating: "LOW",
    checklist: {},
    evidence_notes: "",
    clear_sanctions_hit: false,
  });
  const [create, { isLoading }] = useCreateCounterpartyReviewMutation();
  const canClear = canClearSanctionsHit(vasp.sanctions_status);
  const submit = async () => {
    try {
      await create({
        id: vasp.id,
        ...form,
        evidence_notes: form.evidence_notes?.trim() || null,
        clear_sanctions_hit: canClear && !!form.clear_sanctions_hit,
      }).unwrap();
      showToast({ type: "success", title: "Review submitted", message: "A second user approves it on the Approvals page." });
      setForm({ ...form, checklist: {}, evidence_notes: "", clear_sanctions_hit: false });
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
      {canClear && (
        <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            <input
              type="checkbox"
              checked={!!form.clear_sanctions_hit}
              onChange={(e) => setForm({ ...form, clear_sanctions_hit: e.target.checked })}
            />
            Clear sanctions hit (false positive)
          </label>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Sanctions screening is {vasp.sanctions_status.toLowerCase()}. Tick this only when the evidence shows the match
            is not this VASP. The clearance applies when a second user approves the review, and only for the name that
            was screened.
          </p>
        </div>
      )}
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

function SanctionsCard({ vasp, canManage }: { vasp: CounterpartyVasp; canManage: boolean }) {
  const options = SANCTIONS_ESCALATIONS.filter((s) => s !== vasp.sanctions_status);
  const [target, setTarget] = useState<"" | (typeof SANCTIONS_ESCALATIONS)[number]>("");
  const [update, { isLoading }] = useUpdateCounterpartyMutation();
  const escalate = async () => {
    if (!target) return;
    try {
      await update({ id: vasp.id, sanctions_status: target }).unwrap();
      showToast({ type: "success", title: "Sanctions status escalated", message: `Sanctions status is now ${target.toLowerCase()}.` });
      setTarget("");
    } catch (e) {
      showToast({ type: "error", title: "Escalation failed", message: errorMessage(e) });
    }
  };
  return (
    <section className={CARD}>
      <h2 className={H2}>Sanctions screening</h2>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ActionBadge action={vasp.sanctions_status} />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {vasp.sanctions_checked_at ? `Last screened ${new Date(vasp.sanctions_checked_at).toLocaleString()}` : "Not screened yet"}
        </span>
      </div>
      {canManage && options.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">
            Escalate to
            <select
              className={INPUT}
              value={target}
              onChange={(e) => setTarget(e.target.value as typeof target)}
            >
              <option value="">Choose</option>
              {options.map((o) => (
                <option key={o} value={o}>{o === "HIT" ? "Hit (stops transfers)" : "Review (holds transfers)"}</option>
              ))}
            </select>
          </label>
          <button
            onClick={escalate}
            disabled={!target || isLoading}
            className="px-4 py-2 text-sm font-medium border border-red-300 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Escalate"}
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Sanctions status can only be escalated here. A hit or review is cleared through a due diligence review with
        &quot;clear sanctions hit&quot; ticked, approved by a second user.
      </p>
    </section>
  );
}

function CounterpartyTransfers({ vaspId }: { vaspId: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useListTravelRuleRecordsQuery({
    counterparty_vasp_id: vaspId,
    limit: TRANSFERS_PAGE,
    offset,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Transfers with this counterparty</h2>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={items.length === 0}
        emptyMessage="No virtual asset transfers with this counterparty yet."
      >
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className={TH}>Transfer</th>
                <th className={TH}>Direction</th>
                <th className={TH}>Disposition</th>
                <th className={TH}>Status</th>
                <th className={TH}>Main reason</th>
                <th className={TH}>Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {items.map((r) => {
                const code = primaryReason(r.reason_codes);
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-navy-600/50">
                    <td className={TD}>
                      <Link href={`/dashboard/travel-rule/${r.id}`} className="font-mono text-xs text-primary hover:underline">
                        {r.transaction_id}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{r.asset_symbol} on {r.network}</p>
                    </td>
                    <td className={TD}>{r.direction === "OUTBOUND" ? "Outbound" : "Inbound"}</td>
                    <td className={TD}><ActionBadge action={r.disposition} /></td>
                    <td className={`${TD} text-gray-600 dark:text-gray-300`}>{statusLabel(r.status)}</td>
                    <td className={`${TD} text-gray-600 dark:text-gray-300 max-w-xs`}>{code ? humaniseReason(code) : "None"}</td>
                    <td className={`${TD} text-gray-500 dark:text-gray-400`}>{ageLabel(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > TRANSFERS_PAGE && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{offset + 1} to {Math.min(offset + TRANSFERS_PAGE, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - TRANSFERS_PAGE))} className="px-3 py-1 border border-gray-200 dark:border-navy-500 rounded disabled:opacity-40">
                Previous
              </button>
              <button disabled={offset + TRANSFERS_PAGE >= total} onClick={() => setOffset(offset + TRANSFERS_PAGE)} className="px-3 py-1 border border-gray-200 dark:border-navy-500 rounded disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </QueryState>
    </section>
  );
}

export default function CounterpartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const permissions = useAppSelector((s) => s.auth.permissions);
  const institutionId = useAppSelector((s) => s.auth.institutionId);
  // Platform users (no institution) read the register but do not edit it, as on the list page.
  const canManage = permissions.includes("manage_counterparty_vasps") && !!institutionId;
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
          <SanctionsCard vasp={v} canManage={canManage} />
          {canManage && <ReviewForm vasp={v} />}
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

      <CounterpartyTransfers vaspId={v.id} />
    </div>
  );
}
