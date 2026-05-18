"use client";

import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import { BellIcon } from "@heroicons/react/24/outline";

export default function NotificationBell() {
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);

  return (
    <Link
      href="/dashboard/notifications"
      className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-navy-200 hover:bg-navy-600 hover:text-white transition-colors"
    >
      <BellIcon className="h-5 w-5" aria-hidden="true" />
      Notifications
      {unreadCount > 0 && (
        <span className="absolute top-1 left-6 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
