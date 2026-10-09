"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ActionBadge from "@/components/ActionBadge";
import QueryState from "@/components/QueryState";
import TravelRuleTabs from "@/components/TravelRuleTabs";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";
import { useGetTravelRuleMIQuery, useListTravelRuleRecordsQuery } from "@/redux/slices/api/travelRuleApi";
import {
  ageLabel,
  allowedResolutionLabel,
  defaultMiPeriod,
  formatPct,
  humaniseMissingField,
  humaniseReason,
  miPeriodParams,
  primaryReason,
  statusLabel,
  clampOffset,
  topReasons,
} from "@/lib/travelRule";
import { API_V1 } from "@/config/api";
import { downloadFile } from "@/lib/download";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";

const TH = "px-4 py-3 text-left font-semibold";
const TD = "px-4 py-3 text-sm";
const SELECT =
  "px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";
const PAGE = 50;

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "bad" }) {
  const color =
    tone === "bad" ? "text-red-600 dark:text-red-300" : tone === "warn" ? "text-amber-600 dark:text-amber-300" : "text-gray-900 dark:text-white";
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

function money(n: number | null | undefined): string {
  return n == null ? "n/a" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Compact "label: count" list used by the MI breakdown cards. */
function CountList({
  title,
  rows,
  empty,
  render,
}: {
  title: string;
  rows: [string, number][];
  empty: string;
  render?: (key: string) => React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {rows.map(([k, n]) => (
            <li key={k} className="flex items-start justify-between gap-3">
              <span className="text-gray-700 dark:text-gray-300">{render ? render(k) : k}</span>
              <span className="font-mono text-gray-900 dark:text-white">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const DATE_INPUT =
  "px-2 py-1 text-xs border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";

export default function TravelRulePage() {
  useEffect(() => {
    document.title = "Travel Rule | Transaction Monitor";
  }, []);

  const [status, setStatus] = useState("");
  const [disposition, setDisposition] = useState("");
  const [direction, setDirection] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [offset, setOffset] = useState(0);
  const polling = useVisiblePolling(30000);

  const [period, setPeriod] = useState(() => defaultMiPeriod());
  const periodParams = miPeriodParams(period.from, period.to);
  const periodInvalid = !!period.from && !!period.to && period.from > period.to;
  const mi = useGetTravelRuleMIQuery(periodParams, { pollingInterval: polling, skip: periodInvalid });
  const records = useListTravelRuleRecordsQuery(
    {
      status: status || undefined,
      disposition: disposition || undefined,
      direction: direction || undefined,
      exception_open: openOnly ? true : undefined,
      limit: PAGE,
      offset,
    },
    { pollingInterval: polling },
  );

  const m = mi.data;
  const items = records.data?.items ?? [];
  const total = records.data?.total ?? 0;

  // Closing exceptions shrinks the result set; never leave the user on an empty page past the end.
  useEffect(() => {
    if (records.data) {
      const next = clampOffset(offset, total, PAGE);
      if (next !== offset) setOffset(next);
    }
  }, [records.data, offset, total]);

  const exportCsv = async () => {
    try {
      const qs = new URLSearchParams(periodParams as Record<string, string>).toString();
      await downloadFile(
        `${API_V1}/travel-rule/mi/export.csv${qs ? `?${qs}` : ""}`,
        `travel-rule-mi-${period.from || "start"}-to-${period.to || "now"}.csv`,
      );
    } catch (e) {
      showToast({ type: "error", title: "Export failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <TravelRuleTabs />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Management information
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <label className="inline-flex items-center gap-1">
              From
              <input
                type="date"
                aria-label="MI period start"
                className={DATE_INPUT}
                value={period.from}
                max={period.to || undefined}
                onChange={(e) => setPeriod({ ...period, from: e.target.value })}
              />
            </label>
            <label className="inline-flex items-center gap-1">
              To
              <input
                type="date"
                aria-label="MI period end"
                className={DATE_INPUT}
                value={period.to}
                min={period.from || undefined}
                onChange={(e) => setPeriod({ ...period, to: e.target.value })}
              />
            </label>
            <button
              onClick={() => setPeriod(defaultMiPeriod())}
              className="px-2 py-1 text-xs text-primary hover:underline"
            >
              Last 30 days
            </button>
            <button
              onClick={exportCsv}
              disabled={periodInvalid}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
            >
              Export MI (CSV)
            </button>
          </div>
        </div>
        {periodInvalid && (
          <p className="text-xs text-red-600 dark:text-red-300">The start date must be on or before the end date.</p>
        )}
        <QueryState isLoading={mi.isLoading} isError={mi.isError} error={mi.error} rows={2} cols={3}>
          {m && (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <Tile
                label="Compliant"
                value={formatPct(m.transfers.compliant_pct_count)}
                hint={`${m.transfers.compliant_count} of ${m.transfers.count} transfers`}
                tone={m.transfers.compliant_pct_count != null && m.transfers.compliant_pct_count < 95 ? "warn" : undefined}
              />
              <Tile
                label="Sent on time"
                value={formatPct(m.timeliness.on_time_pct)}
                hint={`${m.timeliness.on_time} of ${m.timeliness.with_both_timestamps} with both timestamps`}
                tone={m.timeliness.on_time_pct != null && m.timeliness.on_time_pct < 100 ? "bad" : undefined}
              />
              <Tile
                label="Open exceptions"
                value={String(m.exceptions.open_total)}
                hint={`${m.exceptions.open_by_age.over_7d} older than 7 days`}
                tone={m.exceptions.open_by_age.over_7d > 0 ? "bad" : m.exceptions.open_total > 0 ? "warn" : undefined}
              />
              <Tile
                label="Compliant by value"
                value={formatPct(m.transfers.compliant_pct_value)}
                hint={`${money(m.transfers.compliant_value)} of ${money(m.transfers.value)}`}
                tone={m.transfers.compliant_pct_value != null && m.transfers.compliant_pct_value < 95 ? "warn" : undefined}
              />
              <Tile
                label="Unhosted exposure"
                value={money(m.exposure.unhosted_value)}
                hint={`${m.exposure.unhosted_count} transfers, ${m.exposure.unhosted_third_party_count ?? 0} third-party`}
              />
              <Tile
                label="Unassessed counterparties"
                value={money(m.exposure.non_approved_counterparty_value)}
                hint={`${m.exposure.non_approved_counterparty_count} transfers without approved DD`}
                tone={m.exposure.non_approved_counterparty_count > 0 ? "warn" : undefined}
              />
              <Tile
                label="DD reviews overdue"
                value={String(m.counterparties.reviews_overdue)}
                hint="Not started, in review, expired or past next review"
                tone={m.counterparties.reviews_overdue > 0 ? "warn" : undefined}
              />
            </div>
          )}
          {m && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <CountList
                title="Most frequent reasons (top 10)"
                rows={topReasons(m.reason_frequency, 10)}
                empty="No reason codes in this period."
                render={(code) => (
                  <span title={code}>{humaniseReason(code)}</span>
                )}
              />
              <CountList
                title="Missing fields"
                rows={topReasons(m.missing_fields, 10)}
                empty="No missing fields in this period."
                render={(f) => humaniseMissingField(f)}
              />
              <CountList
                title="Resolutions"
                rows={topReasons(m.exceptions.resolutions, 20)}
                empty="No exceptions resolved in this period."
                render={(r) => allowedResolutionLabel(r)}
              />
              <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-5">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Repeat offenders</p>
                {m.counterparties.repeat_offenders.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-400">No counterparty over the repeat failure threshold.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {m.counterparties.repeat_offenders.map((o) => (
                      <li key={o.id} className="flex items-start justify-between gap-3">
                        <Link href={`/dashboard/travel-rule/counterparties/${o.id}`} className="text-primary hover:underline">
                          {o.legal_name}
                        </Link>
                        <span className="font-mono text-red-600 dark:text-red-300">{o.failures}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {m.exceptions.opened_in_period} exceptions opened in this period.
                </p>
              </div>
            </div>
          )}
        </QueryState>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-auto">
            {openOnly ? "Exception queue" : "All virtual asset transfers"}
          </h2>
          <select aria-label="Direction" value={direction} onChange={(e) => { setDirection(e.target.value); setOffset(0); }} className={SELECT}>
            <option value="">All directions</option>
            <option value="OUTBOUND">Outbound</option>
            <option value="INBOUND">Inbound</option>
          </select>
          <select aria-label="Disposition" value={disposition} onChange={(e) => { setDisposition(e.target.value); setOffset(0); }} className={SELECT}>
            <option value="">All dispositions</option>
            {["PROCEED", "HOLD", "BLOCK", "SUSPEND", "RETURN", "PENDING_INFO"].map((d) => (
              <option key={d} value={d}>{d.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} className={SELECT}>
            <option value="">All statuses</option>
            {["AWAITING_COUNTERPARTY", "AWAITING_DATA", "SENT", "ACKNOWLEDGED", "ACCEPTED", "REPAIR_REQUESTED",
              "INCOMPLETE", "COMPLETED", "REJECTED", "DECLINED", "EXPIRED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={openOnly} onChange={(e) => { setOpenOnly(e.target.checked); setOffset(0); }} />
            Open exceptions only
          </label>
        </div>

        <QueryState
          isLoading={records.isLoading}
          isError={records.isError}
          error={records.error}
          isEmpty={items.length === 0}
          emptyMessage={
            openOnly
              ? "No open Travel Rule exceptions. Virtual asset transfers arrive through ingestion with channel VirtualAsset and a virtual_asset block."
              : "No virtual asset transfers yet. Send them through ingestion with channel VirtualAsset, a virtual_asset block and the IVMS101 payload."
          }
        >
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className={TH}>Transfer</th>
                  <th className={TH}>Direction</th>
                  <th className={TH}>Amount</th>
                  <th className={TH}>Disposition</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Counterparty</th>
                  <th className={TH}>Main reason</th>
                  <th className={TH}>Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-navy-600/50">
                    <td className={TD}>
                      <Link href={`/dashboard/travel-rule/${r.id}`} className="font-mono text-xs text-primary hover:underline">
                        {r.transaction_id}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {r.asset_symbol} on {r.network}
                        {r.enforcement_mode === "SHADOW" && " (shadow)"}
                      </p>
                    </td>
                    <td className={TD}>{r.direction === "OUTBOUND" ? "Outbound" : "Inbound"}</td>
                    <td className={`${TD} font-mono`}>{money(r.amount == null ? null : Number(r.amount))}</td>
                    <td className={TD}><ActionBadge action={r.disposition} /></td>
                    <td className={`${TD} text-gray-600 dark:text-gray-300`}>{statusLabel(r.status)}</td>
                    <td className={TD}>
                      {r.counterparty_vasp_id ? (
                        <Link href={`/dashboard/travel-rule/counterparties/${r.counterparty_vasp_id}`} className="text-primary hover:underline">
                          {r.counterparty_name ?? "VASP"}
                        </Link>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">{r.counterparty_type.toLowerCase()}</span>
                      )}
                    </td>
                    <td className={`${TD} text-gray-600 dark:text-gray-300 max-w-xs`}>
                      {(() => {
                        const code = primaryReason(r.reason_codes);
                        return code ? humaniseReason(code) : "None";
                      })()}
                    </td>
                    <td className={`${TD} text-gray-500 dark:text-gray-400`}>{ageLabel(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {offset + 1} to {Math.min(offset + PAGE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="px-3 py-1 border border-gray-200 dark:border-navy-500 rounded disabled:opacity-40">
                Previous
              </button>
              <button disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)} className="px-3 py-1 border border-gray-200 dark:border-navy-500 rounded disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </QueryState>
      </section>
    </div>
  );
}
