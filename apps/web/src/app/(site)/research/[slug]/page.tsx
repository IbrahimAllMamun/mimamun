import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResearchArticle } from "@/components/research/research-article";
import { JsonLd } from "@/components/site/json-ld";
import { UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";
import { SITE_URL } from "@/lib/env";
import { absoluteUrl, breadcrumbSchema, graph, pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/research/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [site, research] = await Promise.all([publicApi.site(), publicApi.researchItem(slug)]);
  if (!research.ok) return { title: "Research" };
  return pageMetadata({
    site: site.ok ? site.data : null,
    title: research.data.title,
    description: research.data.summary,
    path: `/research/${slug}`,
    seo: research.data.seo,
    image: research.data.cover,
    ogPath: `/og/research/${slug}`,
    type: "article",
    modifiedTime: research.data.updatedAt,
  });
}

export default async function ResearchItemPage({ params }: PageProps<"/research/[slug]">) {
  const { slug } = await params;
  const [site, research] = await Promise.all([publicApi.site(), publicApi.researchItem(slug)]);
  if (!research.ok) {
    if (research.status === 404) notFound();
    return (
      <div className="container-page section-space">
        <UnavailableNotice title="This research page is temporarily unavailable" />
      </div>
    );
  }
  const data = research.data;
  const owner = site.ok ? site.data.profile.fullName : (data.authors[0] ?? "");
  const url = absoluteUrl(`/research/${data.slug}`);
  return (
    <>
      <JsonLd
        data={graph(
          {
            "@type": "ScholarlyArticle",
            "@id": `${url}#work`,
            headline: data.title,
            name: data.title,
            abstract: data.abstract ?? data.summary,
            url,
            inLanguage: "en",
            author: data.authors.map((name) =>
              name.toLowerCase() === owner.toLowerCase()
                ? { "@id": `${SITE_URL}/#person` }
                : { "@type": "Person", name },
            ),
            datePublished: data.completedOn ?? (data.year ? String(data.year) : undefined),
            dateModified: data.updatedAt,
            keywords: [...data.keywords, ...data.methods].join(", ") || undefined,
            sourceOrganization: data.institution
              ? { "@type": "CollegeOrUniversity", name: data.institution }
              : undefined,
            image: data.cover ? absoluteUrl(data.cover.url) : undefined,
          },
          breadcrumbSchema([
            { name: "Research", path: "/research" },
            { name: data.title, path: `/research/${data.slug}` },
          ]),
        )}
      />
      <ResearchArticle research={data} owner={owner} />
    </>
  );
}
