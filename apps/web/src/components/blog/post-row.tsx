import Link from "next/link";
import { formatDate, type BlogPostSummaryDTO } from "@portfolio/shared";

/** A post in the writing index: date in the margin, then title, excerpt and reading time. */
export function PostRow({
  post,
  headingLevel = 2,
}: {
  post: BlogPostSummaryDTO;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const meta = [
    `${post.readingTimeMinutes} min read`,
    ...post.categories.map((category) => category.name),
  ].join(" · ");
  return (
    <article className="group relative grid-editorial gap-y-2 border-t border-rule py-6">
      <p className="label col-span-4 sm:col-span-8 lg:col-span-3">
        {post.publishedAt ? (
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        ) : (
          "Draft"
        )}
      </p>
      <div className="col-span-4 space-y-2 sm:col-span-8 lg:col-span-9">
        <Heading className="font-serif text-2xl leading-snug text-ink">
          <Link
            href={`/blog/${post.slug}`}
            className="decoration-1 underline-offset-4 after:absolute after:inset-0 group-hover:underline"
          >
            {post.title}
          </Link>
        </Heading>
        {post.excerpt ? <p className="max-w-measure text-ink-2">{post.excerpt}</p> : null}
        <p className="font-mono text-xs text-ink-3">{meta}</p>
      </div>
    </article>
  );
}
