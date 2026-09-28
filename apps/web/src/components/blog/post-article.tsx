import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  formatDate,
  PROJECT_TYPE_LABELS,
  RESEARCH_KIND_LABELS,
  type BlogPostDetailDTO,
} from "@portfolio/shared";
import { Blocks, numberFigures } from "@/components/content/blocks";
import { PageHeader } from "@/components/site/page-header";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";

/** The post layout, shared by the public page and the admin preview. */
export function PostArticle({
  post,
  preview = false,
}: {
  post: BlogPostDetailDTO;
  preview?: boolean;
}) {
  const figureNumbers = numberFigures([post.body]);
  const updated =
    post.publishedAt && post.updatedAt.slice(0, 10) > post.publishedAt.slice(0, 10)
      ? post.updatedAt
      : null;
  const byline = [
    post.author ? `By ${post.author}` : null,
    post.publishedAt ? formatDate(post.publishedAt) : "Not yet published",
    `${post.readingTimeMinutes} min read`,
  ].filter(Boolean);

  return (
    <article>
      <PageHeader
        breadcrumbs={[{ name: "Writing", href: "/blog" }, { name: post.title }]}
        eyebrow={post.categories.map((category) => category.name).join(" · ") || null}
        title={post.title}
        lead={post.excerpt}
      >
        <p className="flex flex-wrap gap-x-2 font-mono text-xs text-ink-3">
          {byline.map((part, index) => (
            <span key={part}>
              {index > 0 ? <span aria-hidden>· </span> : null}
              {part}
            </span>
          ))}
          {updated ? (
            <span>
              <span aria-hidden>· </span>Updated {formatDate(updated)}
            </span>
          ) : null}
        </p>
      </PageHeader>

      {post.cover && post.cover.width && post.cover.height ? (
        <figure className="container-page mb-12">
          <Image
            src={post.cover.url}
            alt={post.cover.alt}
            width={post.cover.width}
            height={post.cover.height}
            sizes="(min-width: 1280px) 1280px, 100vw"
            preload
            className="h-auto w-full rounded-xs border border-rule bg-muted"
          />
          {post.cover.caption ? (
            <figcaption className="mt-2 text-sm text-ink-3">{post.cover.caption}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="container-page">
        <div className="grid-editorial">
          <div className="col-span-4 space-y-12 sm:col-span-8 lg:col-span-9 lg:col-start-4">
            <Blocks
              blocks={post.body}
              media={post.media}
              figureNumbers={figureNumbers}
              headingBase={2}
            />

            {post.tags.length ? (
              <ul aria-label="Tags" className="flex flex-wrap gap-1.5 border-t border-rule pt-6">
                {post.tags.map((tag) => (
                  <li key={tag.slug}>
                    <Tag href={preview ? undefined : `/blog?tag=${tag.slug}`}>{tag.name}</Tag>
                  </li>
                ))}
              </ul>
            ) : null}

            {post.relatedProjects.length || post.relatedResearch.length ? (
              <section aria-labelledby="related-title" className="border-t-2 border-ink pt-6">
                <h2 id="related-title" className="label mb-3">
                  Related work
                </h2>
                <ul className="space-y-2">
                  {post.relatedProjects.map((project) => (
                    <li key={project.slug} className="flex flex-wrap items-baseline gap-x-3">
                      <TextLink href={`/projects/${project.slug}`} arrow>
                        {project.title}
                      </TextLink>
                      <span className="font-mono text-xs text-ink-3">
                        {PROJECT_TYPE_LABELS[project.type]} project
                      </span>
                    </li>
                  ))}
                  {post.relatedResearch.map((item) => (
                    <li key={item.slug} className="flex flex-wrap items-baseline gap-x-3">
                      <TextLink href={`/research/${item.slug}`} arrow>
                        {item.title}
                      </TextLink>
                      <span className="font-mono text-xs text-ink-3">
                        {RESEARCH_KIND_LABELS[item.kind]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {!preview && (post.previous || post.next) ? (
              <nav
                aria-label="More writing"
                className="grid grid-cols-1 gap-6 border-t-2 border-ink pt-6 sm:grid-cols-2"
              >
                {post.previous ? (
                  <Link href={`/blog/${post.previous.slug}`} className="group space-y-1" rel="prev">
                    <span className="label flex items-center gap-1.5">
                      <Icon icon={ArrowLeft} size={12} /> Older
                    </span>
                    <span className="block font-serif text-lg text-ink group-hover:underline">
                      {post.previous.title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {post.next ? (
                  <Link
                    href={`/blog/${post.next.slug}`}
                    className="group space-y-1 sm:text-right"
                    rel="next"
                  >
                    <span className="label flex items-center gap-1.5 sm:justify-end">
                      Newer <Icon icon={ArrowRight} size={12} />
                    </span>
                    <span className="block font-serif text-lg text-ink group-hover:underline">
                      {post.next.title}
                    </span>
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
