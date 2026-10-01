import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, MapPin, FileText, AlertTriangle, Eye } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/SkeletonRows';

interface MyReportsProps {
  onNavigate: (page: string, reportId?: string) => void;
}

export function MyReports({ onNavigate }: MyReportsProps) {
  const { user, reports, isLoading } = useApp();
  const [query, setQuery] = useState('');

  const myReports = reports
    .filter((report) => report.userId === user?.id)
    .filter((report) => {
      const hay = `${report.violationType} ${report.location} ${report.id} ${report.adminNotes || ''}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });

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

  return (
    <div className="page-wrap page-section page-rhythm">
      <section className="section-card">
        <h1 className="text-3xl font-extrabold mb-2">My Reports</h1>
        <p className="text-slate-600">Track status and decisions for your submissions.</p>
        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input w-full sm:max-w-sm"
            placeholder="Search my reports"
            aria-label="Search my reports"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 stagger-children">
        <div className="metric-card">
          <div className="text-sm text-slate-500 mb-1">Total Reports</div>
          <div className="metric-value">{myReports.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm text-slate-500 mb-1">Pending</div>
          <div className="metric-value text-cyan-700">{myReports.filter((r) => r.status === 'Pending Review').length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm text-slate-500 mb-1">Manual Review</div>
          <div className="metric-value text-sky-700">{myReports.filter((r) => r.status === 'Needs Manual Review').length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm text-slate-500 mb-1">Confirmed</div>
          <div className="metric-value text-sky-700">{myReports.filter((r) => r.status === 'Confirmed/Fine Issued').length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm text-slate-500 mb-1">No Violation</div>
          <div className="metric-value text-emerald-600">{myReports.filter((r) => r.status === 'No Violation (AI)').length}</div>
        </div>
      </section>

      {isLoading ? (
        <section className="section-card p-0">
          <SkeletonRows rows={3} hint="Loading your latest report statuses..." />
        </section>
      ) : myReports.length === 0 ? (
        <section className="section-card text-center py-14">
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Submit your first report to begin tracking."
            hint="Once submitted, status updates and admin comments appear here."
          />
        </section>
      ) : (
        <section className="table-shell hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Report ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Violation</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Admin Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myReports.map((report) => (
                  <tr key={report.id} className="table-row">
                    <td className="px-6 py-4 text-sm font-semibold">#{report.id}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-slate-400 mr-2" />
                        {report.violationType}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-slate-400 mr-2" />
                        {report.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                        {formatDate(report.dateSubmitted)}
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={report.status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                      <span className="block break-words">{report.adminNotes?.trim() ? report.adminNotes : 'No admin comment yet'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => onNavigate('report-detail', report.id)}
                        className="inline-flex items-center gap-1.5 text-sky-700 font-semibold hover:text-sky-800"
                      >
                        <Eye className="w-4 h-4" />
                        View Evidence
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isLoading && myReports.length > 0 && (
        <section className="md:hidden space-y-3">
          {myReports.map((report) => (
            <article key={`mobile-${report.id}`} className="table-mobile-card">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold">#{report.id}</p>
                <StatusBadge status={report.status} />
              </div>
              <p className="text-sm text-slate-700 mb-1"><strong>Violation:</strong> {report.violationType}</p>
              <p className="text-sm text-slate-700 mb-1"><strong>Location:</strong> {report.location}</p>
              <p className="text-sm text-slate-500 mb-1"><strong>Submitted:</strong> {formatDate(report.dateSubmitted)}</p>
              <p className="text-sm text-slate-600"><strong>Admin:</strong> {report.adminNotes?.trim() ? report.adminNotes : 'No admin comment yet'}</p>
              <button
                type="button"
                onClick={() => onNavigate('report-detail', report.id)}
                className="btn-soft w-full !py-2 mt-3 inline-flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Evidence
              </button>
            </article>
          ))}
        </section>
      )}

      {myReports.some((r) => r.status === 'Rejected') && (
        <section className="section-card">
          <h3 className="text-sm font-semibold mb-2">Rejected Reports</h3>
          <div className="space-y-2">
            {myReports
              .filter((r) => r.status === 'Rejected')
              .map((report) => (
                <div key={report.id} className="text-sm text-slate-600">
                  <span className="font-semibold">Report #{report.id}:</span> {report.rejectionReason || 'No reason provided'}
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

