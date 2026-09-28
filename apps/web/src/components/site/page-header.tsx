import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { stagger } from "@/lib/style";

/** Title block for top-level and detail pages. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  breadcrumbs,
  aside,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  breadcrumbs?: Crumb[];
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="container-page pt-10 pb-10 sm:pt-14 lg:pt-20">
      <div className="grid-editorial gap-y-6">
        <div className="col-span-4 space-y-4 sm:col-span-8 lg:col-span-3">
          {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
          {eyebrow ? <div className="label motion-enter">{eyebrow}</div> : null}
        </div>
        <div className="col-span-4 space-y-5 sm:col-span-8 lg:col-span-9">
          <h1 className="display motion-enter max-w-4xl text-4xl text-ink" style={stagger(1)}>
            {title}
          </h1>
          {lead ? (
            <div
              className="motion-enter max-w-2xl font-serif text-xl text-ink-2"
              style={stagger(2)}
            >
              {lead}
            </div>
          ) : null}
          {children ? (
            <div className="motion-enter" style={stagger(3)}>
              {children}
            </div>
          ) : null}
        </div>
        {aside ? <div className="col-span-4 sm:col-span-8 lg:col-span-12">{aside}</div> : null}
      </div>
    </header>
  );
}
