import {
  EMPLOYMENT_TYPE_LABELS,
  experienceAnchor,
  formatDuration,
  formatPeriod,
  monthsBetween,
  PROJECT_TYPE_LABELS,
  type ExperienceDTO,
} from "@portfolio/shared";
import { StatusBadge } from "@/components/ui/status";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/cn";

function RuleList({
  items,
  label,
  tone = "neutral",
}: {
  items: string[];
  label: string;
  tone?: "neutral" | "accent";
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="label">{label}</h4>
      <ul className="max-w-measure space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-ink-2">
            <span
              aria-hidden
              className={cn(
                "mt-3 h-px w-3 shrink-0",
                tone === "accent" ? "bg-accent-mark" : "bg-ink-3",
              )}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One role on the experience timeline. The margin column carries the period
 * and a current-role marker; the body lists only what is stored — an empty
 * field is omitted rather than filled with generic copy.
 */
export function RoleEntry({ role, now = new Date() }: { role: ExperienceDTO; now?: Date }) {
  const period = formatPeriod(role.startDate, role.endDate, role.isCurrent);
  const end = role.isCurrent ? now : role.endDate;
  const duration = role.startDate && end ? formatDuration(monthsBetween(role.startDate, end)) : "";
  const context = [
    role.department,
    role.employmentType ? EMPLOYMENT_TYPE_LABELS[role.employmentType] : null,
    role.location,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      id={experienceAnchor(role)}
      aria-labelledby={`${experienceAnchor(role)}-title`}
      className="grid-editorial scroll-mt-(--sticky-offset) gap-y-4 border-t border-rule py-8"
    >
      <div className="col-span-4 space-y-2 sm:col-span-8 lg:col-span-3">
        <p className="label flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "size-2.5 rotate-45",
              role.isCurrent ? "bg-primary" : "border border-ink-3 bg-transparent",
            )}
          />
          {period}
        </p>
        {duration ? <p className="font-mono text-xs text-ink-3 tabular-nums">{duration}</p> : null}
        {role.isCurrent ? <StatusBadge tone="positive">Current role</StatusBadge> : null}
      </div>

      <div className="col-span-4 space-y-6 sm:col-span-8 lg:col-span-9">
        <header className="space-y-1">
          <h3
            id={`${experienceAnchor(role)}-title`}
            className="font-serif text-2xl leading-snug text-ink"
          >
            {role.position}
            <span className="text-ink-3">, </span>
            {role.companyUrl ? (
              <TextLink href={role.companyUrl}>{role.company}</TextLink>
            ) : (
              role.company
            )}
          </h3>
          {context ? <p className="text-ink-2">{context}</p> : null}
        </header>

        {role.summary ? <p className="max-w-measure text-lg text-ink-2">{role.summary}</p> : null}

        <RuleList items={role.responsibilities} label="Work" />
        <RuleList items={role.achievements} label="Results" tone="accent" />

        {role.metrics.length ? (
          <dl className="grid grid-cols-2 border-y border-rule sm:grid-cols-3">
            {role.metrics.map((metric) => (
              <div
                key={metric.label}
                className="border-rule py-4 pr-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-4"
              >
                <dt className="label">{metric.label}</dt>
                <dd className="mt-1 font-serif text-2xl text-ink tabular-nums">
                  {metric.value}
                  {metric.unit ? (
                    <span className="ml-1 text-base text-ink-2">{metric.unit}</span>
                  ) : null}
                </dd>
                {metric.context ? (
                  <dd className="mt-1 text-sm text-ink-3">{metric.context}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        ) : null}

        {role.technologies.length || role.domains.length ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-10">
            {role.technologies.length ? (
              <div className="space-y-2">
                <h4 className="label">Tools</h4>
                <TagList items={role.technologies} label="Tools" />
              </div>
            ) : null}
            {role.domains.length ? (
              <div className="space-y-2">
                <h4 className="label">Domains</h4>
                <TagList items={role.domains} label="Domains" />
              </div>
            ) : null}
          </div>
        ) : null}

        {role.relatedProjects.length ? (
          <div className="space-y-2">
            <h4 className="label">Projects from this role</h4>
            <ul className="space-y-1">
              {role.relatedProjects.map((project) => (
                <li key={project.slug} className="flex flex-wrap items-baseline gap-x-3">
                  <TextLink href={`/projects/${project.slug}`} arrow>
                    {project.title}
                  </TextLink>
                  <span className="font-mono text-xs text-ink-3">
                    {PROJECT_TYPE_LABELS[project.type]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
