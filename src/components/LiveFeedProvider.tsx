"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { API_V1 } from "@/config/api";
import type { TransactionFeedItem } from "@/types/api";

const MAX_ROWS = 100;

interface LiveFeedValue {
  /** Whether the user has switched the stream on. */
  running: boolean;
  /** True while the SSE connection is open (false during reconnect). */
  connected: boolean;
  items: TransactionFeedItem[];
  /** transaction_id of the most recent arrival (for the row-flash animation). */
  newest: string | null;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

const LiveFeedContext = createContext<LiveFeedValue | null>(null);

export function useLiveFeed(): LiveFeedValue {
  const ctx = useContext(LiveFeedContext);
  if (!ctx) throw new Error("useLiveFeed must be used within <LiveFeedProvider>");
  return ctx;
}

/**
 * Owns the live transaction stream ABOVE the page tree (mounted in the dashboard
 * layout), so the connection and accumulated rows survive route changes — the
 * old page-scoped poller died on navigation.
 *
 * Push-based via SSE (GET /transactions/stream, same-origin through the BFF proxy
 * so the session cookie authenticates). EventSource auto-reconnects if the
 * connection drops (e.g. a serverless duration cap), so cuts are self-healing.
 */
export function LiveFeedProvider({ children }: { children: React.ReactNode }) {
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState<TransactionFeedItem[]>([]);
  const [newest, setNewest] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!running) return;

    // withCredentials keeps the session cookie flowing (same-origin proxy).
    const es = new EventSource(`${API_V1}/transactions/stream`, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      // Heartbeat comments (": ping") are swallowed by EventSource — only real
      // "data:" frames reach here.
      try {
        const t = JSON.parse(e.data) as TransactionFeedItem;
        if (!t?.transaction_id) return;
        setItems((prev) => {
          if (prev[0]?.transaction_id === t.transaction_id) return prev; // dedupe echo
          return [t, ...prev].slice(0, MAX_ROWS);
        });
        setNewest(t.transaction_id);
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => {
      // Connection dropped; the browser reconnects on its own. Reflect the gap.
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const clear = useCallback(() => {
    setItems([]);
    setNewest(null);
  }, []);

  return (
    <LiveFeedContext.Provider value={{ running, connected, items, newest, start, stop, clear }}>
      {children}
    </LiveFeedContext.Provider>
  );
}
