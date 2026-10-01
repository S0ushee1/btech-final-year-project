import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const TOKEN_KEY = 'tv_auth_token';
const USER_KEY = 'tv_auth_user';
const LEGACY_TOKEN_KEY = 'token';
const LEGACY_USER_KEY = 'user';

export type ReportStatus =
  | 'Pending Review'
  | 'Needs Manual Review'
  | 'No Violation (AI)'
  | 'Confirmed/Fine Issued'
  | 'Rejected';

export interface Report {
  id: string;
  userId: string;
  userName: string;
  location: string;
  violationType: string;
  comments: string;
  evidencePath?: string;
  status: ReportStatus;
  aiResult?: {
    violation: string;
    confidence: number;
  };
  rejectionReason?: string;
  dateSubmitted: string;
  fineAmount?: number | null;
  adminNotes?: string | null;
  reviewedAt?: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'authority';
  createdAt?: string | null;
}

interface ActionResult {
  success: boolean;
  message?: string;
}

interface UploadResult extends ActionResult {
  result?: string;
  violations?: string[];
  confidence_score?: number;
  report_id?: number;
  evidence?: {
    snapshot_path?: string | null;
    frame_index?: number | null;
  };
}

export type RealtimeMode = 'idle' | 'connecting' | 'live' | 'polling';

interface AppContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  reports: Report[];
  login: (email: string, password: string) => Promise<ActionResult>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<ActionResult>;
  addReport: (input: { file: File; location: string; comments: string }) => Promise<UploadResult>;
  updateReportStatus: (id: string, status: ReportStatus, rejectionReason?: string, adminNotes?: string) => Promise<ActionResult>;
  updateProfile: (name: string) => Promise<ActionResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ActionResult>;
  refreshReports: () => Promise<void>;
  reconnectNow: () => void;
  realtime: {
    mode: RealtimeMode;
    reconnectCount: number;
    lastEventAt: string | null;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapBackendStatus(status: string): ReportStatus {
  if (status === 'REJECTED' || status === 'Rejected') return 'Rejected';
  if (status === 'CONFIRMED' || status === 'Confirmed/Fine Issued') return 'Confirmed/Fine Issued';
  if (status === 'NEEDS_MANUAL_REVIEW' || status === 'Needs Manual Review') return 'Needs Manual Review';
  if (status === 'NO_VIOLATION') return 'No Violation (AI)';
  if (status === 'PENDING' || status === 'AI_DETECTED') return 'Pending Review';
  return 'Pending Review';
}

function toEvidenceUrl(evidencePath?: string): string | undefined {
  if (!evidencePath) return undefined;
  const normalized = String(evidencePath).replace(/\\/g, '/');
  const fileName = normalized.split('/').pop();
  if (!fileName) return undefined;
  return `${API_BASE_URL}/media/${encodeURIComponent(fileName)}`;
}

function mapReport(raw: any): Report {
  const confidence = Number(raw.confidence_score || 0);
  const violation = String(raw.violation_type || 'Unknown');

  return {
    id: String(raw.id),
    userId: String(raw.user_id || 'anonymous'),
    userName: String(raw.user_name || raw.user_id || 'Anonymous'),
    location: String(raw.location || 'Unknown Location'),
    violationType: violation,
    comments: String(raw.comments || ''),
    evidencePath: toEvidenceUrl(raw.evidence_path),
    status: mapBackendStatus(String(raw.status || 'Pending Review')),
    aiResult: {
      violation,
      confidence: Math.round(confidence * 100),
    },
    rejectionReason: raw.status === 'Rejected' || raw.status === 'REJECTED' ? String(raw.admin_notes || '') : undefined,
    dateSubmitted: String(raw.created_at || new Date().toISOString()),
    fineAmount: raw.fine_amount,
    adminNotes: raw.admin_notes,
    reviewedAt: raw.reviewed_at ?? null,
  };
}

function mapUser(raw: any): User {
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    email: String(raw?.email ?? ''),
    role: raw?.role === 'authority' ? 'authority' : 'citizen',
    createdAt: raw?.created_at ? String(raw.created_at) : null,
  };
}

