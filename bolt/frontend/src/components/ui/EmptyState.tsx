import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, hint, actionLabel, onAction, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`.trim()}>
      <div className="empty-illustration">
        <Icon className="w-9 h-9" />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-slate-600">{description}</p>
      {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-soft !px-4 !py-2 !text-sm mt-4">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
