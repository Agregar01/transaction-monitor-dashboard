/**
 * StatusBadge — generic colored pill for AML status values across alert / case /
 * rule / report / approval entities. Maintains the `ActionBadge` filename so
 * downstream imports keep working.
 */

const variantClasses: Record<string, string> = {
  // Alert statuses
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  INVESTIGATING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  CLOSED: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",

  // Alert priorities
  IMMEDIATE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  BATCH: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  REVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",

  // Case statuses (in addition to OPEN/INVESTIGATING/CLOSED above)
  ESCALATED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
  SAR_DRAFTED: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
  SAR_FILED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",

  // Rule statuses
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  SHADOW: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  PRODUCTION: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  ARCHIVED: "bg-slate-100 text-slate-500 dark:bg-slate-700/30 dark:text-slate-400",

  // Report statuses (STR/CTR)
  FILED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  WITHDRAWN: "bg-slate-100 text-slate-500 dark:bg-slate-700/30 dark:text-slate-400",
  EXEMPT: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",

  // Approval statuses
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  EXPIRED: "bg-slate-100 text-slate-500 dark:bg-slate-700/30 dark:text-slate-400",

  // Case severities (HIGH/MEDIUM/LOW & rule severities)
  CRITICAL: "bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-100",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  LOW: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
};

export default function ActionBadge({ action }: { action: string }) {
  const cls = variantClasses[action] ?? "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}
