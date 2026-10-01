interface SkeletonRowsProps {
  rows?: number;
  hint?: string;
}

export function SkeletonRows({ rows = 3, hint = 'Loading records...' }: SkeletonRowsProps) {
  return (
    <div className="p-6 space-y-3" aria-live="polite" aria-busy="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="skeleton-row">
          <div className="skeleton skeleton-line w-2/5" />
          <div className="skeleton skeleton-line w-4/5" />
        </div>
      ))}
      <p className="text-xs text-slate-500 pt-1">{hint}</p>
    </div>
  );
}
