import { useApp } from '../context/AppContext';
import { FileText, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/SkeletonRows';
import { LiveActivityRail } from '../components/LiveActivityRail';

interface AuthorityDashboardProps {
  onNavigate: (page: string, reportId?: string) => void;
}

export function AuthorityDashboard({ onNavigate }: AuthorityDashboardProps) {
  const { reports, isLoading, refreshReports } = useApp();

  const totalReports = reports.length;
  const aiDetected = reports.filter((r) => r.status === 'Pending Review' || r.status === 'Needs Manual Review').length;
  const confirmed = reports.filter((r) => r.status === 'Confirmed/Fine Issued').length;
  const rejected = reports.filter((r) => r.status === 'Rejected').length;

  const latestAIDetected = reports
    .filter((r) => r.status === 'Pending Review' || r.status === 'Needs Manual Review')
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-wrap page-section page-rhythm">
      <section className="section-card">
        <h1 className="text-3xl font-extrabold mb-2">Authority Dashboard</h1>
        <p className="text-slate-600">Review and process AI-detected reports efficiently.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <article className="metric-card">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3"><FileText className="w-6 h-6" /></div>
          <div className="metric-value">{totalReports}</div>
          <div className="text-sm text-slate-500">Total Reports</div>
        </article>
        <article className="metric-card">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3"><Clock className="w-6 h-6" /></div>
          <div className="metric-value text-cyan-700">{aiDetected}</div>
          <div className="text-sm text-slate-500">Requires Review</div>
        </article>
        <article className="metric-card">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3"><CheckCircle className="w-6 h-6" /></div>
          <div className="metric-value text-sky-700">{confirmed}</div>
          <div className="text-sm text-slate-500">Confirmed</div>
        </article>
        <article className="metric-card">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3"><XCircle className="w-6 h-6" /></div>
          <div className="metric-value text-slate-600">{rejected}</div>
          <div className="text-sm text-slate-500">Rejected</div>
        </article>
      </section>

      <div className="grid xl:grid-cols-3 gap-6">
        <section className="table-shell xl:col-span-2">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold">Reports Requiring Review</h2>
            <p className="text-sm text-slate-600 mt-1">Latest detections waiting for officer decision.</p>
          </div>

          {isLoading ? (
            <SkeletonRows rows={3} hint="Syncing latest AI-detected cases..." />
          ) : latestAIDetected.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up"
              description="No reports currently require review."
              hint="New AI-detected reports will appear here automatically."
              actionLabel="Refresh"
              onAction={() => {
                void refreshReports();
              }}
            />
          ) : (
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-20">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[25%]">Violation</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[32%]">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-28">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-40">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestAIDetected.map((report) => (
                    <tr key={report.id} className="table-row align-top transition-all duration-200 active:scale-[0.99] cursor-pointer" onClick={() => onNavigate('report-detail', report.id)}>
                      <td className="px-6 py-4 text-sm font-semibold whitespace-nowrap">#{report.id}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <span className="break-words">{report.violationType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 break-words">{report.location}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600 whitespace-nowrap">{report.aiResult?.confidence ?? 0}%</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(report.dateSubmitted)}</td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-cyan-700 font-semibold hover:text-cyan-800">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          )}

          {!isLoading && latestAIDetected.length > 0 && (
            <div className="md:hidden space-y-3 p-4">
              {latestAIDetected.map((report) => (
                <article key={`admin-mobile-${report.id}`} className="rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-slate-900">#{report.id}</p>
                    <p className="text-sm font-semibold text-emerald-700">{report.aiResult?.confidence ?? 0}%</p>
                  </div>
                  <p className="text-sm text-slate-800 mt-2">{report.violationType}</p>
                  <p className="text-sm text-slate-600 mt-1">{report.location}</p>
                  <p className="text-xs text-slate-500 mt-2">{formatDate(report.dateSubmitted)}</p>
                  <button onClick={() => onNavigate('report-detail', report.id)} className="btn-primary w-full !py-2 mt-3 cursor-pointer">
                    Review
                  </button>
                </article>
              ))}
            </div>
          )}

          {latestAIDetected.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button onClick={() => onNavigate('all-reports')} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                View all reports
              </button>
            </div>
          )}
        </section>

        <LiveActivityRail reports={reports} role="authority" onNavigate={onNavigate} />
      </div>
    </div>
  );
}
