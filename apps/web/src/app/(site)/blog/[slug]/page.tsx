import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/blog/post-article";
import { JsonLd } from "@/components/site/json-ld";
import { UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";
import { SITE_URL } from "@/lib/env";
import { absoluteUrl, breadcrumbSchema, graph, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [site, post] = await Promise.all([publicApi.site(), publicApi.post(slug)]);
  if (!post.ok) return { title: "Writing" };
  return pageMetadata({
    site: site.ok ? site.data : null,
    title: post.data.title,
    description: post.data.excerpt,
    path: `/blog/${slug}`,
    seo: post.data.seo,
    image: post.data.cover,
    ogPath: `/og/blog/${slug}`,
    type: "article",
    publishedTime: post.data.publishedAt,
    modifiedTime: post.data.updatedAt,
  });
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await publicApi.post(slug);
  if (!post.ok) {
    if (post.status === 404) notFound();
    return (
      <div className="container-page section-space">
        <UnavailableNotice title="This post is temporarily unavailable" />
      </div>
    );
  }
  const data = post.data;
  const url = absoluteUrl(`/blog/${data.slug}`);
  return (
    <>
      <JsonLd
        data={graph(
          {
            "@type": "BlogPosting",
            "@id": `${url}#article`,
            headline: data.title,
            description: data.excerpt ?? undefined,
            url,
            mainEntityOfPage: url,
            author: { "@id": `${SITE_URL}/#person` },
            datePublished: data.publishedAt ?? undefined,
            dateModified: data.updatedAt,
            image: data.cover ? absoluteUrl(data.cover.url) : absoluteUrl(`/og/blog/${data.slug}`),
            keywords: data.tags.map((tag) => tag.name).join(", ") || undefined,
            articleSection: data.categories[0]?.name,
            timeRequired: `PT${data.readingTimeMinutes}M`,
          },
          breadcrumbSchema([
            { name: "Writing", path: "/blog" },
            { name: data.title, path: `/blog/${data.slug}` },
          ]),
        )}
      />
      <PostArticle post={data} />
    </>
  );
}
