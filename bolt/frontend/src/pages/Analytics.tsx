import { useApp } from '../context/AppContext';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export function Analytics() {
  const { reports } = useApp();

  const totalReports = reports.length;
  const pending = reports.filter((r) => r.status === 'Pending Review').length;
  const aiDetected = reports.filter((r) => r.status === 'Needs Manual Review').length;
  const noViolation = reports.filter((r) => r.status === 'No Violation (AI)').length;
  const confirmed = reports.filter((r) => r.status === 'Confirmed/Fine Issued').length;
  const rejected = reports.filter((r) => r.status === 'Rejected').length;
  const reviewed = reports.filter((r) => !!r.reviewedAt).length;
  const totalFine = reports.reduce((sum, report) => sum + (report.fineAmount || 0), 0);
  const reviewedToday = reports.filter((r) => {
    if (!r.reviewedAt) return false;
    const d = new Date(r.reviewedAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }).length;

  const violationTypes = reports.reduce((acc, report) => {
    acc[report.violationType] = (acc[report.violationType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topViolations = Object.entries(violationTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const confirmationRate = totalReports > 0 ? ((confirmed / totalReports) * 100).toFixed(1) : '0';
  const rejectionRate = totalReports > 0 ? ((rejected / totalReports) * 100).toFixed(1) : '0';

  const lastSevenDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = reports.filter((r) => (r.dateSubmitted || '').slice(0, 10) === key).length;
    return { key, label, count };
  });
  const maxTrend = Math.max(...lastSevenDays.map((d) => d.count), 1);
  const trendPath = lastSevenDays
    .map((d, i) => {
      const x = (i / 6) * 100;
      const y = 100 - (d.count / maxTrend) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const donutSegments = [
    { label: 'Pending', value: pending, color: '#06b6d4' },
    { label: 'Manual', value: aiDetected, color: '#14b8a6' },
    { label: 'No Violation', value: noViolation, color: '#0891b2' },
    { label: 'Confirmed', value: confirmed, color: '#0ea5e9' },
    { label: 'Rejected', value: rejected, color: '#64748b' },
  ];
  const donutTotal = Math.max(donutSegments.reduce((sum, s) => sum + s.value, 0), 1);
  let start = 0;
  const rings = donutSegments.map((seg) => {
    const pct = seg.value / donutTotal;
    const dash = `${pct * 100} ${100 - pct * 100}`;
    const item = { ...seg, dash, offset: -start };
    start += pct * 100;
    return item;
  });

  return (
    <div className="page-wrap page-section page-rhythm">
      <section className="section-card">
        <h1 className="text-3xl font-extrabold mb-2">Analytics</h1>
        <p className="text-slate-600">System-level trends and enforcement insights.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="section-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center"><BarChart3 className="w-6 h-6" /></div>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold">{totalReports}</div>
          <div className="text-sm text-slate-500">Total Reports</div>
        </article>
        <article className="section-card">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3"><CheckCircle className="w-6 h-6" /></div>
          <div className="text-3xl font-extrabold text-teal-700">{confirmationRate}%</div>
          <div className="text-sm text-slate-500">Confirmation Rate</div>
        </article>
        <article className="section-card">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3"><AlertTriangle className="w-6 h-6" /></div>
          <div className="text-3xl font-extrabold text-cyan-700">{rejectionRate}%</div>
          <div className="text-sm text-slate-500">Rejection Rate</div>
        </article>
        <article className="section-card">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3"><BarChart3 className="w-6 h-6" /></div>
          <div className="text-3xl font-extrabold text-teal-700">{aiDetected}</div>
          <div className="text-sm text-slate-500">Awaiting Review</div>
        </article>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <article className="section-card">
          <h2 className="text-xl font-bold mb-5">Violation Trend (7 days)</h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <svg viewBox="0 0 100 100" className="w-full h-44">
              <path d={trendPath} fill="none" stroke="#14b8a6" strokeWidth="2.8" strokeLinecap="round" />
              {lastSevenDays.map((d, i) => {
                const x = (i / 6) * 100;
                const y = 100 - (d.count / maxTrend) * 100;
                return <circle key={d.key} cx={x} cy={y} r="1.8" className="fill-slate-900" />;
              })}
            </svg>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
              {lastSevenDays.map((d) => (
                <div key={d.key} className="rounded-lg bg-slate-50 px-2 py-1.5 border border-slate-100">
                  <div className="font-semibold">{d.label}</div>
                  <div>{d.count} reports</div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="section-card">
          <h2 className="text-xl font-bold mb-5">Status Mix (Doughnut)</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <svg viewBox="0 0 44 44" className="w-44 h-44 -rotate-90">
              <circle cx="22" cy="22" r="15.9155" fill="none" className="stroke-slate-200" strokeWidth="4.2" />
              {rings.map((r) => (
                <circle
                  key={r.label}
                  cx="22"
                  cy="22"
                  r="15.9155"
                  fill="none"
                  stroke={r.color}
                  strokeWidth="4.2"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.offset}
                />
              ))}
            </svg>
            <div className="space-y-2 w-full">
              {rings.map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                    {r.label}
                  </span>
                  <span className="font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="section-card">
          <h2 className="text-xl font-bold mb-5">Reports by Status</h2>
          <div className="space-y-4">
            {[
              { label: 'Pending Review', count: pending, color: 'bg-cyan-500' },
              { label: 'Needs Manual Review', count: aiDetected, color: 'bg-teal-500' },
              { label: 'No Violation (AI)', count: noViolation, color: 'bg-teal-600' },
              { label: 'Confirmed/Fine Issued', count: confirmed, color: 'bg-sky-500' },
              { label: 'Rejected', count: rejected, color: 'bg-slate-500' },
            ].map((item) => {
              const percentage = totalReports > 0 ? (item.count / totalReports) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="font-semibold">{item.count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="section-card">
          <h2 className="text-xl font-bold mb-5">Top Violation Types</h2>
          <div className="space-y-4">
            {topViolations.length > 0 ? (
              topViolations.map(([type, count], index) => {
                const percentage = totalReports > 0 ? (count / totalReports) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between mb-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center">{index + 1}</span>
                        <span className="text-slate-700">{type}</span>
                      </div>
                      <span className="font-semibold">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden ml-8">
                      <div className="h-full bg-teal-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 text-center py-8">No data available</p>
            )}
          </div>
        </article>
      </section>

      <section className="section-card">
        <h2 className="text-xl font-bold mb-5">Key Metrics</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="border-l-4 border-teal-500 pl-4">
            <div className="text-sm text-slate-500">Reports Reviewed</div>
            <div className="text-2xl font-extrabold">{reviewed}</div>
          </div>
          <div className="border-l-4 border-teal-600 pl-4">
            <div className="text-sm text-slate-500">Reviewed Today</div>
            <div className="text-2xl font-extrabold">{reviewedToday}</div>
          </div>
          <div className="border-l-4 border-sky-500 pl-4">
            <div className="text-sm text-slate-500">Total Fine Amount</div>
            <div className="text-2xl font-extrabold">{totalFine.toFixed(0)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
