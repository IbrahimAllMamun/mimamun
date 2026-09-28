import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectArticle } from "@/components/projects/project-article";
import { JsonLd } from "@/components/site/json-ld";
import { UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";
import { SITE_URL } from "@/lib/env";
import { absoluteUrl, breadcrumbSchema, graph, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [site, project] = await Promise.all([publicApi.site(), publicApi.project(slug)]);
  if (!project.ok) return { title: "Project" };
  return pageMetadata({
    site: site.ok ? site.data : null,
    title: project.data.title,
    description: project.data.summary,
    path: `/projects/${slug}`,
    seo: project.data.seo,
    image: project.data.cover,
    ogPath: `/og/projects/${slug}`,
    type: "article",
    publishedTime: project.data.publishedAt,
    modifiedTime: project.data.updatedAt,
  });
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = await publicApi.project(slug);
  if (!project.ok) {
    if (project.status === 404) notFound();
    return (
      <div className="container-page section-space">
        <UnavailableNotice title="This project is temporarily unavailable" />
      </div>
    );
  }
  const data = project.data;
  return (
    <>
      <JsonLd
        data={graph(
          {
            "@type": "CreativeWork",
            "@id": `${absoluteUrl(`/projects/${data.slug}`)}#work`,
            name: data.title,
            abstract: data.summary,
            url: absoluteUrl(`/projects/${data.slug}`),
            creator: { "@id": `${SITE_URL}/#person` },
            dateModified: data.updatedAt,
            datePublished: data.publishedAt ?? undefined,
            keywords: [...data.technologies, ...data.tags.map((tag) => tag.name)].join(", ") || undefined,
            image: data.cover ? absoluteUrl(data.cover.url) : undefined,
          },
          breadcrumbSchema([
            { name: "Projects", path: "/projects" },
            { name: data.title, path: `/projects/${data.slug}` },
          ]),
        )}
      />
      <ProjectArticle project={data} />
    </>
  );
}
