import Image from "next/image";
import {
  formatPeriod,
  PROJECT_TYPE_LABELS,
  RESEARCH_KIND_LABELS,
  type ProjectDetailDTO,
} from "@portfolio/shared";
import { Blocks, numberFigures } from "@/components/content/blocks";
import { CaseStudyNav } from "@/components/projects/case-study-nav";
import { ProjectRow } from "@/components/projects/project-row";
import { MetaTable } from "@/components/site/meta-table";
import { PageHeader } from "@/components/site/page-header";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";

/** The case-study layout, shared by the public page and the admin preview. */
export function ProjectArticle({
  project,
  preview = false,
}: {
  project: ProjectDetailDTO;
  preview?: boolean;
}) {
  const figureNumbers = numberFigures(project.sections.map((section) => section.blocks));
  const period = formatPeriod(project.startedOn, project.completedOn);
  const links = [
    project.links.github ? { label: "Code on GitHub", href: project.links.github } : null,
    project.links.demo ? { label: "Live demo", href: project.links.demo } : null,
    project.links.docs ? { label: "Documentation", href: project.links.docs } : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const hasNav = project.sections.length > 2;

  return (
    <article>
      <PageHeader
        breadcrumbs={[{ name: "Projects", href: "/projects" }, { name: project.title }]}
        eyebrow={[PROJECT_TYPE_LABELS[project.type], project.category?.name, project.year]
          .filter(Boolean)
          .join(" · ")}
        title={project.title}
        lead={project.summary}
      >
        <MetaTable
          className="mt-4"
          items={[
            { label: "Role", value: project.role },
            { label: "Organisation", value: project.organization },
            { label: "Period", value: period || null },
            {
              label: "Links",
              value: links.length ? (
                <span className="flex flex-col gap-1">
                  {links.map((link) => (
                    <TextLink key={link.href} href={link.href}>
                      {link.label}
                    </TextLink>
                  ))}
                </span>
              ) : null,
            },
          ]}
        />
        {project.technologies.length || project.tags.length ? (
          <div className="mt-5 space-y-2">
            <TagList
              items={project.technologies}
              label="Technologies"
              hrefFor={preview ? undefined : (tech) => `/projects?tech=${encodeURIComponent(tech)}`}
            />
            <TagList items={project.tags.map((tag) => tag.name)} label="Tags" />
          </div>
        ) : null}
      </PageHeader>

      {project.cover && project.cover.width && project.cover.height ? (
        <figure className="container-page">
          <Image
            src={project.cover.url}
            alt={project.cover.alt}
            width={project.cover.width}
            height={project.cover.height}
            sizes="(min-width: 1280px) 1280px, 100vw"
            preload
            className="h-auto w-full rounded-xs border border-rule bg-muted"
          />
          {project.cover.caption ? (
            <figcaption className="mt-2 text-sm text-ink-3">{project.cover.caption}</figcaption>
          ) : null}
        </figure>
      ) : null}

      {project.metrics.length ? (
        <section aria-label="Headline results" className="container-page mt-10">
          <dl className="grid grid-cols-2 border-y-2 border-ink sm:grid-cols-4">
            {project.metrics.map((metric) => (
              <div
                key={metric.label}
                className="border-rule py-5 pr-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-4"
              >
                <dt className="label">{metric.label}</dt>
                <dd className="mt-1 font-serif text-3xl tabular-nums text-ink">
                  {metric.value}
                  {metric.unit ? (
                    <span className="ml-1 text-lg text-ink-2">{metric.unit}</span>
                  ) : null}
                </dd>
                {metric.context ? (
                  <dd className="mt-1 text-sm text-ink-3">{metric.context}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="container-page mt-12">
        <div className="grid-editorial gap-y-10">
          {hasNav ? (
            <aside className="col-span-4 hidden sm:col-span-8 lg:col-span-3 lg:block">
              <CaseStudyNav sections={project.sections.map(({ key, label }) => ({ key, label }))} />
            </aside>
          ) : null}
          <div
            className={
              hasNav
                ? "col-span-4 space-y-16 sm:col-span-8 lg:col-span-9"
                : "col-span-4 space-y-16 sm:col-span-8 lg:col-span-9 lg:col-start-4"
            }
          >
            {hasNav ? (
              <details className="border-y border-rule py-3 lg:hidden">
                <summary className="flex min-h-11 cursor-pointer items-center label">
                  Contents
                </summary>
                <ol className="mt-2 space-y-1 pb-2">
                  {project.sections.map((section, index) => (
                    <li key={section.key}>
                      <a
                        href={`#${section.key}`}
                        className="flex min-h-11 items-center gap-3 text-ink-2 hover:text-ink"
                      >
                        <span className="font-mono text-xs">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
            {project.sections.map((section, index) => (
              <section
                key={section.key}
                id={section.key}
                aria-labelledby={`${section.key}-title`}
                className="scroll-mt-(--sticky-offset)"
              >
                <h2
                  id={`${section.key}-title`}
                  className="mb-6 flex items-baseline gap-4 text-3xl text-ink"
                >
                  <span className="font-mono text-sm text-ink-3 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.label}
                </h2>
                <Blocks
                  blocks={section.blocks}
                  media={project.media}
                  figureNumbers={figureNumbers}
                  headingBase={3}
                />
              </section>
            ))}

            {project.gallery.length ? (
              <section aria-labelledby="gallery-title">
                <h2 id="gallery-title" className="mb-6 text-3xl text-ink">
                  Gallery
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {project.gallery.map((item) => (
                    <li key={item.media.id}>
                      <figure>
                        {item.media.width && item.media.height ? (
                          <Image
                            src={item.media.url}
                            alt={item.media.alt}
                            width={item.media.width}
                            height={item.media.height}
                            sizes="(min-width: 640px) 50vw, 100vw"
                            className="h-auto w-full rounded-xs border border-rule bg-muted"
                          />
                        ) : null}
                        {(item.caption ?? item.media.caption) ? (
                          <figcaption className="mt-2 text-sm text-ink-3">
                            {item.caption ?? item.media.caption}
                          </figcaption>
                        ) : null}
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {project.relatedResearch.length ||
            project.relatedPublications.length ||
            project.repositories.length ||
            project.experiences.length ? (
              <section aria-labelledby="context-title" className="border-t-2 border-ink pt-6">
                <h2 id="context-title" className="label mb-4">
                  Context and outputs
                </h2>
                <dl className="grid gap-6 sm:grid-cols-2">
                  {project.relatedResearch.length ? (
                    <div>
                      <dt className="text-sm font-medium text-ink">Research</dt>
                      {project.relatedResearch.map((item) => (
                        <dd key={item.slug} className="mt-1">
                          <TextLink href={`/research/${item.slug}`}>{item.title}</TextLink>
                          <span className="ml-2 font-mono text-xs text-ink-3">
                            {RESEARCH_KIND_LABELS[item.kind]}
                          </span>
                        </dd>
                      ))}
                    </div>
                  ) : null}
                  {project.relatedPublications.length ? (
                    <div>
                      <dt className="text-sm font-medium text-ink">Publications</dt>
                      {project.relatedPublications.map((item) => (
                        <dd key={item.slug} className="mt-1">
                          <TextLink href={`/publications#${item.slug}`}>{item.title}</TextLink>
                          {item.venue ? (
                            <span className="block text-sm text-ink-3">{item.venue}</span>
                          ) : null}
                        </dd>
                      ))}
                    </div>
                  ) : null}
                  {project.experiences.length ? (
                    <div>
                      <dt className="text-sm font-medium text-ink">Done as part of</dt>
                      {project.experiences.map((item) => (
                        <dd key={`${item.company}-${item.position}`} className="mt-1 text-ink-2">
                          {item.position}, {item.company}
                        </dd>
                      ))}
                    </div>
                  ) : null}
                  {project.repositories.length ? (
                    <div>
                      <dt className="text-sm font-medium text-ink">Code</dt>
                      {project.repositories.map((repo) => (
                        <dd key={repo.id} className="mt-1">
                          <TextLink href={repo.url}>{repo.fullName}</TextLink>
                          {repo.description ? (
                            <span className="block text-sm text-ink-3">{repo.description}</span>
                          ) : null}
                        </dd>
                      ))}
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {project.relatedProjects.length && !preview ? (
        <section aria-labelledby="related-title" className="container-page section-space pb-0">
          <h2 id="related-title" className="label mb-2">
            Related projects
          </h2>
          <div className="border-b border-rule">
            {project.relatedProjects.map((item) => (
              <ProjectRow key={item.id} project={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
