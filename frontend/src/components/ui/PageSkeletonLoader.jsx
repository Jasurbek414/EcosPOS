export default function PageSkeletonLoader() {
  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Yuqori qismdagi progress-bar (Linear/YouTube uslubida) */}
      <div className="top-page-progress" />

      {/* Sarlavha va amallar paneli skeleti */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton-item h-7 w-48 rounded-lg" />
          <div className="skeleton-item h-4 w-72 rounded-md opacity-70" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="skeleton-item h-10 w-28 rounded-lg" />
          <div className="skeleton-item h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Qidiruv va filtrlar paneli skeleti */}
      <div className="flex items-center gap-3">
        <div className="skeleton-item h-10 flex-1 max-w-sm rounded-lg" />
        <div className="skeleton-item h-10 w-44 rounded-lg" />
        <div className="skeleton-item h-10 w-24 rounded-lg" />
      </div>

      {/* Jadval yoki kartalar konteyneri skeleti */}
      <div className="card !p-0 overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="skeleton-item h-5 w-36 rounded-md" />
          <div className="skeleton-item h-5 w-20 rounded-md" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="skeleton-item h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton-item h-4 w-1/3 rounded" />
                  <div className="skeleton-item h-3 w-1/4 rounded opacity-60" />
                </div>
              </div>
              <div className="skeleton-item h-4 w-24 rounded" />
              <div className="skeleton-item h-6 w-20 rounded-full" />
              <div className="skeleton-item h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
