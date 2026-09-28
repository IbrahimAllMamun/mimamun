import Image from "next/image";
import { FileDown } from "lucide-react";
import { formatPeriod, PROJECT_TYPE_LABELS, RESEARCH_KIND_LABELS, type ResearchDetailDTO } from "@portfolio/shared";
import { Blocks, numberFigures } from "@/components/content/blocks";
import { PublicationEntry } from "@/components/research/publication-entry";
import { PresentationLine, PresentationLinks } from "@/components/research/research-entry";
import { MetaTable } from "@/components/site/meta-table";
import { PageHeader } from "@/components/site/page-header";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/cn";

function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Academic layout for theses and research projects, shared by the public page
 * and the admin preview: title block and metadata, keywords in the margin,
 * abstract, research question, numbered sections, then back matter (where it
 * was presented, publications, related projects and a copyable citation).
 */
export function ResearchArticle({
  research,
  owner,
  preview = false,
}: {
  research: ResearchDetailDTO;
  /** The site owner's name, emphasised in author lists. */
  owner: string;
  preview?: boolean;
}) {
  const figureNumbers = numberFigures(research.sections.map((section) => section.blocks));
  const kind = RESEARCH_KIND_LABELS[research.kind];
  const degree = research.education?.degree ?? research.degree?.split(/\s+in\s+/i)[0] ?? null;
  const eyebrow = [degree ? `${degree} ${kind.toLowerCase()}` : kind, research.year].filter(Boolean).join(" · ");
  const period = formatPeriod(research.startedOn, research.completedOn);
  const downloads = [
    research.pdf ? { label: "Full text (PDF)", href: research.pdf.url } : null,
    research.poster ? { label: "Poster", href: research.poster.url } : null,
    research.slides ? { label: "Slides", href: research.slides.url } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));
  const hasMargin = research.keywords.length > 0 || research.methods.length > 0 || downloads.length > 0 || Boolean(research.externalUrl);

  return (
    <article>
      <PageHeader
        breadcrumbs={[{ name: "Research", href: "/research" }, { name: research.title }]}
        eyebrow={<span className="text-secondary">{eyebrow}</span>}
        title={research.title}
        lead={research.summary}
      >
        <MetaTable
          className="mt-4"
          items={[
            { label: research.authors.length > 1 ? "Authors" : "Author", value: research.authors.join(", ") },
            { label: "Programme", value: research.degree },
            { label: "Institution", value: research.institution },
            { label: "Supervisor", value: research.supervisor },
            { label: period ? "Period" : "Year", value: period || (research.year ? String(research.year) : null) },
          ]}
        />
      </PageHeader>

      {research.cover && research.cover.width && research.cover.height ? (
        <figure className="container-page mb-12">
          <Image
            src={research.cover.url}
            alt={research.cover.alt}
            width={research.cover.width}
            height={research.cover.height}
            sizes="(min-width: 1280px) 1280px, 100vw"
            preload
            className="h-auto w-full rounded-xs border border-rule bg-muted"
          />
          {research.cover.caption ? <figcaption className="mt-2 text-sm text-ink-3">{research.cover.caption}</figcaption> : null}
        </figure>
      ) : null}

      <div className="container-page">
        <div className="grid-editorial gap-y-10">
          {hasMargin ? (
            <aside aria-label="Keywords and files" className="col-span-4 space-y-6 sm:col-span-8 lg:col-span-3">
              {research.keywords.length ? (
                <div className="space-y-2">
                  <h2 className="label">Keywords</h2>
                  <TagList items={research.keywords} label="Keywords" />
                </div>
              ) : null}
              {research.methods.length ? (
                <div className="space-y-2">
                  <h2 className="label">Methods</h2>
                  <TagList items={research.methods} label="Methods" />
                </div>
              ) : null}
              {downloads.length || research.externalUrl ? (
                <div className="space-y-1">
                  <h2 className="label">Files and links</h2>
                  <ul>
                    {downloads.map((item) => (
                      <li key={item.href}>
                        <a href={item.href} className="link inline-flex min-h-11 items-center gap-1.5">
                          <Icon icon={FileDown} size={15} /> {item.label}
                        </a>
                      </li>
                    ))}
                    {research.externalUrl ? (
                      <li className="flex min-h-11 items-center">
                        <TextLink href={research.externalUrl}>Repository record</TextLink>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </aside>
          ) : null}

          <div className={cn("col-span-4 space-y-16 sm:col-span-8 lg:col-span-9", !hasMargin && "lg:col-start-4")}>
            {research.abstract ? (
              <section aria-labelledby="abstract-title" className="max-w-measure">
                <h2 id="abstract-title" className="label">
                  Abstract
                </h2>
                <div className="mt-3 space-y-4 font-serif text-lg leading-relaxed text-ink-2">
                  {paragraphs(research.abstract).map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {research.researchQuestion ? (
              <section aria-labelledby="question-title">
                <h2 id="question-title" className="label text-secondary">
                  Research question
                </h2>
                <p className="mt-3 max-w-3xl border-l-2 border-secondary pl-5 font-serif text-2xl leading-snug text-ink">
                  {research.researchQuestion}
                </p>
              </section>
            ) : null}

            {research.sections.map((section, index) => (
              <section key={section.key} id={section.key} aria-labelledby={`${section.key}-title`} className="scroll-mt-(--sticky-offset)">
                <h2 id={`${section.key}-title`} className="mb-6 flex items-baseline gap-4 text-3xl text-ink">
                  <span className="font-mono text-sm text-ink-3 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  {section.label}
                </h2>
                <Blocks blocks={section.blocks} media={research.media} figureNumbers={figureNumbers} headingBase={3} />
              </section>
            ))}

            <div className="space-y-10">
              {research.presentations.length ? (
                <section aria-labelledby="presented-title" className="border-t-2 border-ink pt-6">
                  <h2 id="presented-title" className="label mb-4">
                    Presented at
                  </h2>
                  <ul className="space-y-4">
                    {research.presentations.map((presentation) => (
                      <li key={presentation.id} className="space-y-1">
                        <PresentationLine presentation={presentation} />
                        <PresentationLinks presentation={presentation} showResearch={false} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {research.publications.length ? (
                <section aria-labelledby="outputs-title" className="border-t-2 border-ink pt-6">
                  <h2 id="outputs-title" className="label">
                    Publications from this work
                  </h2>
                  <div className="mt-4">
                    {research.publications.map((publication) => (
                      <PublicationEntry
                        key={publication.id}
                        publication={publication}
                        owner={owner}
                        headingLevel={3}
                        stacked
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {research.relatedProjects.length && !preview ? (
                <section aria-labelledby="related-title" className="border-t-2 border-ink pt-6">
                  <h2 id="related-title" className="label mb-4">
                    Related projects
                  </h2>
                  <ul className="space-y-2">
                    {research.relatedProjects.map((project) => (
                      <li key={project.slug} className="flex flex-wrap items-baseline gap-x-3">
                        <TextLink href={`/projects/${project.slug}`} arrow>
                          {project.title}
                        </TextLink>
                        <span className="font-mono text-xs text-ink-3">{PROJECT_TYPE_LABELS[project.type]}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section aria-labelledby="cite-title" className="max-w-measure border-t-2 border-ink pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="cite-title" className="label">
                    How to cite
                  </h2>
                  <CopyButton text={research.citation} label="Copy citation" />
                </div>
                <p className="mt-2 bg-surface p-4 font-serif text-lg leading-relaxed text-ink-2">{research.citation}</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
