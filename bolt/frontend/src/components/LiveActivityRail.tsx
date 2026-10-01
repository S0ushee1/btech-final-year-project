import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowUpRight, Clock3 } from 'lucide-react';
import type { Report } from '../context/AppContext';

interface LiveActivityRailProps {
  reports: Report[];
  role: 'authority' | 'citizen';
  onNavigate: (page: string, reportId?: string) => void;
}

interface ActivityItem {
  id: string;
  reportId: string;
  title: string;
  detail: string;
  createdAt: string;
}

function signature(report: Report) {
  return `${report.id}|${report.status}|${report.reviewedAt ?? ''}|${report.dateSubmitted}`;
}

function buildActivity(report: Report, role: 'authority' | 'citizen'): ActivityItem {
  if (report.reviewedAt && role === 'citizen') {
    return {
      id: `${report.id}-${report.status}-${report.reviewedAt}`,
      reportId: report.id,
      title: `Report #${report.id} reviewed`,
      detail: `Status changed to ${report.status}`,
      createdAt: report.reviewedAt,
    };
  }

  if (role === 'authority') {
    return {
      id: `${report.id}-queued-${report.dateSubmitted}`,
      reportId: report.id,
      title: `Report #${report.id} queued`,
      detail: `${report.violationType} awaiting decision`,
      createdAt: report.dateSubmitted,
    };
  }

  return {
    id: `${report.id}-submitted-${report.dateSubmitted}`,
    reportId: report.id,
    title: `Report #${report.id} submitted`,
    detail: 'Waiting for AI/admin processing',
    createdAt: report.dateSubmitted,
  };
}

export function LiveActivityRail({ reports, role, onNavigate }: LiveActivityRailProps) {
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const seenSignaturesRef = useRef<Set<string>>(new Set());

  const baseline = useMemo(() => {
    const scoped = role === 'authority'
      ? reports.filter((r) => r.status === 'Pending Review' || r.status === 'Needs Manual Review')
      : reports;

    return scoped
      .slice()
      .sort((a, b) => {
        const aa = new Date(a.reviewedAt || a.dateSubmitted).getTime();
        const bb = new Date(b.reviewedAt || b.dateSubmitted).getTime();
        return bb - aa;
      })
      .slice(0, 8)
      .map((report) => buildActivity(report, role));
  }, [reports, role]);

  useEffect(() => {
    if (role === 'authority') {
      seenSignaturesRef.current = new Set(
        reports
          .filter((r) => r.status === 'Pending Review' || r.status === 'Needs Manual Review')
          .map(signature)
      );
      setEvents(baseline);
      return;
    }

    if (seenSignaturesRef.current.size === 0) {
      seenSignaturesRef.current = new Set(reports.map(signature));
      setEvents(baseline);
      return;
    }

    const next = new Set<string>();
    const newEvents: ActivityItem[] = [];

    reports.forEach((report) => {
      const sig = signature(report);
      next.add(sig);
      if (!seenSignaturesRef.current.has(sig)) {
        newEvents.push(buildActivity(report, role));
      }
    });

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 20));
    }
    seenSignaturesRef.current = next;
  }, [baseline, reports, role]);

  return (
    <section className="section-card">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-700" />
          <h3 className="text-lg font-bold">Live Activity</h3>
        </div>
        <span className="text-xs text-slate-500">Auto-refresh feed</span>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
          <Clock3 className="w-4 h-4 inline mr-2" />
          Activity will appear as reports are submitted or reviewed.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onNavigate('report-detail', event.reportId)}
              className="w-full text-left rounded-xl border border-slate-100 bg-white hover:bg-sky-50/55 transition p-3"
            >
              <p className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                {event.title}
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-700" />
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{event.detail}</p>
              <p className="text-[11px] text-slate-500 mt-1">{new Date(event.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
