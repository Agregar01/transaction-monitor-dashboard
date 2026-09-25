"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ActionBadge from "@/components/ActionBadge";
import QueryState from "@/components/QueryState";
import TravelRuleTabs from "@/components/TravelRuleTabs";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";
import { useGetTravelRuleMIQuery, useListTravelRuleRecordsQuery } from "@/redux/slices/api/travelRuleApi";
import { ageLabel, formatPct, humaniseReason, primaryReason, statusLabel } from "@/lib/travelRule";
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

  const mi = useGetTravelRuleMIQuery(undefined, { pollingInterval: polling });
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

  const exportCsv = async () => {
    try {
      await downloadFile(`${API_V1}/travel-rule/mi/export.csv`, "travel-rule-mi.csv");
    } catch (e) {
      showToast({ type: "error", title: "Export failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <TravelRuleTabs />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Last 30 days
          </h2>
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Export MI (CSV)
          </button>
        </div>
        <QueryState isLoading={mi.isLoading} isError={mi.isError} error={mi.error} rows={2} cols={3}>
          {m && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                label="Unhosted exposure"
                value={money(m.exposure.unhosted_value)}
                hint={`${m.exposure.unhosted_count} transfers`}
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
