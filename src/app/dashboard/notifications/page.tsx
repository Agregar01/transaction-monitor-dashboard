"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import {
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAll,
  type Notification,
} from "@/redux/slices/notificationsSlice";
import {
  BellAlertIcon,
  ShieldExclamationIcon,
  CogIcon,
  ArrowPathIcon,
  LockClosedIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const TYPE_CONFIG: Record<string, { icon: typeof BellAlertIcon; color: string; label: string }> = {
  decision_alert: {
    icon: ShieldExclamationIcon,
    color: "text-red-500 bg-red-50 dark:bg-red-900/20",
    label: "Decision Alert",
  },
  system: {
    icon: CogIcon,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    label: "System",
  },
  policy_change: {
    icon: ArrowPathIcon,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    label: "Policy Change",
  },
  tier_change: {
    icon: ArrowPathIcon,
    color: "text-green-500 bg-green-50 dark:bg-green-900/20",
    label: "Tier Change",
  },
  security: {
    icon: LockClosedIcon,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
    label: "Security",
  },
};

function NotificationCard({ notification, onRead, onRemove }: {
  notification: Notification;
  onRead: () => void;
  onRemove: () => void;
}) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
        notification.read
          ? "bg-white dark:bg-navy-700 border-gray-100 dark:border-navy-600"
          : "bg-blue-50/50 dark:bg-navy-600/50 border-blue-100 dark:border-navy-500"
      }`}
    >
      <div className={`flex-shrink-0 p-2 rounded-lg ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${config.color.split(" ")[0]}`}>{config.label}</span>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
          {notification.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {notification.message}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-gray-400">
            {new Date(notification.timestamp).toLocaleString()}
          </span>
          {notification.link && (
            <Link href={notification.link} className="text-xs text-primary hover:underline">
              View details
            </Link>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1">
        {!notification.read && (
          <button
            onClick={onRead}
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="Mark as read"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Remove"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  useEffect(() => { document.title = "Notifications | Deferred KYC"; }, []);
  const dispatch = useAppDispatch();
  const { items, unreadCount } = useAppSelector((s) => s.notifications);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={() => dispatch(markAllAsRead())}
              className="flex items-center gap-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <CheckIcon className="h-4 w-4" />
              Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={() => dispatch(clearAll())}
              className="flex items-center gap-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onRead={() => dispatch(markAsRead(notification.id))}
              onRemove={() => dispatch(removeNotification(notification.id))}
            />
          ))
        ) : (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-12 text-center">
            <BellAlertIcon className="h-12 w-12 text-gray-300 dark:text-navy-500 mx-auto" />
            <h3 className="text-gray-500 dark:text-gray-400 mt-4 font-medium">No notifications</h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Decision alerts, policy changes, and system notifications will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
