"use client";

import Link from "next/link";
import { useState } from "react";
import { useListTransactionsQuery } from "@/redux/slices/api/transactionsApi";
import { SkeletonTable } from "@/components/Skeleton";
import RiskBadge from "@/components/RiskBadge";

export default function TransactionsListPage() {
  const [page, setPage] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [flagged, setFlagged] = useState<"true" | "false" | "">("");
  const [transactionType, setTransactionType] = useState("");
  const [channel, setChannel] = useState("");

  const { data, isLoading, error } = useListTransactionsQuery({
    page,
    page_size: 20,
    customer_id: customerId || undefined,
    flagged: flagged === "" ? undefined : flagged === "true",
    transaction_type: transactionType || undefined,
    channel: channel || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Transactions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Browse scored transactions. Click any row to see the timeline.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          placeholder="Customer ID"
          value={customerId}
          onChange={(e) => {
            setPage(1);
            setCustomerId(e.target.value);
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
        <select
          value={flagged}
          onChange={(e) => {
            setPage(1);
            setFlagged(e.target.value as "true" | "false" | "");
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        >
          <option value="">All</option>
          <option value="true">Flagged only</option>
          <option value="false">Not flagged</option>
        </select>
        <input
          placeholder="Type (TRANSFER, DEPOSIT…)"
          value={transactionType}
          onChange={(e) => {
            setPage(1);
            setTransactionType(e.target.value.toUpperCase());
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
        <input
          placeholder="Channel (USSD, MOBILE…)"
          value={channel}
          onChange={(e) => {
            setPage(1);
            setChannel(e.target.value.toUpperCase());
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load transactions.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No transactions match the filters.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.items.map((t) => (
                <tr key={t.transaction_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/transactions/${t.transaction_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {t.transaction_id.slice(0, 10)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(t.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/dashboard/customers/${t.customer_id}`}
                      className="text-gray-700 dark:text-gray-300 hover:underline"
                    >
                      {t.customer_id.slice(0, 10)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {t.amount == null ? "—" : Number(t.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">{t.transaction_type}</td>
                  <td className="px-4 py-3 text-xs">{t.channel}</td>
                  <td className="px-4 py-3">
                    <RiskBadge score={t.combined_risk_score} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.flagged ? <span className="text-red-600 font-semibold">⚑</span> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-navy-600 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {data.total} total · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
