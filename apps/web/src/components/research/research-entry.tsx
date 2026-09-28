import Link from "next/link";
import { FileDown } from "lucide-react";
import {
  PRESENTATION_TYPE_LABELS,
  RESEARCH_KIND_LABELS,
  formatMonth,
  type PresentationDTO,
  type ResearchSummaryDTO,
} from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";

function degreeShort(degree: string | null): string | null {
  return degree ? (degree.split(/\s+in\s+/i)[0] ?? degree) : null;
}

/** Research in bibliographic style: kind and year, title, institution, methods, where presented. */
export function ResearchEntry({
  item,
  headingLevel = 3,
}: {
  item: ResearchSummaryDTO;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const kind = [degreeShort(item.degree), RESEARCH_KIND_LABELS[item.kind].toLowerCase()]
    .filter(Boolean)
    .join(" ");
  return (
    <article className="group relative grid-editorial gap-y-2 border-t border-rule py-6">
      <p className="label col-span-4 sm:col-span-8 lg:col-span-3">
        <span className="text-secondary">{kind.charAt(0).toUpperCase() + kind.slice(1)}</span>
        {item.year ? <span className="block">{item.year}</span> : null}
      </p>
      <div className="col-span-4 space-y-2 sm:col-span-8 lg:col-span-9">
        <Heading className="text-xl leading-snug text-ink">
          <Link href={`/research/${item.slug}`} className="after:absolute after:inset-0">
            <span className="decoration-1 underline-offset-4 group-hover:underline">
              {item.title}
            </span>
          </Link>
        </Heading>
        {item.institution ? (
          <p className="font-serif-italic text-ink-2 italic">{item.institution}</p>
        ) : null}
        <p className="max-w-2xl text-ink-2">{item.summary}</p>
        <TagList items={item.methods} label="Methods" />
        {item.presentations.map((presentation) => (
          <PresentationLine key={presentation.id} presentation={presentation} compact />
        ))}
      </div>
    </article>
  );
}

export function PresentationLine({
  presentation,
  compact = false,
}: {
  presentation: PresentationDTO;
  compact?: boolean;
}) {
  const conference = [presentation.edition, presentation.conferenceName].filter(Boolean).join(" ");
  const parts = [
    PRESENTATION_TYPE_LABELS[presentation.presentationType],
    presentation.conferenceShortName
      ? `${conference} (${presentation.conferenceShortName})`
      : conference,
    presentation.location,
    formatMonth(presentation.presentedOn),
  ].filter(Boolean);
  return (
    <p className={compact ? "text-sm text-ink-3" : "text-ink-2"}>
      <span
        aria-hidden
        className="mr-2 inline-block size-2 rotate-45 bg-accent-mark align-middle"
      />
      {parts.join(" · ")}
    </p>
  );
}

/** Poster, slides, event page and (optionally) the research the presentation came from. */
export function PresentationLinks({
  presentation,
  showResearch = true,
}: {
  presentation: PresentationDTO;
  showResearch?: boolean;
}) {
  const research = showResearch ? presentation.research : null;
  if (!research && !presentation.poster && !presentation.slides && !presentation.eventUrl)
    return null;
  return (
    <div className="flex flex-wrap gap-x-5 text-sm">
      {research ? <TextLink href={`/research/${research.slug}`}>The research</TextLink> : null}
      {presentation.poster ? (
        <a href={presentation.poster.url} className="link inline-flex min-h-11 items-center gap-1">
          <Icon icon={FileDown} size={14} /> Poster
        </a>
      ) : null}
      {presentation.slides ? (
        <a href={presentation.slides.url} className="link inline-flex min-h-11 items-center gap-1">
          <Icon icon={FileDown} size={14} /> Slides
        </a>
      ) : null}
      {presentation.eventUrl ? <TextLink href={presentation.eventUrl}>Event page</TextLink> : null}
    </div>
  );
}
