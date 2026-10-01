import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Clock3, FileWarning } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NotificationCenterProps {
  onNavigate: (page: string, reportId?: string) => void;
}

type Notice = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  actionLabel: string;
  action: () => void;
};

const READ_KEY = 'tv_notice_read_ids';

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { isLoggedIn, user, reports } = useApp();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setReadIds(parsed);
    } catch {
      setReadIds([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(readIds));
  }, [readIds]);

  const notices = useMemo<Notice[]>(() => {
    if (!isLoggedIn) return [];
    if (user?.role === 'authority') {
      return reports
        .filter((r) => r.status === 'Pending Review' || r.status === 'Needs Manual Review')
        .slice(0, 8)
        .map((r) => ({
          id: `review-${r.id}`,
          title: `Report #${r.id} needs review`,
          detail: `${r.violationType} - ${r.location}`,
          createdAt: r.dateSubmitted,
          actionLabel: 'Open',
          action: () => onNavigate('report-detail', r.id),
        }));
    }

    return reports
      .filter((r) => r.status !== 'Pending Review')
      .slice(0, 8)
      .map((r) => ({
        id: `citizen-${r.id}`,
        title: `Update on report #${r.id}`,
        detail: `Status: ${r.status}`,
        createdAt: r.reviewedAt || r.dateSubmitted,
        actionLabel: 'View',
        action: () => onNavigate('my-reports'),
      }));
  }, [isLoggedIn, onNavigate, reports, user?.role]);

  const unreadCount = notices.filter((notice) => !readIds.includes(notice.id)).length;

  const markAllRead = () => {
    setReadIds((prev) => Array.from(new Set([...prev, ...notices.map((n) => n.id)])));
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative">
      <button
        type="button"
        className="nav-link relative"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span className="hidden xl:inline">Alerts</span>
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold px-1.5 flex items-center justify-center">
            {Math.min(99, unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div className="motion-pop absolute right-0 mt-2 w-[min(92vw,360px)] rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 shadow-xl p-2 z-[85]">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button type="button" onClick={markAllRead} className="text-xs text-teal-700 font-semibold hover:text-teal-800">
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {notices.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                <Clock3 className="w-5 h-5 mx-auto mb-2 text-slate-300" />
                No new notifications.
              </div>
            ) : (
              notices.map((notice) => {
                const unread = !readIds.includes(notice.id);
                return (
                  <div key={notice.id} className={`rounded-xl px-2 py-2 ${unread ? 'bg-teal-50/75' : ''}`}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">
                        {unread ? <FileWarning className="w-4 h-4 text-teal-700" /> : <Check className="w-4 h-4 text-slate-400" />}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{notice.title}</p>
                        <p className="text-xs text-slate-600">{notice.detail}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{new Date(notice.createdAt).toLocaleString()}</p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                        onClick={() => {
                          setReadIds((prev) => Array.from(new Set([...prev, notice.id])));
                          notice.action();
                          setOpen(false);
                        }}
                      >
                        {notice.actionLabel}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
