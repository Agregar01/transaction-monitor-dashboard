"use client";

import Link from "next/link";
import ActionBadge from "@/components/ActionBadge";
import { useGetTransactionQuery } from "@/redux/slices/api/transactionsApi";
import { humaniseMissingField, humaniseReason, statusLabel } from "@/lib/travelRule";
import type { TransactionTravelRuleSummary } from "@/types/api";

const CARD = "bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6";
const H2 = "text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3";

/**
 * Travel Rule summary card. Pass `summary` directly (transaction detail) or a
 * `transactionId` to fetch it (alert detail). Renders nothing when there is no
 * summary, so it is safe to drop on any page.
 */
export default function TravelRulePanel({
  summary,
  transactionId,
}: {
  summary?: TransactionTravelRuleSummary | null;
  transactionId?: string;
}) {
  const { data } = useGetTransactionQuery(transactionId ?? "", { skip: !transactionId || summary !== undefined });
  const s = summary !== undefined ? summary : data?.travel_rule;
  if (!s) return null;

  if (s.kind === "FIAT_R16") {
    if (!s.required) return null;
    return (
      <section className={CARD}>
        <h2 className={H2}>Travel Rule (FATF R.16)</h2>
        <div className="flex items-center gap-2 text-sm">
          <ActionBadge action={s.compliant ? "PROCEED" : "HOLD"} />
          <span className="text-gray-700 dark:text-gray-300">
            {s.compliant
              ? "Cross-border transfer above threshold with complete originator and beneficiary data."
              : "Cross-border transfer above threshold is missing required originator or beneficiary data."}
          </span>
        </div>
        {s.missing_fields.length > 0 && (
          <ul className="mt-3 list-disc list-inside text-sm text-gray-600 dark:text-gray-300">
            {s.missing_fields.map((f) => (
              <li key={f}>{f.replace(/_/g, " ")}</li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={H2.replace(" mb-3", "")}>Travel Rule (virtual asset)</h2>
        {s.record_id && (
          <Link href={`/dashboard/travel-rule/${s.record_id}`} className="text-xs text-primary hover:underline">
            Open record
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {s.disposition && <ActionBadge action={s.disposition} />}
        {s.status && <span className="text-gray-600 dark:text-gray-300">{statusLabel(s.status)}</span>}
        {s.mode && <ActionBadge action={s.mode} />}
        {s.asset_symbol && (
          <span className="text-gray-500 dark:text-gray-400">
            {s.direction?.toLowerCase()} {s.asset_symbol} on {s.network}
          </span>
        )}
      </div>
      {(s.missing_fields?.length ?? 0) > 0 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Missing</p>
          <ul className="mt-1 list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
            {s.missing_fields!.map((f) => (
              <li key={f}>{humaniseMissingField(f)}</li>
            ))}
          </ul>
        </div>
      )}
      {s.reason_codes.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
          {s.reason_codes.map((r) => (
            <li key={r}>{humaniseReason(r)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
