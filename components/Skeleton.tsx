/**
 * Loading placeholders.
 *
 * Everything here is aria-hidden and wrapped in a region that announces
 * "Loading" once. Screen reader users get one useful message instead of a
 * description of twelve grey rectangles.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function SkeletonRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <Bar className="h-5 w-2/3" />
          <Bar className="h-3 w-1/3" />
        </div>
        <Bar className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-4 w-32" />
        </div>
      </div>
      <Bar className="mt-6 h-3 w-40" />
    </div>
  );
}

export function SkeletonTable({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Bar key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Bar key={columnIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonFilters({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Bar className="h-3 w-20" />
          <Bar className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <Bar className="h-3 w-20" />
          <Bar className="mt-2 h-7 w-10" />
        </div>
      ))}
    </div>
  );
}
