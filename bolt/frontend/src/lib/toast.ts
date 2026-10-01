export type ToastTone = 'success' | 'error' | 'info';

export interface ToastPayload {
  id?: string;
  message: string;
  tone?: ToastTone;
}

const TOAST_EVENT = 'tv:toast';

export function publishToast(payload: ToastPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: payload }));
}

export function toastEventName() {
  return TOAST_EVENT;
}
