"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useLazyGetTransactionFeedQuery } from "@/redux/slices/api/transactionsApi";
import RiskBadge from "@/components/RiskBadge";
import type { TransactionFeedItem } from "@/types/api";
import { PlayIcon, PauseIcon } from "@heroicons/react/24/solid";

const POLL_MS = 5000;
const MAX_ROWS = 100;

/**
 * Polling-based live transaction ticker. Backend has no SSE/WebSocket, so we
 * poll /transactions/feed every 5s, advancing the cursor and prepending only
 * the new rows — giving a streaming feel without a socket.
 */
export default function LiveTransactionFeed({ flaggedOnly = false }: { flaggedOnly?: boolean }) {
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<TransactionFeedItem[]>([]);
  const [newest, setNewest] = useState<string | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);
  const [trigger] = useLazyGetTransactionFeedQuery();

  const tick = useCallback(async () => {
    try {
      const res = await trigger(
        { since: cursorRef.current, limit: 50, flagged_only: flaggedOnly },
        false,
      ).unwrap();
      if (res.next_cursor) cursorRef.current = res.next_cursor;
      if (res.items.length) {
        // Feed is ascending; show newest first.
        const fresh = [...res.items].reverse();
        setItems((prev) => [...fresh, ...prev].slice(0, MAX_ROWS));
        setNewest(fresh[0].transaction_id);
      }
    } catch {
      /* transient poll error — keep the ticker alive, try again next tick */
    }
  }, [trigger, flaggedOnly]);

  useEffect(() => {
    if (!running) return;
    tick(); // immediate first fetch
    const h = setInterval(tick, POLL_MS);
    return () => clearInterval(h);
  }, [running, tick]);

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-navy-600">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {running && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                running ? "bg-emerald-500" : "bg-gray-300 dark:bg-navy-500"
              }`}
            />
          </span>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Live transaction feed
          </h2>
          <span className="text-xs text-gray-400">
            {running ? "streaming · 5s" : "paused"}
          </span>
        </div>
        <button
          onClick={() => setRunning((r) => !r)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            running
              ? "bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-navy-500"
              : "bg-primary text-white hover:bg-primary-600"
          }`}
        >
          {running ? (
            <>
              <PauseIcon className="h-3.5 w-3.5" /> Pause
            </>
          ) : (
            <>
              <PlayIcon className="h-3.5 w-3.5" /> Go live
            </>
          )}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">
          {running ? "Waiting for new transactions…" : "Press Go live to stream incoming transactions."}
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {items.map((t) => (
                <tr
                  key={t.transaction_id}
                  className={`hover:bg-gray-50 dark:hover:bg-navy-600 ${
                    t.transaction_id === newest ? "animate-[pulse_1s_ease-in-out_1] bg-emerald-50/50 dark:bg-emerald-900/10" : ""
                  }`}
                >
                  <td className="px-5 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/dashboard/transactions/${t.transaction_id}`} className="text-primary hover:underline">
                      {t.transaction_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {t.transaction_type ?? "—"} · <span className="text-gray-400">{t.channel ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {t.amount != null ? t.amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {t.combined_risk_score != null ? (
                      <RiskBadge score={t.combined_risk_score} bandOnly />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {t.flagged && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        FLAGGED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
