"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useGetCustomerRiskProfileQuery,
  useGetCustomerBaselineQuery,
  useGetCustomerTransactionsQuery,
  useGetCustomerAlertsQuery,
} from "@/redux/slices/api/customersApi";
import { SkeletonCard } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const { data: profile, isLoading, error } = useGetCustomerRiskProfileQuery(customerId);
  const { data: baseline } = useGetCustomerBaselineQuery(customerId);
  const { data: recentTx } = useGetCustomerTransactionsQuery({ customer_id: customerId, page_size: 10 });
  const { data: recentAlerts } = useGetCustomerAlertsQuery({ customer_id: customerId, page_size: 10 });

  if (isLoading) return <SkeletonCard />;
  if (error || !profile) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-xl">
        Failed to load customer {customerId}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer</p>
          <h1 className="font-mono text-lg text-gray-900 dark:text-white">{customerId}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ActionBadge action={profile.risk_level} />
          {profile.is_pep && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200">
              PEP
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Risk score</p>
          <p className="mt-1 text-3xl font-mono text-gray-900 dark:text-white">
            {profile.risk_score.toFixed(1)}
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">KYC quality</p>
          <p className="mt-1 text-3xl font-mono text-gray-900 dark:text-white">
            {profile.kyc_quality ?? "—"}
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Risk band</p>
          <div className="mt-2">
            <RiskBadge score={Math.round(profile.risk_score * 3)} />
          </div>
          <p className="mt-1 text-xs text-gray-400">approx. transaction-band conversion</p>
        </div>
      </div>

      {baseline && (
        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Baseline ({baseline.period_days}d)
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-6 text-sm">
            <dt className="text-gray-500 dark:text-gray-400">Avg amount</dt>
            <dd className="font-mono">{baseline.avg_amount.toLocaleString()}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Std dev</dt>
            <dd className="font-mono">{baseline.std_amount.toLocaleString()}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Daily count</dt>
            <dd className="font-mono">{baseline.daily_count}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Counterparties</dt>
            <dd className="font-mono">{baseline.counterparty_count}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Channels</dt>
            <dd className="col-span-3 text-xs">{baseline.channels.join(", ") || "—"}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Countries</dt>
            <dd className="col-span-3 text-xs">{baseline.countries.join(", ") || "—"}</dd>
          </dl>
        </section>
      )}

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Recent transactions
          </h2>
          <Link
            href={`/dashboard/transactions?customer_id=${customerId}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            All →
          </Link>
        </div>
        {!recentTx || recentTx.items.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions on record.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-navy-600">
            {recentTx.items.map((t) => (
              <li key={t.transaction_id} className="py-2 flex items-center justify-between">
                <Link
                  href={`/dashboard/transactions/${t.transaction_id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {t.transaction_id.slice(0, 10)}…
                </Link>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{t.amount.toLocaleString()} {t.currency}</span>
                  <span>{t.type}</span>
                  <RiskBadge score={t.combined_risk_score} bandOnly />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Recent alerts
        </h2>
        {!recentAlerts || recentAlerts.items.length === 0 ? (
          <p className="text-sm text-gray-400">No alerts on record.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-navy-600">
            {recentAlerts.items.map((a) => (
              <li key={a.alert_id} className="py-2 flex items-center justify-between">
                <Link
                  href={`/dashboard/alerts/${a.alert_id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {a.alert_id.slice(0, 8)}…
                </Link>
                <div className="flex items-center gap-2">
                  <ActionBadge action={a.priority} />
                  <ActionBadge action={a.status} />
                  <RiskBadge score={a.risk_score} bandOnly />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
