import type { Metadata } from "next";
import { PresentationLine, PresentationLinks, ResearchEntry } from "@/components/research/research-entry";
import { PublicationEntry } from "@/components/research/publication-entry";
import { PageHeader } from "@/components/site/page-header";
import { SectionHeader } from "@/components/site/section-header";
import { EmptyState, UnavailableNotice } from "@/components/ui/states";
import { TextLink } from "@/components/ui/text-link";
import { publicApi } from "@/lib/api/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicApi.site();
  return pageMetadata({ site: site.ok ? site.data : null, title: "Research", path: "/research", routeKey: "research" });
}

export default async function ResearchPage() {
  const [site, research] = await Promise.all([publicApi.site(), publicApi.research()]);
  const owner = site.ok ? site.data.profile.fullName : "";
  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Research"
        lead={site.ok && site.data.profile.researchInterests ? site.data.profile.researchInterests : "Statistical and machine-learning research."}
      />
      <div className="container-page space-y-(--space-section)">
        {!research.ok ? (
          <UnavailableNotice title="Research is temporarily unavailable" />
        ) : (
          <>
            <section aria-labelledby="works-title">
              <SectionHeader label="Works" id="works-title" title="Theses and research projects" count={`n = ${research.data.research.length}`} />
              <div className="mt-6">
                {research.data.research.length ? (
                  research.data.research.map((item) => <ResearchEntry key={item.id} item={item} headingLevel={3} />)
                ) : (
                  <EmptyState title="No research published yet" />
                )}
              </div>
            </section>

            {research.data.presentations.length ? (
              <section aria-labelledby="presentations-title">
                <SectionHeader label="Presentations" id="presentations-title" title="Conference presentations" />
                <ul className="mt-6">
                  {research.data.presentations.map((presentation) => (
                    <li key={presentation.id} className="grid-editorial gap-y-2 border-t border-rule py-5">
                      <div className="col-span-4 space-y-1 sm:col-span-8 lg:col-span-9 lg:col-start-4">
                        <p className="font-serif text-lg text-ink">{presentation.title}</p>
                        <PresentationLine presentation={presentation} />
                        <PresentationLinks presentation={presentation} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {research.data.publications.length ? (
              <section aria-labelledby="publications-title">
                <SectionHeader
                  label="Publications"
                  id="publications-title"
                  title="Publications"
                  action={
                    <TextLink href="/publications" arrow>
                      All publications
                    </TextLink>
                  }
                />
                <div className="mt-6">
                  {research.data.publications.slice(0, 3).map((publication) => (
                    <PublicationEntry key={publication.id} publication={publication} owner={owner} headingLevel={3} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
