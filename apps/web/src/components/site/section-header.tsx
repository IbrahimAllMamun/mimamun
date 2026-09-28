import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Numbered section heading with a margin label, in the "working paper" style:
 *   02 — Selected work        Title
 *   n = 4                     Description
 */
export function SectionHeader({
  index,
  label,
  title,
  description,
  count,
  action,
  id,
  headingLevel = 2,
  className,
}: {
  index?: string;
  label: string;
  title: ReactNode;
  description?: ReactNode;
  count?: string | null;
  action?: ReactNode;
  id?: string;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={cn("grid-editorial reveal gap-y-3 border-t border-rule pt-5", className)}>
      <div className="col-span-4 sm:col-span-8 lg:col-span-3">
        <p className="label">
          {index ? <span className="text-ink-2">{index} — </span> : null}
          {label}
        </p>
        {count ? (
          <p className="label mt-1 hidden font-normal normal-case lg:block">{count}</p>
        ) : null}
      </div>
      <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-9">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <Heading id={id} className="max-w-3xl text-3xl text-ink">
            {title}
          </Heading>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {description ? <div className="max-w-2xl text-lg text-ink-2">{description}</div> : null}
      </div>
    </div>
  );
}
