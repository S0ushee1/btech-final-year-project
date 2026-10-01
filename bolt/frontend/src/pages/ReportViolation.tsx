import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, MapPin, FileText, CheckCircle, LocateFixed } from 'lucide-react';
import { publishToast } from '../lib/toast';

interface ReportViolationProps {
  onNavigate: (page: string) => void;
}

export function ReportViolation({ onNavigate }: ReportViolationProps) {
  const { addReport, isLoading } = useApp();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [location, setLocation] = useState('');
  const [violationType, setViolationType] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [annotationBox, setAnnotationBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewUrl(URL.createObjectURL(e.target.files[0]));
      setError('');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        const mapsLink = `https://maps.google.com/?q=${value}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
            { headers: { Accept: 'application/json' } }
          );
          if (!response.ok) {
            throw new Error('reverse_geocode_failed');
          }
          const data = await response.json();
          const areaName = data?.display_name ? String(data.display_name) : '';
          setLocation(areaName ? `${areaName} (${value})` : value);
          setMapUrl(mapsLink);
          setError('');
        } catch {
          setLocation(value);
          setMapUrl(mapsLink);
          setError('Location coordinates captured. Area name lookup failed.');
        }
      },
      () => setError('Unable to fetch current location')
    );
  };

  const handleSubmit = async () => {
    if (!file || !location || !violationType) {
      setError('Please fill in all required fields');
      return;
    }

    const response = await addReport({
      file,
      location: mapUrl?.trim() ? `${location} | ${mapUrl.trim()}` : location,
      comments: `Citizen reported type: ${violationType}${annotationBox ? ` | Evidence focus box: x=${annotationBox.x}, y=${annotationBox.y}, w=${annotationBox.w}, h=${annotationBox.h}` : ''}`,
    });
    if (!response.success) {
      setError(response.message || 'Failed to submit report');
      publishToast({ message: response.message || 'Failed to submit report', tone: 'error' });
      return;
    }

    publishToast({ message: 'Report submitted successfully', tone: 'success' });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="page-wrap page-section flex justify-center">
        <section className="section-card w-full max-w-xl text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold mb-3">Report Submitted</h2>
          <p className="text-slate-700 mb-6">
            Your footage has been forwarded to admins. Verification in progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => onNavigate('my-reports')} className="btn-primary w-full active:scale-[0.98] transition-transform">View My Reports</button>
            <button
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setFile(null);
                setPreviewUrl('');
                setLocation('');
                setViolationType('');
                setMapUrl('');
                setAnnotationBox(null);
                setDragStart(null);
                setError('');
              }}
              className="btn-soft w-full active:scale-[0.98] transition-transform"
            >
              Submit Another
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-wrap page-section">
      <section className="section-card max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2">Report Traffic Violation</h1>
        <p className="text-slate-600 mb-8">Upload evidence and submit accurate incident details.</p>

        <div className="flex items-center mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-all duration-300 ${step >= s ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-200' : 'bg-slate-200 text-slate-500'}`}>
                {s}
              </div>
              {s < 2 && <div className={`h-1 flex-1 mx-3 rounded transition-colors duration-300 ${step > s ? 'bg-cyan-500' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2"><Upload className="w-5 h-5" /> Step 1: Upload Evidence</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-cyan-400 transition-colors bg-gradient-to-b from-slate-50 to-white">
              <input type="file" id="file-upload" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                {!previewUrl ? (
                  <>
                    <Upload className="w-10 h-10 text-slate-400" />
                    <p className="font-semibold">{file?.name || 'Click to upload image or video'}</p>
                    <p className="text-sm text-slate-500">Supported formats: MP4, AVI, JPG, PNG</p>
                  </>
                ) : file?.type.startsWith('video/') ? (
                  <>
                    <video src={previewUrl} controls className="w-full max-h-80 rounded-xl object-contain bg-slate-100" />
                    <p className="text-sm text-slate-600 mt-2">{file?.name}</p>
                  </>
                ) : (
                  <>
                    <div
                      className="relative w-full max-h-80 bg-slate-100 rounded-xl overflow-hidden"
                      onMouseDown={(e) => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const x = Math.max(0, Math.round(e.clientX - rect.left));
                        const y = Math.max(0, Math.round(e.clientY - rect.top));
                        setDragStart({ x, y });
                        setAnnotationBox({ x, y, w: 0, h: 0 });
                      }}
                      onMouseMove={(e) => {
                        if (!dragStart) return;
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const cx = Math.max(0, Math.round(e.clientX - rect.left));
                        const cy = Math.max(0, Math.round(e.clientY - rect.top));
                        const x = Math.min(dragStart.x, cx);
                        const y = Math.min(dragStart.y, cy);
                        const w = Math.abs(cx - dragStart.x);
                        const h = Math.abs(cy - dragStart.y);
                        setAnnotationBox({ x, y, w, h });
                      }}
                      onMouseUp={() => setDragStart(null)}
                      onMouseLeave={() => setDragStart(null)}
                    >
                      <img src={previewUrl} alt="Uploaded preview" className="w-full max-h-80 rounded-xl object-contain bg-slate-100" />
                      {annotationBox && annotationBox.w > 6 && annotationBox.h > 6 && (
                        <div
                          className="absolute border-2 border-cyan-500 bg-cyan-500/15 rounded-sm pointer-events-none"
                          style={{
                            left: annotationBox.x,
                            top: annotationBox.y,
                            width: annotationBox.w,
                            height: annotationBox.h,
                          }}
                        />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{file?.name}</p>
                    <p className="text-xs text-slate-500">Optional: Drag on image to mark the violating region.</p>
                  </>
                )}
              </label>
            </div>
            {file && <p className="text-sm text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-xl p-3">Selected: {file.name}</p>}
            <button onClick={() => setStep(2)} className="btn-primary w-full active:scale-[0.98] transition-transform">Continue</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> Step 2: Add Details</h2>
            <div>
              <label className="form-label flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" placeholder="Street, junction, area" />
            </div>
            <button type="button" onClick={handleUseCurrentLocation} className="btn-soft w-full sm:w-auto inline-flex items-center justify-center gap-2">
              <LocateFixed className="w-4 h-4" /> Use Current Location
            </button>
            <div>
              <label className="form-label">Violation Type</label>
              <select value={violationType} onChange={(e) => setViolationType(e.target.value)} className="form-input">
                <option value="">Select type</option>
                <option value="No Helmet">No Helmet</option>
                <option value="Triple Riding">Triple Riding</option>
                <option value="Wrong Side Driving">Wrong Side Driving</option>
                <option value="Mobile Phone Usage">Mobile Phone Usage</option>
                <option value="Signal/Stop Line Violation">Signal/Stop Line Violation</option>
                <option value="Lane Discipline / Improper Overtaking">Lane Discipline / Improper Overtaking</option>
              </select>
            </div>
            <div>
              <label className="form-label">Map URL (Optional)</label>
              <input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} className="form-input" placeholder="https://maps.google.com/?q=..." />
            </div>
            {mapUrl && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <iframe
                  title="Map preview"
                  src={mapUrl.replace('maps.google.com/?q=', 'www.google.com/maps?q=') + '&output=embed'}
                  className="w-full h-64"
                  loading="lazy"
                />
              </div>
            )}
            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setStep(1)} className="btn-soft w-full active:scale-[0.98] transition-transform">Back</button>
              <button onClick={handleSubmit} disabled={isLoading} className="btn-primary w-full active:scale-[0.98] transition-transform" aria-busy={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
            {isLoading && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                Uploading evidence and running AI analysis...
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
