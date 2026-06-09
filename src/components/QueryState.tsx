import { ReactNode } from "react";
import { SkeletonTable } from "@/components/Skeleton";
import { errorMessage } from "@/lib/errors";

interface QueryStateProps {
  isLoading: boolean;
  /** RTK Query isError flag. */
  isError?: boolean;
  /** The RTK Query error object — surfaced via errorMessage() so the backend
   *  detail shows instead of a generic string. */
  error?: unknown;
  /** True when the request succeeded but returned no rows. */
  isEmpty?: boolean;
  /** What to render in the empty state. */
  emptyMessage?: string;
  /** Loading skeleton dimensions. */
  rows?: number;
  cols?: number;
  /** Rendered once data is present and non-empty. */
  children: ReactNode;
}

/**
 * Standard loading / error / empty wrapper for list + detail queries. Replaces
 * the ~35 hand-rolled "Failed to load…" banners and ~19 inline empty states,
 * and routes errors through errorMessage() for consistent backend detail.
 */
export default function QueryState({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyMessage = "No results.",
  rows = 10,
  cols = 6,
  children,
}: QueryStateProps) {
  if (isLoading) return <SkeletonTable rows={rows} cols={cols} />;
  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
        {errorMessage(error) || "Failed to load."}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }
  return <>{children}</>;
}
