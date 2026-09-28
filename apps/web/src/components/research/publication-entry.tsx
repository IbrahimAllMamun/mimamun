import { FileDown } from "lucide-react";
import { doiUrl, PUBLICATION_STATUS_LABELS, PUBLICATION_TYPE_LABELS, yearOf, type PublicationDTO } from "@portfolio/shared";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { TextLink } from "@/components/ui/text-link";

function Authors({ authors, owner }: { authors: string[]; owner: string }) {
  return (
    <p className="text-sm text-ink-2">
      {authors.map((author, index) => (
        <span key={`${author}-${index}`}>
          {index > 0 ? ", " : ""}
          {author.toLowerCase() === owner.toLowerCase() ? <strong className="font-semibold text-ink">{author}</strong> : author}
        </span>
      ))}
    </p>
  );
}

/** Bibliographic entry with status, links and copyable citations. */
export function PublicationEntry({ publication, owner }: { publication: PublicationDTO; owner: string }) {
  const year = yearOf(publication.publishedOn);
  return (
    <article id={publication.slug} className="grid-editorial scroll-mt-(--sticky-offset) gap-y-2 border-t border-rule py-6">
      <p className="label col-span-4 sm:col-span-8 lg:col-span-3">
        {PUBLICATION_TYPE_LABELS[publication.publicationType]}
        {year ? <span className="block">{year}</span> : null}
      </p>
      <div className="col-span-4 space-y-2 sm:col-span-8 lg:col-span-9">
        {publication.publicationStatus !== "published" ? (
          <StatusBadge tone="attention">{PUBLICATION_STATUS_LABELS[publication.publicationStatus]}</StatusBadge>
        ) : null}
        <h2 className="text-xl leading-snug text-ink">{publication.title}</h2>
        <Authors authors={publication.authors} owner={owner} />
        {publication.venue ? (
          <p className="font-serif-italic text-ink-2 italic">
            {publication.venue}
            {publication.volume ? `, ${publication.volume}` : ""}
            {publication.issue ? `(${publication.issue})` : ""}
            {publication.pages ? `, ${publication.pages}` : ""}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {publication.doi ? <TextLink href={doiUrl(publication.doi)}>DOI {publication.doi}</TextLink> : null}
          {!publication.doi && publication.url ? <TextLink href={publication.url}>Publisher page</TextLink> : null}
          {publication.pdf ? (
            <a href={publication.pdf.url} className="link inline-flex items-center gap-1">
              <Icon icon={FileDown} size={14} /> PDF
            </a>
          ) : null}
          {publication.research ? <TextLink href={`/research/${publication.research.slug}`}>About this research</TextLink> : null}
        </div>
        {publication.abstract ? (
          <details className="text-sm">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary">Abstract</summary>
            <p className="max-w-measure pb-2 font-serif text-base leading-relaxed text-ink-2">{publication.abstract}</p>
          </details>
        ) : null}
        <details className="text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary">Cite</summary>
          <div className="space-y-3 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2 bg-surface p-3">
              <p className="max-w-measure text-ink-2">{publication.citation}</p>
              <CopyButton text={publication.citation} label="Copy citation" />
            </div>
            <div className="bg-surface p-3">
              <div className="flex justify-between gap-2">
                <span className="label pt-3">BibTeX</span>
                <CopyButton text={publication.bibtex} label="Copy BibTeX" />
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-ink-2">{publication.bibtex}</pre>
            </div>
          </div>
        </details>
      </div>
    </article>
  );
}
