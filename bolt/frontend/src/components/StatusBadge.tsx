import { Report } from '../context/AppContext';

interface StatusBadgeProps {
  status: Report['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    'Pending Review': {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'Pending Review',
    },
    'Needs Manual Review': {
      bg: 'bg-sky-100',
      text: 'text-sky-800',
      label: 'Needs Manual Review',
    },
    'No Violation (AI)': {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      label: 'No Violation (AI)',
    },
    'Confirmed/Fine Issued': {
      bg: 'bg-sky-100',
      text: 'text-sky-800',
      label: 'Confirmed/Fine Issued',
    },
    Rejected: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      label: 'Rejected',
    },
  };

  const config = statusConfig[status] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    label: status,
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
