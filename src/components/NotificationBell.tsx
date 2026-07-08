"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "@heroicons/react/24/outline";
import {
  useListNotificationsQuery,
  useUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type AppNotification,
} from "@/redux/slices/api/notificationsApi";

/** Best deep-link for a notification, most-specific first. Null → no navigation. */
function hrefFor(n: AppNotification): string | null {
  if (n.alert_id) return `/dashboard/alerts/${n.alert_id}`;
  if (n.case_id) return `/dashboard/cases/${n.case_id}`;
  if (n.customer_id) return `/dashboard/customers/${n.customer_id}`;
  if (n.verification_id) return `/dashboard/kyc`;
  return null;
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Poll the badge count; only fetch the list while the panel is open.
  const { data: countData } = useUnreadCountQuery(undefined, { pollingInterval: 30000 });
  const { data: listData, isFetching } = useListNotificationsQuery(
    { page_size: 15 },
    { skip: !open },
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const unread = countData?.unread ?? 0;
  const items = listData?.items ?? [];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onItem = async (n: AppNotification) => {
    if (!n.read) markRead(n.id);
    const href = hrefFor(n);
    setOpen(false);
    if (href) router.push(href);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-600 transition-colors"
      >
        <BellIcon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-navy-600">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={markingAll}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isFetching && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">You&apos;re all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onItem(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-navy-600/60 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors ${
                    n.read ? "" : "bg-primary/5 dark:bg-primary/10"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <div className={`min-w-0 ${n.read ? "pl-4" : ""}`}>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
