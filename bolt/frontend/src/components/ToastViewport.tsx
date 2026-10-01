import { useEffect, useState } from 'react';
import { toastEventName, type ToastPayload } from '../lib/toast';

type ToastItem = Required<Pick<ToastPayload, 'message'>> & { id: string; tone: 'success' | 'error' | 'info' };

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ToastPayload>;
      const payload = custom.detail;
      if (!payload?.message) return;

      const item: ToastItem = {
        id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: payload.message,
        tone: payload.tone || 'info',
      };
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 2500);
    };

    window.addEventListener(toastEventName(), handler);
    return () => window.removeEventListener(toastEventName(), handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-[70] space-y-2 w-[min(92vw,360px)]" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-card rounded-xl px-4 py-3 text-sm shadow-lg border ${
            toast.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.tone === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-cyan-50 border-cyan-200 text-cyan-800'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
