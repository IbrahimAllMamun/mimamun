"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  message: string;
}
interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<Tone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  error: { icon: CircleAlert, className: "text-error" },
  info: { icon: Info, className: "text-info" },
};

/**
 * Transient confirmations ("Saved", "Deleted"). Messages are announced by a
 * polite live region; errors stay longer. Anything the user must act on is
 * shown inline instead.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4000);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-sm border border-rule bg-elevated px-4 py-3 text-sm text-ink shadow-popover"
          >
            <Icon icon={TONES[toast.tone].icon} size={18} className={cn("mt-0.5 shrink-0", TONES[toast.tone].className)} />
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} className="-m-1 rounded-xs p-1 text-ink-3 hover:text-ink" aria-label="Dismiss">
              <Icon icon={X} size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