async function requestJSON(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [realtimeMode, setRealtimeMode] = useState<RealtimeMode>('idle');
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [streamEpoch, setStreamEpoch] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const hydrateUser = async () => {
      try {
        const data = await requestJSON('/auth/me', {}, token);
        if (cancelled || !data?.user) return;
        const nextUser = mapUser(data.user);
        setUser(nextUser);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      } catch {
        // Keep local session data if profile refresh fails.
      }
    };

    void hydrateUser();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isLoggedIn = Boolean(user && token);

  const refreshReports = useCallback(async () => {
    if (!isLoggedIn) {
      setReports([]);
      return;
    }

    const data = await requestJSON('/reports', {}, token);
    const incoming = Array.isArray(data?.reports) ? data.reports.map(mapReport) : [];

    if (user?.role === 'citizen') {
      const mine = incoming.filter((r: Report) => r.userId === user.id);
      setReports(mine);
      return;
    }

    setReports(incoming);
  }, [isLoggedIn, token, user?.id, user?.role]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void refreshReports();
  }, [isLoggedIn, refreshReports, user?.role]);

  useEffect(() => {
    if (!isLoggedIn || !token) return;

    let pollTimer: number | null = null;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;
    let retryDelay = 4000;

    const startPolling = () => {
      if (pollTimer) return;
      setRealtimeMode('polling');
      pollTimer = window.setInterval(() => {
        void (async () => {
          try {
            await refreshReports();
            setLastEventAt(new Date().toISOString());
          } catch {
            // Ignore transient polling fetch errors.
          }
        })();
      }, 10000);
    };

    const stopPolling = () => {
      if (!pollTimer) return;
      window.clearInterval(pollTimer);
      pollTimer = null;
    };

    const connectStream = async () => {
      if (closed) return;
      setRealtimeMode('connecting');
      try {
        const streamTokenData = await requestJSON('/auth/stream-token', {}, token);
        const streamToken = String(streamTokenData?.stream_token || '');
        if (!streamToken) {
          throw new Error('missing_stream_token');
        }
        const streamUrl = `${API_BASE_URL}/reports/stream?stream_token=${encodeURIComponent(streamToken)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          let payload: any = null;
          try {
            payload = JSON.parse(event.data);
          } catch {
            payload = null;
          }

          if (payload?.type === 'report_created' || payload?.type === 'status_changed' || payload?.type === 'report_reviewed') {
            void refreshReports();
          }

          setLastEventAt(new Date().toISOString());
          setRealtimeMode('live');
          retryDelay = 4000;
          stopPolling();
        };

        eventSource.addEventListener('ready', () => {
          setRealtimeMode('live');
          setLastEventAt(new Date().toISOString());
          retryDelay = 4000;
          stopPolling();
        });

        eventSource.onerror = () => {
          if (closed) return;
          setReconnectCount((prev) => prev + 1);
          setRealtimeMode('polling');
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          startPolling();
          if (!reconnectTimer) {
            reconnectTimer = window.setTimeout(() => {
              reconnectTimer = null;
              retryDelay = Math.min(retryDelay * 1.5, 30000);
              void connectStream();
            }, retryDelay);
          }
        };
      } catch {
        startPolling();
        setReconnectCount((prev) => prev + 1);
        setRealtimeMode('polling');
        if (!reconnectTimer) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            retryDelay = Math.min(retryDelay * 1.5, 30000);
            void connectStream();
          }, retryDelay);
        }
      }
    };

    void connectStream();

    return () => {
      closed = true;
      if (eventSource) eventSource.close();
      if (pollTimer) window.clearInterval(pollTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      setRealtimeMode('idle');
    };
  }, [isLoggedIn, refreshReports, token, streamEpoch]);

  const reconnectNow = useCallback(() => {
    setRealtimeMode('connecting');
    setStreamEpoch((prev) => prev + 1);
  }, []);

  const login = async (email: string, password: string): Promise<ActionResult> => {
    try {
      setIsLoading(true);
      const data = await requestJSON('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const nextUser: User = {
        ...mapUser(data.user),
      };

      setToken(data.token);
      setUser(nextUser);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem(LEGACY_TOKEN_KEY, data.token);
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(nextUser));
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setReports([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<ActionResult> => {
    try {
      setIsLoading(true);
      const data = await requestJSON('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      const nextUser: User = {
        ...mapUser(data.user),
      };

      setToken(data.token);
      setUser(nextUser);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem(LEGACY_TOKEN_KEY, data.token);
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(nextUser));
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const addReport = async (input: { file: File; location: string; comments: string }): Promise<UploadResult> => {
    try {
      setIsLoading(true);
      const form = new FormData();
      form.append('file', input.file);
      form.append('location', input.location);
      form.append('comments', input.comments);
      if (user) {
        form.append('user_id', user.id);
      }

      const data = await requestJSON('/upload', { method: 'POST', body: form }, token);
      await refreshReports();
      return {
        success: true,
        message: data.message,
        result: data.result,
        violations: data.violations,
        confidence_score: data.confidence_score,
        report_id: data.report_id,
        evidence: data.evidence,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Upload failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateReportStatus = async (
    id: string,
    status: ReportStatus,
    rejectionReason?: string,
    adminNotes?: string
  ): Promise<ActionResult> => {
    try {
      setIsLoading(true);
      const payload: Record<string, unknown> = {
        status: status === 'Confirmed/Fine Issued' ? 'CONFIRMED' : status === 'Rejected' ? 'REJECTED' : status,
      };
      if (status === 'Rejected') {
        const reason = rejectionReason || 'Rejected by authority';
        payload.admin_notes = adminNotes?.trim()
          ? `Rejection Reason: ${reason}\nAdmin Observation: ${adminNotes.trim()}`
          : reason;
      } else if (adminNotes?.trim()) {
        payload.admin_notes = adminNotes.trim();
      }
      await requestJSON(`/reports/${id}/review`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      await refreshReports();
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Update failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (name: string): Promise<ActionResult> => {
    try {
      setIsLoading(true);
      const data = await requestJSON('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      }, token);

      const nextUser: User = {
        ...mapUser(data.user),
      };
      setUser(nextUser);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return { success: true, message: data.message || 'Profile updated' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Profile update failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<ActionResult> => {
    try {
      setIsLoading(true);
      const data = await requestJSON('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }, token);
      return { success: true, message: data.message || 'Password changed successfully' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Password change failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      isLoggedIn,
      isLoading,
      user,
      reports,
      login,
      logout,
      register,
      addReport,
      updateReportStatus,
      updateProfile,
      changePassword,
      refreshReports,
      reconnectNow,
      realtime: {
        mode: realtimeMode,
        reconnectCount,
        lastEventAt,
      },
    }),
    [isLoggedIn, isLoading, user, reports, realtimeMode, reconnectCount, lastEventAt, refreshReports, reconnectNow]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
