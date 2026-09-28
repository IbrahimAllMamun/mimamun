import type { Metadata } from "next";
import { PublicationEntry } from "@/components/research/publication-entry";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicApi.site();
  return pageMetadata({ site: site.ok ? site.data : null, title: "Publications", path: "/publications", routeKey: "publications" });
}

export default async function PublicationsPage() {
  const [site, publications] = await Promise.all([publicApi.site(), publicApi.publications()]);
  const owner = site.ok ? site.data.profile.fullName : "";
  return (
    <>
      <PageHeader eyebrow="Research" title="Publications" lead="Papers and preprints, with citations you can copy." />
      <div className="container-page">
        {!publications.ok ? (
          <UnavailableNotice title="Publications are temporarily unavailable" />
        ) : publications.data.length === 0 ? (
          <EmptyState
            title="No publications listed yet"
            action={
              <ButtonLink href="/research" variant="secondary" size="sm">
                See research and presentations
              </ButtonLink>
            }
          >
            Research projects and conference presentations are listed on the research page.
          </EmptyState>
        ) : (
          <div className="border-b border-rule">
            {publications.data.map((publication) => (
              <PublicationEntry key={publication.id} publication={publication} owner={owner} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
