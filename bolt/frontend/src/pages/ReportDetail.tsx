import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, MapPin, User, Calendar, AlertTriangle, Video, CheckCircle, XCircle, Brain, Image as ImageIcon } from 'lucide-react';
import { publishToast } from '../lib/toast';

interface ReportDetailProps {
  reportId: string;
  onNavigate: (page: string) => void;
}

export function ReportDetail({ reportId, onNavigate }: ReportDetailProps) {
  const { reports, updateReportStatus, isLoading, user } = useApp();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminObservation, setAdminObservation] = useState('');

  const report = reports.find((r) => r.id === reportId);

  const mediaType = useMemo(() => {
    const source = report?.evidencePath?.toLowerCase() || '';
    if (source.endsWith('.mp4') || source.endsWith('.avi') || source.endsWith('.mov') || source.endsWith('.mkv')) return 'video';
    if (source.endsWith('.jpg') || source.endsWith('.jpeg') || source.endsWith('.png') || source.endsWith('.bmp') || source.endsWith('.webp')) return 'image';
    return 'unknown';
  }, [report?.evidencePath]);

  const timelineItems = useMemo(() => {
    if (!report) return [];
    const items: Array<{ label: string; detail: string; time?: string | null }> = [
      { label: 'Report Submitted', detail: 'Citizen uploaded evidence', time: report.dateSubmitted },
    ];
    if (report.aiResult) {
      items.push({
        label: 'AI Analysis Completed',
        detail: `${report.aiResult.violation} (${report.aiResult.confidence}% confidence)`,
        time: report.dateSubmitted,
      });
    }
    if (report.reviewedAt) {
      items.push({
        label: 'Authority Review',
        detail: report.status,
        time: report.reviewedAt,
      });
    } else {
      items.push({
        label: 'Awaiting Review',
        detail: 'Pending authority decision',
      });
    }
    return items;
  }, [report]);

  useEffect(() => {
    if (!showRejectModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowRejectModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showRejectModal]);

  if (!report) {
    return (
      <div className="page-wrap page-section text-center">
        <section className="section-card max-w-xl mx-auto">
          <AlertTriangle className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <h2 className="text-2xl font-extrabold mb-2">Report Not Found</h2>
          <button onClick={() => onNavigate(user?.role === 'authority' ? 'all-reports' : 'my-reports')} className="text-cyan-700 font-semibold hover:text-cyan-800">
            Back
          </button>
        </section>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleConfirm = async () => {
    const res = await updateReportStatus(reportId, 'Confirmed/Fine Issued', undefined, adminObservation);
    if (res.success) {
      publishToast({ message: 'Violation confirmed and saved', tone: 'success' });
    } else {
      publishToast({ message: res.message || 'Failed to update report', tone: 'error' });
      return;
    }
    onNavigate('dashboard');
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    const res = await updateReportStatus(reportId, 'Rejected', rejectionReason, adminObservation);
    if (res.success) {
      publishToast({ message: 'Report rejected with comments', tone: 'success' });
    } else {
      publishToast({ message: res.message || 'Failed to reject report', tone: 'error' });
      return;
    }
    setShowRejectModal(false);
    onNavigate('dashboard');
  };

  return (
    <div className="page-wrap page-section page-rhythm">
      <button onClick={() => onNavigate(user?.role === 'authority' ? 'all-reports' : 'my-reports')} className="inline-flex items-center text-slate-600 hover:text-slate-900 font-semibold">
        <ArrowLeft className="w-5 h-5 mr-2" /> Back
      </button>

      <section className="section-card flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">Report #{report.id}</h1>
          <p className="text-slate-600">Inspect evidence and finalize decision.</p>
        </div>
        <StatusBadge status={report.status} />
      </section>

      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <section className="section-card p-0 overflow-hidden">
            <div className="aspect-video bg-slate-100 flex items-center justify-center text-center p-4">
              {report.evidencePath ? (
                mediaType === 'video' ? (
                  <video src={report.evidencePath} controls className="w-full h-full rounded-xl object-contain" />
                ) : mediaType === 'image' ? (
                  <img src={report.evidencePath} alt="Uploaded evidence" className="w-full h-full rounded-xl object-contain" />
                ) : (
                  <div>
                    <Video className="w-16 h-16 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Unsupported preview format</p>
                    <a href={report.evidencePath} target="_blank" rel="noreferrer" className="text-cyan-700 text-sm font-semibold hover:text-cyan-800">Open media</a>
                  </div>
                )
              ) : (
                <div>
                  <ImageIcon className="w-16 h-16 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No evidence available</p>
                </div>
              )}
            </div>
          </section>

          <section className="section-card">
            <h3 className="text-lg font-bold mb-2">Citizen Input</h3>
            <p className="text-slate-600 text-sm">{report.comments}</p>
          </section>

          <section className="section-card">
            <h3 className="text-lg font-bold mb-3">Audit Timeline</h3>
            <div className="space-y-3">
              {timelineItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex gap-3">
                  <div className="mt-0.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-600">{item.detail}</p>
                    {item.time && <p className="text-xs text-slate-400 mt-0.5">{formatDate(item.time)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="section-card space-y-4">
            <h2 className="text-xl font-bold">Report Information</h2>
            <div>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Violation Type</p>
              <p className="font-semibold">{report.violationType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Reported By</p>
              <p className="font-semibold">{report.userName}</p>
              <p className="text-sm text-slate-500">ID: {report.userId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date Submitted</p>
              <p className="font-semibold">{formatDate(report.dateSubmitted)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location</p>
              <p className="font-semibold break-words">{report.location}</p>
            </div>
          </section>

          {report.aiResult ? (
            <section className="section-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center"><Brain className="w-5 h-5" /></div>
                <h2 className="text-xl font-bold">AI Analysis</h2>
              </div>
              <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Detected violation</span>
                  <span className="font-semibold text-slate-900">{report.aiResult.violation}</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-sm text-slate-600">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${report.aiResult.confidence}%` }} />
                    </div>
                    <span className="font-semibold text-emerald-700 text-sm">{report.aiResult.confidence}%</span>
                  </div>
                </div>
              </div>

              {user?.role === 'authority' ? (
                <div className="mt-4">
                  <label className="form-label" htmlFor="admin-observation">Admin Observation</label>
                  <textarea
                    id="admin-observation"
                    value={adminObservation}
                    onChange={(e) => setAdminObservation(e.target.value)}
                    rows={3}
                    className="form-input resize-none"
                    placeholder="Write your review comments about AI correctness or evidence quality..."
                  />
                </div>
              ) : report.adminNotes ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Authority Observation</p>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{report.adminNotes}</p>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="section-card">
              <h2 className="text-xl font-bold mb-2">AI Analysis</h2>
              <p className="text-sm text-slate-500">No AI metadata available for this report.</p>
            </section>
          )}

          {report.status === 'Rejected' && report.rejectionReason && (
            <section className="rounded-xl bg-red-50 border border-red-100 p-4">
              <h3 className="text-sm font-bold text-red-900 mb-2">Rejection Reason</h3>
              <p className="text-sm text-red-800">{report.rejectionReason}</p>
            </section>
          )}
        </div>
      </div>

      {user?.role === 'authority' && (report.status === 'Pending Review' || report.status === 'Needs Manual Review') && (
        <section className="section-card max-w-2xl mx-auto">
          <h3 className="text-2xl font-extrabold mb-4 text-center">Decision</h3>
          <div className="space-y-3">
            <button type="button" onClick={handleConfirm} disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> Confirm Violation
            </button>
            <button type="button" onClick={() => setShowRejectModal(true)} disabled={isLoading} className="btn-soft w-full flex items-center justify-center gap-2">
              <XCircle className="w-5 h-5" /> Reject Report
            </button>
          </div>
        </section>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-200/55 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
          <div
            className="section-card motion-pop max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            aria-describedby="reject-description"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reject-title" className="text-2xl font-extrabold mb-3">Reject Report</h2>
            <p id="reject-description" className="text-slate-600 mb-3">Provide a clear reason for rejection.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="form-input resize-none mb-4"
              placeholder="Enter rejection reason"
              aria-label="Rejection reason"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="btn-soft w-full"
              >
                Cancel
              </button>
              <button type="button" onClick={handleReject} className="btn-danger w-full">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

