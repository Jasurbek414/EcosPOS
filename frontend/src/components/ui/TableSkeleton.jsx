export default function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full card !p-0 overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in">
      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-b border-slate-200 dark:border-slate-700 flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="skeleton-item h-4 flex-1 rounded opacity-75" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 p-4 space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-2.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`skeleton-item h-4 flex-1 rounded ${c === 0 ? 'h-5 !w-1/4' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
