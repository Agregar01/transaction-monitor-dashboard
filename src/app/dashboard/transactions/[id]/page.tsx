"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useGetTransactionQuery,
  useGetTransactionTimelineQuery,
  useGetRelatedTransactionsQuery,
} from "@/redux/slices/api/transactionsApi";
import { SkeletonCard } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: tx, isLoading, error } = useGetTransactionQuery(id);
  const { data: timeline } = useGetTransactionTimelineQuery(id, { skip: !id });
  const { data: related } = useGetRelatedTransactionsQuery({ transaction_id: id, limit: 10 }, { skip: !id });

  if (isLoading) return <SkeletonCard />;
  if (error || !tx) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        Failed to load transaction {id}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Transaction</p>
        <h1 className="font-mono text-lg text-gray-900 dark:text-white">{tx.transaction_id}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {new Date(tx.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</p>
          <p className="mt-1 text-2xl font-mono text-gray-900 dark:text-white">
            {tx.amount == null ? "—" : Number(tx.amount).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Combined risk</p>
          <div className="mt-2">
            <RiskBadge score={tx.combined_risk_score} />
          </div>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Type / Channel</p>
          <p className="mt-1 text-gray-900 dark:text-white">
            {tx.transaction_type} · <span className="text-gray-500">{tx.channel}</span>
          </p>
          {tx.flow_type && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tx.flow_type}</p>}
        </div>
      </div>

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Details
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">Customer</dt>
          <dd className="md:col-span-2 font-mono text-xs">
            <Link href={`/dashboard/customers/${tx.customer_id}`} className="text-primary hover:underline">
              {tx.customer_id}
            </Link>
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">Customer risk</dt>
          <dd className="md:col-span-2">{tx.customer_risk_score ?? "—"}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Transaction risk</dt>
          <dd className="md:col-span-2">{tx.transaction_risk_score ?? "—"}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Behavioral risk</dt>
          <dd className="md:col-span-2">{tx.behavioral_risk_score ?? "—"}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Flagged</dt>
          <dd className="md:col-span-2">{tx.flagged ? "Yes" : "No"}</dd>
        </dl>
      </section>

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Timeline
        </h2>
        {!timeline || timeline.events.length === 0 ? (
          <p className="text-sm text-gray-400">No timeline events.</p>
        ) : (
          <ul className="space-y-3">
            {timeline.events.map((e, i) => (
              <li key={i} className="border-l-2 border-primary/40 pl-3">
                <p className="text-sm text-gray-900 dark:text-white">
                  <strong>{e.event_type}</strong> — {e.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {e.actor ?? "system"} · {new Date(e.timestamp).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Related transactions
        </h2>
        {!related || related.related.length === 0 ? (
          <p className="text-sm text-gray-400">No related transactions.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-navy-600">
            {related.related.map((r, i) => (
              <li
                key={`${r.transaction_id}-${i}`}
                className="py-2 flex items-center justify-between"
              >
                <Link
                  href={`/dashboard/transactions/${r.transaction_id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {r.transaction_id.slice(0, 10)}…
                </Link>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{r.relationship_type}</span>
                  <span>similarity {r.similarity_score.toFixed(2)}</span>
                  <span className="font-mono">{Number(r.amount).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
