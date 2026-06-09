interface PaginationProps {
  /** Current 1-based page. */
  page: number;
  /** Total number of pages (>= 1). */
  totalPages: number;
  /** Total row count, for the "N total" summary. Omit to hide the count. */
  total?: number;
  /** Noun for the count summary, e.g. "transactions". */
  noun?: string;
  onPageChange: (page: number) => void;
}

/**
 * Shared list-footer pager. Replaces the identical Prev/Next + "page X of Y"
 * block that was copy-pasted across every list page.
 */
export default function Pagination({ page, totalPages, total, noun, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-navy-600 text-xs text-gray-500 dark:text-gray-400">
      <span>
        {total != null && <>{total.toLocaleString()} {noun ? `${noun} · ` : "· "}</>}
        page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="px-3 py-1 rounded border border-gray-200 dark:border-navy-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-navy-600"
        >
          Next
        </button>
      </div>
    </div>
  );
}
