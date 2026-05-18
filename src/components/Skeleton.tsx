export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-navy-600 rounded ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6 space-y-3">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-8 w-1/2" />
      <SkeletonLine className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 dark:bg-navy-800">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonLine key={i} className="h-3 w-24" />
          ))}
        </div>
      </div>
      <div className="divide-y dark:divide-navy-600">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex gap-6">
            {Array.from({ length: cols }).map((_, j) => (
              <SkeletonLine key={j} className="h-3 w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
