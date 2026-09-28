import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ENTITY_TYPE_LABELS, pluralize, type EntityType, type SearchResultDTO } from "@portfolio/shared";
import { PageHeader } from "@/components/site/page-header";
import { Icon } from "@/components/ui/icon";
import { EmptyState, UnavailableNotice } from "@/components/ui/states";
import { TextLink } from "@/components/ui/text-link";
import { publicApi } from "@/lib/api/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicApi.site();
  // Result pages are thin and unbounded; keep them out of search engines.
  return pageMetadata({ site: site.ok ? site.data : null, title: "Search", path: "/search", routeKey: "search", noindex: true });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps query terms in <mark>; the text itself is rendered as plain text. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-xs bg-accent-tint px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

const GROUP_LABELS: Partial<Record<EntityType, string>> = {
  project: "Projects",
  publication: "Publications",
  presentation: "Presentations",
  credential: "Certifications",
  skill: "Skills",
  page: "Pages",
};

const SECTIONS = [
  { href: "/projects", label: "Projects" },
  { href: "/research", label: "Research" },
  { href: "/experience", label: "Experience" },
  { href: "/certifications", label: "Certifications" },
];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 120) ?? "";
  const result = q ? await publicApi.search(q) : null;
  const terms = q.split(/\s+/).filter((term) => term.length > 1);
  const groups = new Map<EntityType, SearchResultDTO[]>();
  if (result?.ok) {
    for (const item of result.data) groups.set(item.type, [...(groups.get(item.type) ?? []), item]);
  }

  return (
    <>
      <PageHeader eyebrow="Search" title="Search" lead="Projects, research, publications, certifications and writing.">
        <form action="/search" role="search" className="flex max-w-2xl gap-2">
          <label htmlFor="site-search" className="sr-only">
            Search the site
          </label>
          <div className="relative flex-1">
            <Icon icon={Search} size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
            <input
              id="site-search"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={120}
              placeholder="e.g. credit risk, LSTM, Shiny"
              autoFocus={!q}
              className="min-h-12 w-full rounded-sm border border-rule-strong bg-elevated pr-3 pl-11 text-base text-ink placeholder:text-ink-3 focus:border-ink"
            />
          </div>
          <button type="submit" className="min-h-12 rounded-sm bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-(--duration-fast) hover:bg-primary-hover">
            Search
          </button>
        </form>
      </PageHeader>

      <div className="container-page">
        {!q ? (
          <div className="grid-editorial">
            <div className="col-span-4 sm:col-span-8 lg:col-span-9 lg:col-start-4">
              <p className="label mb-3">Or browse</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {SECTIONS.map((section) => (
                  <li key={section.href}>
                    <TextLink href={section.href} arrow>
                      {section.label}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : !result?.ok ? (
          <UnavailableNotice title="Search is temporarily unavailable" />
        ) : result.data.length === 0 ? (
          <EmptyState title={`Nothing found for “${q}”`}>
            Try a shorter or more general term, or browse{" "}
            {SECTIONS.map((section, index) => (
              <span key={section.href}>
                {index > 0 ? (index === SECTIONS.length - 1 ? " or " : ", ") : null}
                <Link href={section.href} className="link">
                  {section.label.toLowerCase()}
                </Link>
              </span>
            ))}
            .
          </EmptyState>
        ) : (
          <>
            <p role="status" className="label mb-6">
              {pluralize(result.data.length, "result")} for <span className="normal-case">“{q}”</span>
            </p>
            <div className="space-y-12">
              {[...groups.entries()].map(([type, items]) => (
                <section key={type} aria-labelledby={`results-${type}`} className="grid-editorial gap-y-3">
                  <h2 id={`results-${type}`} className="label col-span-4 sm:col-span-8 lg:col-span-3">
                    {GROUP_LABELS[type] ?? ENTITY_TYPE_LABELS[type]} <span className="text-ink-3">({items.length})</span>
                  </h2>
                  <ol className="col-span-4 border-t border-rule sm:col-span-8 lg:col-span-9">
                    {items.map((item) => (
                      <li key={item.url} className="group relative border-b border-rule py-4">
                        <Link href={item.url} className="font-serif text-xl text-ink after:absolute after:inset-0 group-hover:underline">
                          <Highlight text={item.title} terms={terms} />
                        </Link>
                        {item.excerpt ? (
                          <p className="mt-1 max-w-measure text-ink-2">
                            <Highlight text={item.excerpt} terms={terms} />
                          </p>
                        ) : null}
                        {item.meta ? <p className="mt-1 font-mono text-xs text-ink-3">{item.meta}</p> : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
