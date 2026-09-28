"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Modal dialog on the native <dialog> element: focus is trapped, Escape
 * closes it, the page behind is inert and focus returns to the opener.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "dialog-panel dialog-frame m-auto flex-col overflow-hidden rounded-md open:flex border border-rule bg-paper p-0 text-ink shadow-dialog backdrop:bg-scrim",
        size === "sm" && "max-w-md",
        size === "md" && "max-w-xl",
        size === "lg" && "max-w-3xl",
        size === "xl" && "max-w-5xl",
      )}
    >
      {open ? (
        <>
          <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
            <div className="space-y-1">
              <h2 id={titleId} className="font-serif text-xl text-ink">
                {title}
              </h2>
              {description ? <div className="text-sm text-ink-2">{description}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-m-1 rounded-sm p-2 text-ink-3 hover:bg-muted hover:text-ink"
              aria-label="Close"
            >
              <Icon icon={X} size={18} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-rule px-5 py-3">
              {footer}
            </footer>
          ) : null}
        </>
      ) : null}
    </dialog>
  );
}

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: "default" | "danger";
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** `await confirm({...})` resolves true when the user confirms. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  );
  const settle = (value: boolean) => {
    request?.resolve(value);
    setRequest(null);
  };
  return (
    <ConfirmContext value={confirm}>
      {children}
      <Dialog
        open={request !== null}
        onClose={() => settle(false)}
        title={request?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              Cancel
            </Button>
            <Button
              variant={request?.tone === "danger" ? "danger" : "primary"}
              onClick={() => settle(true)}
              autoFocus
            >
              {request?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        {request?.body ? <div className="text-ink-2">{request.body}</div> : null}
      </Dialog>
    </ConfirmContext>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
