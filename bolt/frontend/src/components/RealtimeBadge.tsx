import { useEffect, useMemo, useRef, useState } from 'react';
import { Wifi, WifiOff, Loader2, RotateCcw, ChevronDown, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { publishToast } from '../lib/toast';

export function RealtimeBadge() {
  const { isLoggedIn, realtime, reconnectNow } = useApp();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [now, setNow] = useState(Date.now());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const reconnectBtnRef = useRef<HTMLButtonElement | null>(null);
  const copyBtnRef = useRef<HTMLButtonElement | null>(null);

  const isLive = realtime.mode === 'live';
  const isConnecting = realtime.mode === 'connecting';
  const label = isLive ? 'Live' : isConnecting ? 'Connecting' : realtime.mode === 'polling' ? 'Polling' : 'Idle';
  const lastEventLabel = useMemo(() => {
    if (!realtime.lastEventAt) return 'No events yet';
    return new Date(realtime.lastEventAt).toLocaleString();
  }, [realtime.lastEventAt]);
  const lastSyncAge = useMemo(() => {
    if (!realtime.lastEventAt) return 'No sync yet';
    const diffMs = Math.max(0, now - new Date(realtime.lastEventAt).getTime());
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  }, [now, realtime.lastEventAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let closeTimer: number | null = null;
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setEntered(true));
    } else {
      setEntered(false);
      closeTimer = window.setTimeout(() => setMounted(false), 180);
    }
    return () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;

    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      const focusables = [reconnectBtnRef.current, copyBtnRef.current].filter(Boolean) as HTMLButtonElement[];
      if (focusables.length === 0) return;

      if (event.key === 'Tab') {
        const activeIndex = focusables.findIndex((el) => el === document.activeElement);
        if (event.shiftKey && activeIndex === 0) {
          event.preventDefault();
          focusables[focusables.length - 1].focus();
        } else if (!event.shiftKey && activeIndex === focusables.length - 1) {
          event.preventDefault();
          focusables[0].focus();
        }
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const activeIndex = focusables.findIndex((el) => el === document.activeElement);
        if (event.key === 'Home') {
          focusables[0].focus();
          return;
        }
        if (event.key === 'End') {
          focusables[focusables.length - 1].focus();
          return;
        }
        if (activeIndex < 0) {
          focusables[0].focus();
          return;
        }
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = (activeIndex + delta + focusables.length) % focusables.length;
        focusables[nextIndex].focus();
      }
    };

    reconnectBtnRef.current?.focus();
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, mounted]);

  const handleCopyDiagnostics = async () => {
    const message = [
      `mode=${label}`,
      `reconnects=${realtime.reconnectCount}`,
      `last_event=${realtime.lastEventAt ?? 'none'}`,
      `last_sync_age=${lastSyncAge}`,
    ].join(' | ');
    try {
      await navigator.clipboard.writeText(message);
      publishToast({ message: 'Diagnostics copied to clipboard', tone: 'success' });
    } catch {
      publishToast({ message: 'Unable to copy diagnostics', tone: 'error' });
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          isLive
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : isConnecting
            ? 'border-sky-200 bg-sky-50 text-sky-700'
            : realtime.mode === 'idle'
            ? 'border-slate-200 bg-slate-50 text-slate-600'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}
        title={
          realtime.lastEventAt
            ? `Realtime: ${label}. Last event: ${new Date(realtime.lastEventAt).toLocaleTimeString()}. Reconnects: ${realtime.reconnectCount}`
            : `Realtime: ${label}. Reconnects: ${realtime.reconnectCount}`
        }
        aria-label={`Realtime mode ${label}`}
        aria-expanded={open}
        aria-controls="realtime-diagnostics-popover"
      >
        {isLive ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : isConnecting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {mounted && (
        <div
          id="realtime-diagnostics-popover"
          ref={panelRef}
          role="dialog"
          aria-label="Realtime diagnostics"
          className={`absolute right-0 top-10 z-40 w-64 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur transition-all duration-200 ${
            entered ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Realtime Diagnostics</p>
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Mode</dt>
              <dd className="font-semibold text-slate-800">{label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Reconnects</dt>
              <dd className="font-semibold text-slate-800">{realtime.reconnectCount}</dd>
            </div>
            <div className="pt-1">
              <dt className="text-slate-500">Last event</dt>
              <dd className="mt-0.5 text-slate-700">{lastEventLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Last sync age</dt>
              <dd className="font-semibold text-slate-800">{lastSyncAge}</dd>
            </div>
          </dl>
          <button
            ref={reconnectBtnRef}
            type="button"
            onClick={() => {
              reconnectNow();
              publishToast({ message: 'Reconnecting realtime stream...', tone: 'info' });
              setOpen(false);
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reconnect now
          </button>
          <button
            ref={copyBtnRef}
            type="button"
            onClick={handleCopyDiagnostics}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy diagnostics
          </button>
        </div>
      )}
    </div>
  );
}
