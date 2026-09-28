"use client";

import Link from "next/link";
import { ChevronRight, CircleAlert, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import type { ApiErrorBody } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/cn";

export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6 space-y-3">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-3">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <Icon icon={ChevronRight} size={14} /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-ink hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink-2">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="font-serif text-3xl leading-tight text-ink">{title}</h1>
          {description ? <div className="max-w-2xl text-ink-2">{description}</div> : null}
          {meta ? <div className="pt-1 text-sm text-ink-3">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-md border border-rule bg-elevated", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-3">
          <div className="space-y-0.5">
            {title ? <h2 className="text-base font-medium text-ink">{title}</h2> : null}
            {description ? <p className="text-sm text-ink-3">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

/** Shown when a request failed: what happened, and a retry. */
export function ErrorPanel({ error, onRetry }: { error: ApiErrorBody | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-md border border-error/40 bg-error-tint px-4 py-3 text-sm">
      <Icon icon={CircleAlert} size={18} className="mt-0.5 shrink-0 text-error" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-ink">{error?.code === "FORBIDDEN" ? "You do not have access to this" : "This could not be loaded"}</p>
        <p className="text-ink-2">{error?.message ?? "Please try again."}</p>
      </div>
      {onRetry && error?.code !== "FORBIDDEN" ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <Icon icon={RefreshCw} size={14} /> Retry
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function EmptyPanel({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-rule-strong px-6 py-10 text-center">
      <p className="font-serif text-xl text-ink">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm text-ink-2">{children}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** "3 minutes ago", "yesterday", or a date for anything older than a week. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return "just now";
  if (Math.abs(seconds) < 3600) return format.format(-Math.round(seconds / 60), "minute");
  if (Math.abs(seconds) < 86_400) return format.format(-Math.round(seconds / 3600), "hour");
  if (Math.abs(seconds) < 7 * 86_400) return format.format(-Math.round(seconds / 86_400), "day");
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
