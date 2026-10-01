import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Search, FileText, LayoutDashboard, ShieldAlert, UserCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string, reportId?: string) => void;
}

type Command = {
  id: string;
  label: string;
  hint: string;
  page: string;
  icon: ComponentType<{ className?: string }>;
};

export function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const { isLoggedIn, user, reports } = useApp();
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  const commands = useMemo<Command[]>(() => {
    if (!isLoggedIn) {
      return [
        { id: 'home', label: 'Go to Home', hint: 'Public page', page: 'home', icon: LayoutDashboard },
        { id: 'workflow', label: 'Open Workflow', hint: 'How the system works', page: 'how-it-works', icon: ShieldAlert },
        { id: 'login', label: 'Open Login', hint: 'Authenticate', page: 'login', icon: UserCircle2 },
        { id: 'register', label: 'Open Register', hint: 'Create account', page: 'register', icon: UserCircle2 },
      ];
    }

    if (user?.role === 'authority') {
      return [
        { id: 'dashboard', label: 'Open Dashboard', hint: 'Authority overview', page: 'dashboard', icon: LayoutDashboard },
        { id: 'all-reports', label: 'Open All Reports', hint: 'Review report queue', page: 'all-reports', icon: FileText },
        { id: 'analytics', label: 'Open Analytics', hint: 'System metrics', page: 'analytics', icon: ShieldAlert },
        { id: 'profile', label: 'Open Profile', hint: 'Account settings', page: 'profile', icon: UserCircle2 },
      ];
    }

    return [
      { id: 'home', label: 'Go to Home', hint: 'Citizen landing', page: 'home', icon: LayoutDashboard },
      { id: 'report', label: 'Report Violation', hint: 'Upload evidence', page: 'report', icon: ShieldAlert },
      { id: 'my-reports', label: 'Open My Reports', hint: 'Track submissions', page: 'my-reports', icon: FileText },
      { id: 'profile', label: 'Open Profile', hint: 'Account settings', page: 'profile', icon: UserCircle2 },
    ];
  }, [isLoggedIn, user?.role]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => `${cmd.label} ${cmd.hint}`.toLowerCase().includes(q));
  }, [commands, query]);

  const reportMatches = useMemo(() => {
    if (!isLoggedIn || user?.role !== 'authority') return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return reports
      .filter((report) => `${report.id} ${report.violationType} ${report.userName} ${report.location}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [isLoggedIn, user?.role, reports, query]);

  const combinedLength = filteredCommands.length + reportMatches.length;

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlighted(0);
      return;
    }
    setHighlighted(0);
  }, [open]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const commandK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (commandK && open) {
        event.preventDefault();
        onClose();
        return;
      }

      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlighted((prev) => (combinedLength > 0 ? (prev + 1) % combinedLength : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlighted((prev) => (combinedLength > 0 ? (prev - 1 + combinedLength) % combinedLength : 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (combinedLength === 0) return;
        if (highlighted < filteredCommands.length) {
          const cmd = filteredCommands[highlighted];
          onNavigate(cmd.page);
          onClose();
          return;
        }
        const report = reportMatches[highlighted - filteredCommands.length];
        if (report) {
          onNavigate('report-detail', report.id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, onClose, onNavigate, filteredCommands, reportMatches, highlighted, combinedLength]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-teal-100/55 backdrop-blur-sm p-4 sm:p-10 flex flex-col items-center pt-24" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 overflow-hidden motion-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-base text-slate-900 placeholder-slate-400 outline-none"
            placeholder="Type a command or search for reports..."
            aria-label="Search"
          />
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded shadow-sm">esc</kbd>
            <span className="text-xs text-slate-400">to close</span>
          </div>
          <button onClick={onClose} className="sm:hidden btn-soft !p-1.5 text-xs rounded-full" type="button" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
          <p className="px-3 pt-2 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commands</p>
          {filteredCommands.map((cmd, idx) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => {
                onNavigate(cmd.page);
                onClose();
              }}
              className={`w-full text-left rounded-xl px-3 py-3 flex items-center justify-between transition-colors ${highlighted === idx
                ? 'bg-teal-50 text-teal-700'
                : 'hover:bg-slate-50 text-slate-700'
                }`}
            >
              <span className="flex items-center gap-3">
                <cmd.icon className={`w-4 h-4 ${highlighted === idx ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="text-sm font-medium">{cmd.label}</span>
              </span>
              <span className={`text-xs ${highlighted === idx ? 'text-teal-600' : 'text-slate-500'}`}>{cmd.hint}</span>
            </button>
          ))}

          {reportMatches.length > 0 && (
            <div className="mt-2 text-left">
              <p className="px-3 pt-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100">Matching Reports</p>
              {reportMatches.map((report, idx) => {
                const rowIndex = filteredCommands.length + idx;
                const isHighlighted = highlighted === rowIndex;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => {
                      onNavigate('report-detail', report.id);
                      onClose();
                    }}
                    className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${isHighlighted
                      ? 'bg-teal-50/90'
                      : 'hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${isHighlighted ? 'text-teal-700' : 'text-slate-900'}`}>#{report.id} - {report.violationType}</p>
                      <p className={`text-xs ${isHighlighted ? 'text-teal-600' : 'text-slate-500'}`}>{report.aiResult?.confidence}% Match</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{report.userName} - {report.location}</p>
                  </button>
                );
              })}
            </div>
          )}

          {combinedLength === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No commands or reports found for "{query}"</p>
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 font-medium bg-white border border-slate-200 rounded shadow-sm">up</kbd>
              <kbd className="px-1.5 py-0.5 font-medium bg-white border border-slate-200 rounded shadow-sm">down</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 font-medium bg-white border border-slate-200 rounded shadow-sm">enter</kbd>
              <span>to select</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

