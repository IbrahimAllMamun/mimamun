import Link from "next/link";
import { formatPeriod, parseDate, type TrajectoryItemDTO } from "@portfolio/shared";
import { cn } from "@/lib/cn";

const KIND_STYLE: Record<TrajectoryItemDTO["kind"], { bar: string; label: string }> = {
  education: { bar: "bg-secondary", label: "Education" },
  experience: { bar: "bg-primary", label: "Role" },
  presentation: { bar: "bg-accent-mark", label: "Presentation" },
  publication: { bar: "bg-secondary", label: "Publication" },
};

function months(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

/**
 * Fig. — the trajectory: education, roles and presentations on one time axis,
 * drawn only from stored dates. Items without a start date are drawn as a
 * dashed stub ending at their end date and labelled accordingly.
 */
export function Trajectory({
  items,
  figureNumber,
  now = new Date(),
}: {
  items: TrajectoryItemDTO[];
  figureNumber?: number;
  now?: Date;
}) {
  const dated = items.filter((item) => item.start || item.end);
  if (dated.length === 0) return null;
  const allDates = dated.flatMap((item) => [parseDate(item.start), parseDate(item.end)]).filter((date): date is Date => Boolean(date));
  const firstYear = Math.min(...allDates.map((date) => date.getUTCFullYear()));
  const lastYear = Math.max(now.getUTCFullYear(), ...allDates.map((date) => date.getUTCFullYear()));
  const axisStart = firstYear * 12;
  const axisEnd = (lastYear + 1) * 12;
  const span = axisEnd - axisStart;
  const position = (date: Date) => ((months(date) - axisStart) / span) * 100;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const nowPosition = position(now);

  return (
    <figure className="space-y-4">
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {figureNumber ? <span className="label">Fig. {figureNumber}</span> : null}
        <span className="font-serif text-lg text-ink">
          Trajectory, {firstYear}–{lastYear}
        </span>
        <span className="text-sm text-ink-3">Education, roles and presentations on one time axis.</span>
      </figcaption>

      <div className="relative">
        {/* Year axis */}
        <div className="grid-editorial" aria-hidden>
          <div className="col-span-4 sm:col-span-8 lg:col-span-8 lg:col-start-5">
            <div className="relative h-6 border-b border-ink">
              {years.map((year, index) => (
                <span
                  key={year}
                  className={cn("absolute bottom-1 -translate-x-1/2 font-mono text-xs text-ink-3", index % 2 === 1 && "hidden sm:inline")}
                  style={{ left: `${((year * 12 - axisStart + 6) / span) * 100}%` }}
                >
                  {year}
                </span>
              ))}
              <span
                className="absolute -bottom-5 -translate-x-1/2 font-mono text-xs text-accent"
                style={{ left: `${nowPosition}%` }}
              >
                now
              </span>
            </div>
          </div>
        </div>

        <ol className="mt-5 divide-y divide-rule">
          {dated.map((item, index) => {
            const start = parseDate(item.start);
            const end = item.isCurrent ? now : parseDate(item.end);
            const style = KIND_STYLE[item.kind];
            const isPoint = start && end && months(start) === months(end) && !item.isCurrent;
            const period = formatPeriod(item.start, item.end, item.isCurrent);
            let bar: { left: number; width: number; dashed: boolean } | null = null;
            if (start && end && !isPoint) {
              bar = { left: position(start), width: Math.max(0.8, position(end) - position(start) + 100 / span), dashed: false };
            } else if (!start && end) {
              const width = 6;
              bar = { left: Math.max(0, position(end) - width), width, dashed: true };
            }
            const pointAt = isPoint && start ? position(start) : null;
            const label = (
              <>
                <span className="block font-mono text-xs text-ink-3">
                  {style.label} · {period}
                  {!start && end ? " · start date not recorded" : ""}
                </span>
                <span className="block text-sm font-medium text-ink">{item.label}</span>
                {item.sublabel ? <span className="block text-sm text-ink-2">{item.sublabel}</span> : null}
              </>
            );
            return (
              <li key={item.id} className="grid-editorial items-center gap-y-2 py-3">
                <div className="col-span-4 sm:col-span-8 lg:col-span-4">
                  {item.href ? (
                    <Link href={item.href} className="group block hover:[&_span.font-medium]:underline">
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </div>
                <div className="col-span-4 sm:col-span-8 lg:col-span-8" aria-hidden>
                  <div className="relative h-4">
                    {years.map((year) => (
                      <span
                        key={year}
                        className="absolute inset-y-0 w-px bg-rule"
                        style={{ left: `${((year * 12 - axisStart) / span) * 100}%` }}
                      />
                    ))}
                    <span
                      className="absolute inset-y-0 border-l border-dashed border-accent-mark"
                      style={{ left: `${nowPosition}%` }}
                    />
                    {bar ? (
                      <span
                        className={cn(
                          "reveal-bar absolute inset-y-1 rounded-xs",
                          bar.dashed ? "border border-dashed border-rule-strong bg-transparent" : style.bar,
                          item.isCurrent && "rounded-r-none",
                        )}
                        style={{ left: `${bar.left}%`, width: `${bar.width}%`, animationDelay: `${Math.min(index, 6) * 60}ms` }}
                      />
                    ) : null}
                    {item.isCurrent && bar ? (
                      <span
                        className="absolute inset-y-0 w-0.5 bg-primary"
                        style={{ left: `calc(${bar.left + bar.width}% - 1px)` }}
                      />
                    ) : null}
                    {pointAt !== null ? (
                      <span
                        className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45", style.bar)}
                        style={{ left: `${pointAt + 100 / span / 2}%` }}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-sm text-ink-3">
        Bars show periods; diamonds mark single events; dashed stubs mark roles whose start date is not recorded.
      </p>
    </figure>
  );
}
