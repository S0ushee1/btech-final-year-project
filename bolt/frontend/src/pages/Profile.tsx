import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Shield, Calendar, CheckCircle2, ShieldCheck, ClipboardCheck, IndianRupee, Eye, EyeOff, BadgeCheck, MapPin, Sparkles } from 'lucide-react';
import { publishToast } from '../lib/toast';

export function Profile() {
  const { user, reports, updateProfile, changePassword, isLoading } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');
  const [activeCitizenPanel, setActiveCitizenPanel] = useState<'impact' | 'edit' | 'password'>('impact');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [citizenDisplay, setCitizenDisplay] = useState({ submitted: 0, confirmed: 0, noViolation: 0, preventedScore: 0, safetyScore: 0 });
  const [adminDisplay, setAdminDisplay] = useState({ reviewed: 0, confirmed: 0, rejected: 0, totalFine: 0 });
  const citizenDisplayRef = useRef(citizenDisplay);
  const adminDisplayRef = useRef(adminDisplay);
  const isAuthority = user?.role === 'authority';

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  const citizenStats = useMemo(() => {
    const mine = reports;
    const confirmed = mine.filter((r) => r.status === 'Confirmed/Fine Issued').length;
    const noViolation = mine.filter((r) => r.status === 'No Violation (AI)').length;
    const submitted = mine.length;
    return { confirmed, noViolation, submitted, preventedScore: confirmed * 2 + noViolation };
  }, [reports]);

  const adminStats = useMemo(() => {
    const reviewed = reports.filter((r) => !!r.reviewedAt).length;
    const confirmed = reports.filter((r) => r.status === 'Confirmed/Fine Issued').length;
    const rejected = reports.filter((r) => r.status === 'Rejected').length;
    const totalFine = reports.reduce((sum, r) => sum + (r.fineAmount || 0), 0);
    return { reviewed, confirmed, rejected, totalFine };
  }, [reports]);

  const safetyScore = useMemo(() => {
    if (citizenStats.submitted === 0) return 0;
    const raw = (citizenStats.preventedScore / Math.max(1, citizenStats.submitted * 2)) * 100;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [citizenStats.preventedScore, citizenStats.submitted]);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const startValues = { ...citizenDisplayRef.current };
    const targetValues = {
      submitted: citizenStats.submitted,
      confirmed: citizenStats.confirmed,
      noViolation: citizenStats.noViolation,
      preventedScore: citizenStats.preventedScore,
      safetyScore,
    };

    let rafId = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const next = {
        submitted: Math.round(startValues.submitted + (targetValues.submitted - startValues.submitted) * ease),
        confirmed: Math.round(startValues.confirmed + (targetValues.confirmed - startValues.confirmed) * ease),
        noViolation: Math.round(startValues.noViolation + (targetValues.noViolation - startValues.noViolation) * ease),
        preventedScore: Math.round(startValues.preventedScore + (targetValues.preventedScore - startValues.preventedScore) * ease),
        safetyScore: Math.round(startValues.safetyScore + (targetValues.safetyScore - startValues.safetyScore) * ease),
      };
      citizenDisplayRef.current = next;
      setCitizenDisplay(next);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [citizenStats.confirmed, citizenStats.noViolation, citizenStats.preventedScore, citizenStats.submitted, safetyScore]);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const startValues = { ...adminDisplayRef.current };
    const targetValues = {
      reviewed: adminStats.reviewed,
      confirmed: adminStats.confirmed,
      rejected: adminStats.rejected,
      totalFine: Math.round(adminStats.totalFine),
    };

    let rafId = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const next = {
        reviewed: Math.round(startValues.reviewed + (targetValues.reviewed - startValues.reviewed) * ease),
        confirmed: Math.round(startValues.confirmed + (targetValues.confirmed - startValues.confirmed) * ease),
        rejected: Math.round(startValues.rejected + (targetValues.rejected - startValues.rejected) * ease),
        totalFine: Math.round(startValues.totalFine + (targetValues.totalFine - startValues.totalFine) * ease),
      };
      adminDisplayRef.current = next;
      setAdminDisplay(next);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [adminStats.confirmed, adminStats.rejected, adminStats.reviewed, adminStats.totalFine]);

  const memberSinceLabel = useMemo(() => {
    if (!user?.createdAt) return 'Recently joined';
    const date = new Date(user.createdAt);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }, [user?.createdAt]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProfileMessage('');
    const result = await updateProfile(name.trim());
    if (!result.success) {
      setError(result.message || 'Failed to update profile');
      publishToast({ message: result.message || 'Failed to update profile', tone: 'error' });
      return;
    }
    setProfileMessage(result.message || 'Profile updated successfully');
    publishToast({ message: result.message || 'Profile updated successfully', tone: 'success' });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword) {
      setError('Enter current and new password');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);
    if (!result.success) {
      setError(result.message || 'Failed to change password');
      publishToast({ message: result.message || 'Failed to change password', tone: 'error' });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setPasswordMessage(result.message || 'Password changed successfully');
    publishToast({ message: result.message || 'Password changed successfully', tone: 'success' });
  };

  return (
    <div className="page-wrap page-section page-rhythm font-sans">
      <section className="section-card p-0 overflow-hidden animate-fade-in-up">
        <div className="relative">
          <div
            style={{
              background: 'linear-gradient(135deg, #0a7c72 0%, #025a8a 100%)',
              minHeight: '180px',
              padding: '36px 32px 64px',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5 flex-wrap">
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '999px',
                  background: '#ffffff',
                  border: '3px solid white',
                  boxShadow: '0 0 0 4px rgba(13,148,136,0.3), 0 4px 16px rgba(0,0,0,0.15)',
                }}
                className="flex items-center justify-center text-teal-700"
              >
                <User className="w-10 h-10" />
              </div>
              <div className="pt-3">
                <h1
                  style={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: '28px',
                    fontWeight: 400,
                    color: '#ffffff',
                    letterSpacing: '-0.5px',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    margin: 0,
                  }}
                >
                  {user?.name}
                </h1>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.80)',
                    margin: '2px 0 0',
                    fontWeight: 400,
                  }}
                >
                  {isAuthority ? 'Authority Account' : 'Citizen Account'}
                </p>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    marginTop: '8px',
                  }}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      color: '#ffffff',
                      backdropFilter: 'blur(8px)',
                      padding: '8px 14px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <Shield className="h-4 w-4" />
                    {isAuthority ? 'Authority' : 'Citizen'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      color: '#ffffff',
                      backdropFilter: 'blur(8px)',
                      padding: '8px 14px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                    Member since {memberSinceLabel}
                  </span>
                </div>
              </div>
            </div>
            <div
              className={`!p-4 sm:!p-5 rounded-2xl border ${isAuthority ? 'border-slate-300/70' : ''}`}
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${isAuthority ? 'bg-slate-900/10 text-slate-800' : 'bg-teal-100 text-teal-700'}`}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p
                    style={{
                      color: '#0d9488',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Badge Level
                  </p>
                  <p
                    style={{
                      color: '#0f172a',
                      fontSize: '16px',
                      fontFamily: '"DM Serif Display", serif',
                      margin: 0,
                    }}
                  >
                    {isAuthority ? 'Civic Authority' : 'Community Reporter'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-teal-600" />
                <span>{isAuthority ? 'Jurisdiction: Not assigned' : 'Region: Citizen Network'}</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6 profile-stagger">
            <div className="profile-card border-l-4 border-teal-500/70 backdrop-blur">
              <p className="profile-card-label">
                <span className="profile-card-icon">
                  <User className="w-4 h-4" />
                </span>
                Full Name
              </p>
              <p className="profile-card-value">{user?.name}</p>
            </div>
            <div className="profile-card border-l-4 border-cyan-500/70 backdrop-blur">
              <p className="profile-card-label">
                <span className="profile-card-icon">
                  <Mail className="w-4 h-4" />
                </span>
                Email
              </p>
              <p className="profile-card-value">{user?.email || 'not-available@example.com'}</p>
            </div>
            <div className="profile-card border-l-4 border-emerald-500/70 backdrop-blur">
              <p className="profile-card-label">
                <span className="profile-card-icon">
                  <Shield className="w-4 h-4" />
                </span>
                User ID
              </p>
              <p className="profile-card-value font-mono">{user?.id}</p>
            </div>
            <div className="profile-card border-l-4 border-teal-500/70 backdrop-blur">
              <p className="profile-card-label">
                <span className="profile-card-icon">
                  <Calendar className="w-4 h-4" />
                </span>
                Member Since
              </p>
              <p className="profile-card-value">{memberSinceLabel}</p>
            </div>
          </div>

          {(error || profileMessage || passwordMessage) && (
            <div className="space-y-2">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {profileMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{profileMessage}</div>}
              {passwordMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{passwordMessage}</div>}
            </div>
          )}

          {!isAuthority ? (
            <div className="pt-6 space-y-4">
              <div className="section-divider" />
              <div className="flex flex-wrap gap-2">
                <button className={activeCitizenPanel === 'impact' ? 'profile-tab profile-tab-active min-w-[160px]' : 'profile-tab min-w-[160px]'} onClick={() => setActiveCitizenPanel('impact')}>
                  Contribution Impact
                </button>
                <button className={activeCitizenPanel === 'edit' ? 'profile-tab profile-tab-active min-w-[160px]' : 'profile-tab min-w-[160px]'} onClick={() => setActiveCitizenPanel('edit')}>
                  Edit Profile
                </button>
                <button className={activeCitizenPanel === 'password' ? 'profile-tab profile-tab-active min-w-[160px]' : 'profile-tab min-w-[160px]'} onClick={() => setActiveCitizenPanel('password')}>
                  Change Password
                </button>
              </div>

              {activeCitizenPanel === 'impact' && (
                <div className="rounded-2xl bg-white/70 border border-teal-100 p-6 backdrop-blur animate-fade-in-up">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-lg font-bold">Contribution Impact</h3>
                      <p className="text-slate-600">Live values based on your submitted reports and authority decisions.</p>
                    </div>
                    <span className="profile-pill">
                      <ShieldCheck className="h-4 w-4" />
                      Trusted Reporter
                    </span>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="profile-stat-card">
                      <div className="profile-stat-badge">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div className="text-2xl font-extrabold text-teal-700">{citizenDisplay.submitted}</div>
                      <div className="text-sm text-slate-600">Submitted</div>
                    </div>
                    <div className="profile-stat-card">
                      <div className="profile-stat-badge">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="text-2xl font-extrabold text-emerald-700">{citizenDisplay.confirmed}</div>
                      <div className="text-sm text-slate-600">Confirmed</div>
                    </div>
                    <div className="profile-stat-card">
                      <div className="profile-stat-badge">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="text-2xl font-extrabold text-teal-700">{citizenDisplay.noViolation}</div>
                      <div className="text-sm text-slate-600">No Violation</div>
                    </div>
                    <div className="profile-stat-card">
                      <div
                        className="profile-score-ring mx-auto"
                        style={{
                          '--ring-value': `${citizenDisplay.safetyScore}%`,
                          '--ring-color': citizenDisplay.safetyScore >= 70 ? '#10b981' : citizenDisplay.safetyScore >= 40 ? '#f59e0b' : '#f43f5e',
                        } as CSSProperties}
                      >
                        <div className="profile-score-core">
                          <div className="text-lg font-extrabold text-slate-900">{citizenDisplay.safetyScore}%</div>
                          <div className="text-[11px] font-semibold text-slate-500">Safety</div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-slate-600">Safety Score</div>
                    </div>
                  </div>
                </div>
              )}

              {activeCitizenPanel === 'edit' && (
                <form onSubmit={handleProfileSave} className="profile-card !p-6 animate-fade-in-up">
                  <h3 className="text-lg font-bold mb-1">Edit Profile</h3>
                  <p className="text-sm text-slate-600 mb-4">Keep your citizen identity current for fast responses.</p>
                  <label className="form-label" htmlFor="profile-name">Full Name</label>
                  <input id="profile-name" className="profile-input mb-4" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" />
                  <button disabled={isLoading} className="btn-primary w-full" type="submit">
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              )}

              {activeCitizenPanel === 'password' && (
                <form onSubmit={handlePasswordChange} className="profile-card !p-6 animate-fade-in-up">
                  <h3 className="text-lg font-bold mb-1">Change Password</h3>
                  <p className="text-sm text-slate-600 mb-4">Rotate your credentials to keep your account secure.</p>
                  <label className="form-label" htmlFor="current-password">Current Password</label>
                  <div className="relative mb-3">
                    <input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="profile-input pr-12"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <label className="form-label" htmlFor="new-password">New Password</label>
                  <div className="relative mb-4">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className="profile-input pr-12"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button disabled={isLoading} className="btn-primary w-full" type="submit">
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="pt-6">
              <div className="section-divider mb-4" />
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold">Authority Overview</h3>
                  <p className="text-sm text-slate-600">Live review activity across your jurisdiction.</p>
                </div>
                <span className="profile-pill profile-pill-authority">
                  <ShieldCheck className="h-4 w-4" />
                  Authority Console
                </span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="profile-card !p-5 border-l-4 border-slate-700/70">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/10 text-slate-800 flex items-center justify-center mb-2"><ClipboardCheck className="w-5 h-5" /></div>
                  <div className="text-2xl font-extrabold">{adminDisplay.reviewed}</div>
                  <div className="text-sm text-slate-500">Reports Reviewed</div>
                </div>
                <div className="profile-card !p-5 border-l-4 border-emerald-600/70">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5" /></div>
                  <div className="text-2xl font-extrabold text-emerald-700">{adminDisplay.confirmed}</div>
                  <div className="text-sm text-slate-500">Confirmed Cases</div>
                </div>
                <div className="profile-card !p-5 border-l-4 border-cyan-500/70">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-2"><ShieldCheck className="w-5 h-5" /></div>
                  <div className="text-2xl font-extrabold text-cyan-700">{adminDisplay.rejected}</div>
                  <div className="text-sm text-slate-500">Rejected Cases</div>
                </div>
                <div className="profile-card !p-5 border-l-4 border-teal-600/70">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-2"><IndianRupee className="w-5 h-5" /></div>
                  <div className="text-2xl font-extrabold text-teal-700">{adminDisplay.totalFine.toFixed(0)}</div>
                  <div className="text-sm text-slate-500">Total Fine Value</div>
                </div>
              </div>
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="profile-card !p-5 border-l-4 border-slate-600/70">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Jurisdiction</p>
                  <p className="text-lg font-semibold text-slate-900">Not assigned</p>
                </div>
                <div className="profile-card !p-5 border-l-4 border-teal-500/70">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Badge Level</p>
                  <p className="text-lg font-semibold text-slate-900">Authority Tier II</p>
                </div>
                <div className="profile-card !p-5 border-l-4 border-cyan-500/70">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Review Cadence</p>
                  <p className="text-lg font-semibold text-slate-900">Live</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

