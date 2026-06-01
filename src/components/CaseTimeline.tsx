"use client";

import type { CaseStatusHistoryEntry } from "@/types/api";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-gray-400",
  ASSIGNED: "bg-blue-400",
  IN_REVIEW: "bg-indigo-400",
  INVESTIGATING: "bg-amber-500",
  ESCALATED: "bg-orange-500",
  SAR_DRAFTED: "bg-purple-500",
  SAR_FILED: "bg-emerald-500",
  CLOSED: "bg-gray-500",
};

const STATUS_RING: Record<string, string> = {
  OPEN: "ring-gray-200 dark:ring-gray-600",
  ASSIGNED: "ring-blue-200 dark:ring-blue-800",
  IN_REVIEW: "ring-indigo-200 dark:ring-indigo-800",
  INVESTIGATING: "ring-amber-200 dark:ring-amber-800",
  ESCALATED: "ring-orange-200 dark:ring-orange-800",
  SAR_DRAFTED: "ring-purple-200 dark:ring-purple-800",
  SAR_FILED: "ring-emerald-200 dark:ring-emerald-800",
  CLOSED: "ring-gray-200 dark:ring-gray-600",
};

export default function CaseTimeline({
  entries,
}: {
  entries: CaseStatusHistoryEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400">No transitions recorded yet.</p>
    );
  }

  return (
    <ol className="relative">
      {entries.map((entry, idx) => {
        const dot = STATUS_COLORS[entry.to_status] ?? "bg-gray-400";
        const ring = STATUS_RING[entry.to_status] ?? "ring-gray-200";
        const isLast = idx === entries.length - 1;

        return (
          <li key={entry.id} className="flex gap-4 pb-6 last:pb-0">
            {/* Timeline spine + dot */}
            <div className="flex flex-col items-center">
              <span
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ${ring} ${dot}`}
              >
                {isLast ? (
                  <span className="h-2 w-2 rounded-full bg-white/80" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                )}
              </span>
              {!isLast && (
                <span className="mt-1 flex-1 w-px bg-gray-200 dark:bg-navy-500" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {entry.from_status ? (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">
                      {entry.from_status.replace(/_/g, " ")}
                    </span>
                    {" → "}
                  </>
                ) : null}
                <strong>{entry.to_status.replace(/_/g, " ")}</strong>
              </p>

              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                {entry.changed_by
                  ? `${String(entry.changed_by).slice(0, 8)}…`
                  : "system"}{" "}
                · {new Date(entry.changed_at).toLocaleString()}
              </p>

              {entry.notes && (
                <p className="mt-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-navy-800 rounded px-2 py-1.5">
                  {entry.notes}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
