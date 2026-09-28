import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PROJECT_TYPE_LABELS, type ProjectSummaryDTO } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

function metaLine(project: ProjectSummaryDTO): string {
  return [PROJECT_TYPE_LABELS[project.type], project.category?.name, project.organization, project.year]
    .filter(Boolean)
    .join(" · ");
}

/** One entry of the project index: an editorial row, not a card. */
export function ProjectRow({
  project,
  index,
  headingLevel = 3,
  className,
}: {
  project: ProjectSummaryDTO;
  index?: number;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className={cn("group relative border-t border-rule transition-colors duration-(--duration-fast) hover:bg-surface", className)}>
      <div className="grid-editorial gap-y-2 py-6">
        <div className="col-span-4 sm:col-span-1 lg:col-span-1">
          {index !== undefined ? <span className="font-mono text-sm text-ink-3 tabular-nums">{String(index + 1).padStart(2, "0")}</span> : null}
        </div>
        <div className="col-span-4 space-y-2 sm:col-span-7 lg:col-span-8">
          <p className="label">{metaLine(project)}</p>
          <Heading className="text-2xl text-ink">
            <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              <span className="decoration-1 underline-offset-4 group-hover:underline group-focus-within:underline">{project.title}</span>
            </Link>
          </Heading>
          <p className="max-w-2xl text-ink-2">{project.summary}</p>
          {project.tags.length || project.technologies.length ? (
            <p className="font-mono text-xs text-ink-3">
              {[...project.technologies, ...project.tags.map((tag) => tag.name)].slice(0, 6).join("  ·  ")}
            </p>
          ) : null}
        </div>
        <div className="col-span-4 hidden items-start justify-end sm:col-span-8 lg:col-span-3 lg:flex">
          <span className="inline-flex items-center gap-1.5 text-sm text-primary opacity-70 transition-[opacity,transform] duration-(--duration-base) ease-out group-hover:translate-x-1 group-hover:opacity-100">
            {project.sectionCount > 1 ? "Case study" : "Overview"}
            <Icon icon={ArrowRight} size={14} />
          </span>
        </div>
      </div>
    </article>
  );
}
