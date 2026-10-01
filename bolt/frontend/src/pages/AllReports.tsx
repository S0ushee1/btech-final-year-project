import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { Filter, MapPin, User, Calendar, AlertTriangle, Save, Bookmark, Trash2 } from 'lucide-react';
import { Report } from '../context/AppContext';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/SkeletonRows';

interface AllReportsProps {
  onNavigate: (page: string, reportId?: string) => void;
}

type QuickFilter = 'none' | 'pending_today' | 'high_confidence' | 'confirmed' | 'rejected';

interface SavedView {
  id: string;
  name: string;
  statusFilter: Report['status'] | 'All';
  sortDir: 'asc' | 'desc';
  query: string;
  quickFilter: QuickFilter;
}

const SAVED_VIEWS_KEY = 'tv_saved_report_views';

export function AllReports({ onNavigate }: AllReportsProps) {
  const { reports, isLoading } = useApp();
  const [statusFilter, setStatusFilter] = useState<Report['status'] | 'All'>('All');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [query, setQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('none');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SavedView[];
      if (Array.isArray(parsed)) setSavedViews(parsed);
    } catch {
      setSavedViews([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const filteredReports = useMemo(() => {
    const now = new Date();
    return (statusFilter === 'All' ? reports : reports.filter((r) => r.status === statusFilter))
      .filter((r) => {
        if (quickFilter === 'pending_today') {
          const d = new Date(r.dateSubmitted);
          if (
            r.status !== 'Pending Review' ||
            d.getFullYear() !== now.getFullYear() ||
            d.getMonth() !== now.getMonth() ||
            d.getDate() !== now.getDate()
          ) return false;
        }
        if (quickFilter === 'high_confidence' && (r.aiResult?.confidence || 0) < 80) return false;
        if (quickFilter === 'confirmed' && r.status !== 'Confirmed/Fine Issued') return false;
        if (quickFilter === 'rejected' && r.status !== 'Rejected') return false;
        return true;
      })
      .filter((r) => {
      const hay = `${r.userName} ${r.violationType} ${r.location} ${r.id}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    })
      .slice()
      .sort((a, b) => {
        const aa = new Date(a.dateSubmitted).getTime();
        const bb = new Date(b.dateSubmitted).getTime();
        return sortDir === 'desc' ? bb - aa : aa - bb;
      });
  }, [reports, query, quickFilter, sortDir, statusFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statuses = ['All', 'Pending Review', 'Needs Manual Review', 'No Violation (AI)', 'Confirmed/Fine Issued', 'Rejected'] as const;
  const quickFilters: Array<{ id: QuickFilter; label: string }> = [
    { id: 'none', label: 'All Cases' },
    { id: 'pending_today', label: 'Pending Today' },
    { id: 'high_confidence', label: 'High Confidence (80%+)' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'rejected', label: 'Rejected' },
  ];

  const saveCurrentView = () => {
    const name = window.prompt('Saved view name');
    if (!name?.trim()) return;
    const item: SavedView = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      statusFilter,
      sortDir,
      query,
      quickFilter,
    };
    setSavedViews((prev) => [item, ...prev].slice(0, 8));
  };

  return (
    <div className="page-wrap page-section page-rhythm">
      <section className="section-card">
        <h1 className="text-3xl font-extrabold mb-2">All Reports</h1>
        <p className="text-slate-600">Filter, inspect, and review every case in the system.</p>
      </section>

      <section className="section-card stagger-children">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
          <Filter className="w-4 h-4" /> Filter by status
        </div>
        <div className="overflow-x-auto pb-1 mb-3">
          <div className="flex w-max items-center gap-2 pr-2">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={statusFilter === status ? 'btn-primary !px-4 !py-2 !text-sm' : 'btn-soft !px-4 !py-2 !text-sm'}
              >
                {status}
                <span className="ml-2 text-xs">
                  ({status === 'All' ? reports.length : reports.filter((r) => r.status === status).length})
                </span>
              </button>
            ))}
            <button className="btn-soft !px-4 !py-2 !text-sm" onClick={() => setSortDir((p) => (p === 'desc' ? 'asc' : 'desc'))}>
              Sort by Date: {sortDir === 'desc' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>
        <div className="mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input !py-2 !px-3 w-full sm:max-w-sm"
            placeholder="Search reports"
            aria-label="Search reports"
          />
        </div>

        <div className="overflow-x-auto pb-1 mb-3">
          <div className="flex w-max items-center gap-2 pr-2">
            {quickFilters.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(chip.id)}
                className={quickFilter === chip.id ? 'btn-primary !px-3 !py-1.5 !text-xs' : 'btn-soft !px-3 !py-1.5 !text-xs'}
                aria-pressed={quickFilter === chip.id}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button type="button" onClick={saveCurrentView} className="btn-soft !px-3 !py-1.5 !text-xs inline-flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save View
          </button>
          {savedViews.map((view) => (
            <div key={view.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
              <button
                type="button"
                className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                onClick={() => {
                  setStatusFilter(view.statusFilter);
                  setSortDir(view.sortDir);
                  setQuery(view.query);
                  setQuickFilter(view.quickFilter);
                }}
                aria-label={`Apply saved view ${view.name}`}
              >
                <Bookmark className="w-3.5 h-3.5 text-cyan-700" />
                {view.name}
              </button>
              <button
                type="button"
                onClick={() => setSavedViews((prev) => prev.filter((item) => item.id !== view.id))}
                className="text-slate-500 hover:text-red-600 p-0.5"
                aria-label={`Delete saved view ${view.name}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="table-shell hidden md:block">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold">{statusFilter === 'All' ? 'All Reports' : `${statusFilter} Reports`}</h2>
          <p className="text-sm text-slate-600 mt-1">Showing {filteredReports.length} report(s)</p>
        </div>

        {isLoading ? (
          <SkeletonRows rows={3} hint="Loading report queue and status metadata..." />
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No reports found"
            description="No records match the selected filter."
            hint="Try changing quick filters, status chips, or search text."
            actionLabel="Reset Filters"
            onAction={() => {
              setStatusFilter('All');
              setQuickFilter('none');
              setQuery('');
              setSortDir('desc');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Citizen</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Violation</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="table-row">
                    <td className="px-6 py-4 text-sm font-semibold">#{report.id}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" />{report.userName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-slate-400" />{report.violationType}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{report.location}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />{formatDate(report.dateSubmitted)}</div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={report.status} /></td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => onNavigate('report-detail', report.id)} className="text-cyan-700 font-semibold hover:text-cyan-800">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!isLoading && filteredReports.length > 0 && (
        <section className="md:hidden space-y-3">
          {filteredReports.map((report) => (
            <article key={`mobile-${report.id}`} className="table-mobile-card">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold">#{report.id}</p>
                <StatusBadge status={report.status} />
              </div>
              <p className="text-sm text-slate-700 mb-1"><strong>Citizen:</strong> {report.userName}</p>
              <p className="text-sm text-slate-700 mb-1"><strong>Violation:</strong> {report.violationType}</p>
              <p className="text-sm text-slate-700 mb-1"><strong>Location:</strong> {report.location}</p>
              <p className="text-sm text-slate-500 mb-3"><strong>Date:</strong> {formatDate(report.dateSubmitted)}</p>
              <button onClick={() => onNavigate('report-detail', report.id)} className="btn-primary w-full !py-2">Review</button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

