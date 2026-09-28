import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/** Designed empty state: says what is missing and, where useful, what to do next. */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-y border-rule py-10", className)}>
      <div className="flex max-w-narrow gap-4">
        <Icon icon={Inbox} size={20} className="mt-1 shrink-0 text-ink-3" />
        <div className="space-y-2">
          <p className="font-serif text-xl text-ink">{title}</p>
          {children ? <div className="text-ink-2">{children}</div> : null}
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Shown when content could not be loaded (API unreachable, integration down…). */
export function UnavailableNotice({
  title = "This section is temporarily unavailable",
  children,
  className,
}: {
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={cn("flex gap-3 rounded-sm border border-warning/40 bg-warning-tint px-4 py-3 text-sm", className)}>
      <Icon icon={CircleAlert} size={18} className="mt-0.5 shrink-0 text-warning" />
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="text-ink-2">{children ?? "Please try again in a few minutes."}</p>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse-soft rounded-xs bg-muted", className)} />;
}
