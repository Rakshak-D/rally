"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icons";
import type { ActionState } from "@/lib/forms/state";

export type ToastAction = {
  label: string;
  run: () => void | string | Promise<void | string>;
};

type ToastDetail = {
  message: string;
  action?: ToastAction;
};

type ToastItem = ToastDetail & { id: number };

export function showToast(message: string, action?: ToastAction): void {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(new CustomEvent<ToastDetail>("rally:toast", { detail: { message, action } }));
}

export function useActionToast(state: ActionState, action?: ToastAction): void {
  useEffect(() => {
    if (state.kind === "success" && state.message) showToast(state.message, action);
  }, [action, state.kind, state.message]);
}

export function ToastViewport() {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const idRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const next = { ...detail, id: ++idRef.current };
      setToast(next);
      timerRef.current = window.setTimeout(() => setToast(null), 4_000);
    }

    window.addEventListener("rally:toast", onToast);
    return () => {
      window.removeEventListener("rally:toast", onToast);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function pauseTimer() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function resumeTimer() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 4_000);
  }

  function dismiss() {
    pauseTimer();
    setToast(null);
  }

  async function runAction(action: ToastAction) {
    pauseTimer();
    setActionPending(true);
    try {
      const message = await action.run();
      dismiss();
      if (typeof message === "string" && message) showToast(message);
    } catch (error) {
      dismiss();
      showToast(error instanceof Error ? error.message : "That action could not be completed.");
    } finally {
      setActionPending(false);
    }
  }

  if (!toast) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      <div
        className="toast-card"
        key={toast.id}
        role="status"
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
        onFocus={pauseTimer}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) resumeTimer(); }}
      >
        <span className="toast-copy">{toast.message}</span>
        {toast.action && <button className="toast-action" type="button" disabled={actionPending} onClick={() => { if (toast.action) void runAction(toast.action); }}>{actionPending ? "Working…" : toast.action.label}</button>}
        <button className="toast-dismiss" type="button" aria-label="Dismiss notification" onClick={dismiss}><Icon name="close" size={16} /></button>
      </div>
    </div>
  );
}
