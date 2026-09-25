"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ActionBadge from "@/components/ActionBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { API_V1 } from "@/config/api";
import { downloadFile } from "@/lib/download";
import { errorMessage } from "@/lib/errors";
import {
  allowedResolutionLabel,
  cureHint,
  dataTimestampLabel,
  unconfirmedProfileNotice,
  flattenIvmsParty,
  humaniseMissingField,
  humaniseReason,
  isFourEyesResolution,
  statusLabel,
  type FlatParty,
  type IvmsSide,
} from "@/lib/travelRule";
import { useAppSelector } from "@/redux/store";
import {
  useGetTravelRuleRecordQuery,
  useListTravelRuleProfilesQuery,
  useResolveTravelRuleRecordMutation,
} from "@/redux/slices/api/travelRuleApi";
import type { TravelRuleRecordDetail, TravelRuleResolution } from "@/types/api";

const CARD = "bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6";
const H2 = "text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3";
const DT = "text-gray-500 dark:text-gray-400";
const DD = "text-gray-900 dark:text-white break-all";

function fmt(ts: string | null | undefined): string {
  return ts ? new Date(ts).toLocaleString() : "n/a";
}

function PartyCard({ title, party, missingPrefix, missing }: {
  title: string;
  party: FlatParty | null;
  missingPrefix: string;
  missing: string[];
}) {
  const relevant = missing.filter((m) => m.startsWith(missingPrefix));
  return (
    <div className="rounded-lg border border-gray-100 dark:border-navy-600 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
      {!party ? (
        <p className="mt-2 text-sm text-gray-400">Not supplied</p>
      ) : (
        <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-sm">
          <dt className={DT}>Name</dt>
          <dd className={`col-span-2 ${DD}`}>{party.name ?? "n/a"} <span className="text-xs text-gray-400">({party.kind})</span></dd>
          {party.accounts.length > 0 && (
            <>
              <dt className={DT}>Wallet</dt>
              <dd className={`col-span-2 font-mono text-xs ${DD}`}>{party.accounts.join(", ")}</dd>
            </>
          )}
          {party.address && (
            <>
              <dt className={DT}>Address</dt>
              <dd className={`col-span-2 ${DD}`}>{party.address}</dd>
            </>
          )}
          {party.identifiers.map((id) => (
            <div key={id} className="contents">
              <dt className={DT}>Identifier</dt>
              <dd className={`col-span-2 font-mono text-xs ${DD}`}>{id}</dd>
            </div>
          ))}
          {(party.dateOfBirth || party.placeOfBirth) && (
            <>
              <dt className={DT}>Born</dt>
              <dd className={`col-span-2 ${DD}`}>{[party.dateOfBirth, party.placeOfBirth].filter(Boolean).join(", ")}</dd>
            </>
          )}
          {party.customerId && (
            <>
              <dt className={DT}>Customer ID</dt>
              <dd className={`col-span-2 font-mono text-xs ${DD}`}>{party.customerId}</dd>
            </>
          )}
        </dl>
      )}
      {relevant.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-red-600 dark:text-red-300">
          {relevant.map((m) => (
            <li key={m}>Missing: {humaniseMissingField(m)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResolutionForm({ record }: { record: TravelRuleRecordDetail }) {
  const [resolution, setResolution] = useState<TravelRuleResolution | "">("");
  const [reason, setReason] = useState("");
  const [resolve, { isLoading }] = useResolveTravelRuleRecordMutation();
  const options = record.allowed_resolutions;

  const hint = record.direction === "OUTBOUND" ? cureHint(record) : null;

  if (options.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {hint ?? "No actions are available for this record in its current state."}
      </p>
    );
  }

  const submit = async () => {
    if (!resolution) return;
    try {
      const out = await resolve({ id: record.id, resolution, reason: reason.trim() }).unwrap();
      showToast(
        out.approval_id
          ? { type: "success", title: "Approval requested", message: "A second user must approve this on the Approvals page." }
          : { type: "success", title: "Resolved", message: `Disposition is now ${out.disposition.replace(/_/g, " ")}.` },
      );
      setResolution("");
      setReason("");
    } catch (e) {
      showToast({ type: "error", title: "Action refused", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-3">
      {hint && <p className="text-xs text-gray-600 dark:text-gray-300">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => setResolution(o)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              resolution === o
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
            }`}
          >
            {allowedResolutionLabel(o)}
          </button>
        ))}
      </div>
      {resolution && isFourEyesResolution(resolution) && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          This creates a four-eyes approval request. A different user approves it on the{" "}
          <Link href="/dashboard/approvals" className="underline">Approvals</Link> page before it takes effect.
        </p>
      )}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Reason for the record (at least 10 characters). This is kept as audit evidence."
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
      />
      <button
        onClick={submit}
        disabled={!resolution || reason.trim().length < 10 || isLoading}
        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
      >
        {isLoading ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}

export default function TravelRuleRecordPage() {
  const { id } = useParams<{ id: string }>();
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canManage = permissions.includes("manage_travel_rule");
  const { data: r, isLoading, isError, error } = useGetTravelRuleRecordQuery(id);
  const { data: profiles } = useListTravelRuleProfilesQuery();
  const profile = profiles?.find((p) => p.jurisdiction_code === r?.profile_jurisdiction);

  useEffect(() => {
    document.title = "Travel Rule record | Transaction Monitor";
  }, []);

  if (isLoading) return <SkeletonCard />;
  if (isError || !r) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        {errorMessage(error) || "Failed to load this Travel Rule record."}
      </div>
    );
  }

  const payload = r.ivms101_payload;
  const party = (side: IvmsSide) => flattenIvmsParty(payload, side);
  const exportBundle = async () => {
    try {
      await downloadFile(`${API_V1}/travel-rule/records/${r.id}/export`, `travel-rule-${r.id}.json`);
    } catch (e) {
      showToast({ type: "error", title: "Export failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/travel-rule" className="text-xs text-primary hover:underline">Travel Rule</Link>
          <h1 className="font-mono text-lg text-gray-900 dark:text-white">{r.transaction_id}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {r.direction === "OUTBOUND" ? "Outbound" : "Inbound"} {r.asset_symbol} on {r.network}, recorded {fmt(r.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionBadge action={r.disposition} />
          <ActionBadge action={r.enforcement_mode} />
          <button
            onClick={exportBundle}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Export evidence (JSON)
          </button>
        </div>
      </div>

      {r.profile_legal_status !== "CONFIRMED" && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-4 text-sm">
          {unconfirmedProfileNotice({
            profile_jurisdiction: r.profile_jurisdiction,
            threshold_amount: profile?.threshold_amount ?? null,
            currency: profile?.currency ?? null,
          })}
        </div>
      )}
      {r.enforcement_mode === "SHADOW" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-xl p-4 text-sm">
          Shadow mode: this verdict is recorded and queued but does not hold or block the transaction.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className={CARD}>
            <h2 className={H2}>Verdict</h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-sm">
              <dt className={DT}>Status</dt>
              <dd className={`md:col-span-2 ${DD}`}>{statusLabel(r.status)}</dd>
              <dt className={DT}>Threshold band</dt>
              <dd className={`md:col-span-2 ${DD}`}>
                {r.threshold_band === "ABOVE" ? "At or above threshold (full data set)" : "Below threshold (reduced data set)"}
              </dd>
              <dt className={DT}>Profile</dt>
              <dd className={`md:col-span-2 ${DD}`}>
                <Link href="/dashboard/travel-rule/profiles" className="text-primary hover:underline">
                  {r.profile_jurisdiction} v{r.profile_version}
                </Link>{" "}
                <ActionBadge action={r.profile_legal_status} />
              </dd>
              <dt className={DT}>Screening</dt>
              <dd className={`md:col-span-2 ${DD}`}><ActionBadge action={r.screening_status} /></dd>
              {r.name_alignment_score != null && (
                <>
                  <dt className={DT}>KYC name match</dt>
                  <dd className={`md:col-span-2 ${DD}`}>{r.name_alignment_score}/100</dd>
                </>
              )}
              {r.analytics_risk_score != null && (
                <>
                  <dt className={DT}>Analytics risk</dt>
                  <dd className={`md:col-span-2 ${DD}`}>{r.analytics_risk_score}/100</dd>
                </>
              )}
            </dl>
            {r.reason_codes.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Reasons</p>
                <ul className="mt-1 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {r.reason_codes.map((c) => (
                    <li key={c}>
                      <span className="font-mono text-xs text-gray-400 mr-2">{c}</span>
                      {humaniseReason(c)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.missing_fields.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Missing information</p>
                <ul className="mt-1 list-disc list-inside text-sm text-red-700 dark:text-red-300">
                  {r.missing_fields.map((f) => (
                    <li key={f}>{humaniseMissingField(f)}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.ivms_errors.length > 0 && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                IVMS101 constraint issues: <span className="font-mono">{r.ivms_errors.join(", ")}</span>
              </p>
            )}
          </section>

          <section className={CARD}>
            <h2 className={H2}>Parties (IVMS101{r.ivms101_version ? ` ${r.ivms101_version}` : ""})</h2>
            {r.purged_at ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Personal data was deleted on {fmt(r.purged_at)} after the retention period.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PartyCard title="Originator" party={party("originator")} missingPrefix="originator." missing={r.missing_fields} />
                <PartyCard title="Beneficiary" party={party("beneficiary")} missingPrefix="beneficiary." missing={r.missing_fields} />
                <PartyCard title="Originating VASP" party={party("originatingVASP")} missingPrefix="none" missing={[]} />
                <PartyCard title="Beneficiary VASP" party={party("beneficiaryVASP")} missingPrefix="none" missing={[]} />
              </div>
            )}
          </section>

          <section className={CARD}>
            <h2 className={H2}>Lifecycle</h2>
            <ul className="space-y-3">
              {r.events.map((e) => (
                <li key={e.id} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <strong>{statusLabel(e.event_type)}</strong>
                    {e.to_status && e.to_status !== e.from_status && <> : {statusLabel(e.from_status)} to {statusLabel(e.to_status)}</>}
                    {e.protocol_state_raw && <span className="ml-2 font-mono text-xs text-gray-400">{e.protocol_state_raw}</span>}
                  </p>
                  {e.details && (e.details as Record<string, unknown>).resolution != null && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {allowedResolutionLabel(String((e.details as Record<string, unknown>).resolution))}
                    </p>
                  )}
                  {Array.isArray((e.details as Record<string, unknown> | null)?.new_reasons) &&
                    ((e.details as Record<string, unknown>).new_reasons as string[]).length > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-300">
                        {((e.details as Record<string, unknown>).new_reasons as string[]).map(humaniseReason).join("; ")}
                      </p>
                    )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {e.source.toLowerCase().replace(/_/g, " ")} · {fmt(e.occurred_at ?? e.recorded_at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className={CARD}>
            <h2 className={H2}>Transfer</h2>
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <dt className={DT}>Fiat value</dt>
              <dd className={`col-span-2 font-mono ${DD}`}>{r.amount == null ? "n/a" : Number(r.amount).toLocaleString()}</dd>
              <dt className={DT}>Native</dt>
              <dd className={`col-span-2 font-mono ${DD}`}>{r.amount_native ?? "n/a"} {r.asset_symbol}</dd>
              {r.fx_rate != null && (
                <>
                  <dt className={DT}>FX</dt>
                  <dd className={`col-span-2 ${DD}`}>{r.fx_rate}{r.fx_source ? ` (${r.fx_source})` : ""}</dd>
                </>
              )}
              <dt className={DT}>From wallet</dt>
              <dd className={`col-span-2 font-mono text-xs ${DD}`}>{r.originator_wallet ?? "n/a"}</dd>
              <dt className={DT}>To wallet</dt>
              <dd className={`col-span-2 font-mono text-xs ${DD}`}>{r.beneficiary_wallet ?? "n/a"}</dd>
              {r.wallet_memo && (
                <>
                  <dt className={DT}>Memo / tag</dt>
                  <dd className={`col-span-2 font-mono text-xs ${DD}`}>{r.wallet_memo}</dd>
                </>
              )}
              <dt className={DT}>Tx hash</dt>
              <dd className={`col-span-2 font-mono text-xs ${DD}`}>{r.tx_hash ?? "not bound yet"}</dd>
              <dt className={DT}>{dataTimestampLabel(r.direction)}</dt>
              <dd className={`col-span-2 ${DD}`}>{fmt(r.tr_sent_at ?? r.tr_received_at)}</dd>
              <dt className={DT}>Broadcast</dt>
              <dd className={`col-span-2 ${DD}`}>{fmt(r.onchain_broadcast_at)}</dd>
              {r.post_facto && (
                <dd className="col-span-3 text-xs text-red-600 dark:text-red-300">Data was sent after the broadcast (post facto).</dd>
              )}
              <dt className={DT}>Protocol</dt>
              <dd className={`col-span-2 ${DD}`}>{r.protocol ?? "n/a"}{r.protocol_reference ? ` (${r.protocol_reference})` : ""}</dd>
              <dt className={DT}>Transaction</dt>
              <dd className="col-span-2">
                <Link href={`/dashboard/transactions/${r.transaction_id}`} className="font-mono text-xs text-primary hover:underline">
                  {r.transaction_id}
                </Link>
              </dd>
              {r.customer_id && (
                <>
                  <dt className={DT}>Customer</dt>
                  <dd className="col-span-2">
                    <Link href={`/dashboard/customers/${r.customer_id}`} className="font-mono text-xs text-primary hover:underline">
                      {r.customer_id}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          </section>

          <section className={CARD}>
            <h2 className={H2}>Counterparty</h2>
            <p className="text-sm text-gray-900 dark:text-white">
              {r.counterparty_type === "VASP" || r.counterparty_type === "UNKNOWN" ? (
                r.counterparty_vasp_id ? (
                  <Link href={`/dashboard/travel-rule/counterparties/${r.counterparty_vasp_id}`} className="text-primary hover:underline">
                    {r.counterparty_name ?? "Counterparty VASP"}
                  </Link>
                ) : (
                  "Unidentified VASP"
                )
              ) : r.counterparty_type === "UNHOSTED" ? (
                "Unhosted (self-hosted) wallet"
              ) : (
                "Internal (both customers of this institution)"
              )}
            </p>
            {r.counterparty_dd_status && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Due diligence</span>
                <ActionBadge action={r.counterparty_dd_status} />
                {r.counterparty_risk_rating && <ActionBadge action={r.counterparty_risk_rating} />}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Identified by {r.counterparty_identification_method.toLowerCase().replace(/_/g, " ")}
            </p>
          </section>

          <section className={CARD}>
            <h2 className={H2}>Resolve</h2>
            {r.resolution && (
              <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                Last resolution: <strong>{allowedResolutionLabel(r.resolution)}</strong>
                {r.resolved_at && <> on {fmt(r.resolved_at)}</>}
                {r.resolution_reason && <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{r.resolution_reason}</span>}
              </p>
            )}
            {canManage ? (
              <ResolutionForm record={r} />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">You need manage_travel_rule to act on this record.</p>
            )}
            {r.info_deadline_at && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Information requested, due {fmt(r.info_deadline_at)}.</p>
            )}
          </section>

          <section className={CARD}>
            <h2 className={H2}>Retention</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Kept until {r.retention_until ?? "n/a"}
              {r.legal_hold && " (legal hold: linked open case or filed STR)"}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
