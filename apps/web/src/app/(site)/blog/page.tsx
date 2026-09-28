import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PostRow } from "@/components/blog/post-row";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";
import { cn } from "@/lib/cn";
import { pageMetadata } from "@/lib/seo";

const KEYS = ["q", "category", "tag", "page"] as const;

function pickParams(searchParams: Record<string, string | string[] | undefined>) {
  const params: Record<string, string> = {};
  for (const key of KEYS) {
    const value = searchParams[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params[key] = single.slice(0, 120);
  }
  return params;
}

export async function generateMetadata({ searchParams }: PageProps<"/blog">): Promise<Metadata> {
  const site = await publicApi.site();
  const filtered = Object.keys(pickParams(await searchParams)).length > 0;
  return pageMetadata({ site: site.ok ? site.data : null, title: "Writing", path: "/blog", routeKey: "blog", noindex: filtered });
}

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const params = pickParams(await searchParams);
  const [site, result] = await Promise.all([publicApi.site(), publicApi.blog(params)]);
  const lead = (site.ok ? site.data.routeSeo.blog?.description : null) ?? "Notes on statistics, data science and analytics.";
  const filtered = Boolean(params.q || params.category || params.tag);
  const hrefFor = (target: number) => `/blog?${new URLSearchParams({ ...params, page: String(target) })}`;

  return (
    <>
      <PageHeader eyebrow="Writing" title="Writing" lead={lead} />
      <div className="container-page">
        {!result.ok ? (
          <UnavailableNotice title="Writing is temporarily unavailable" />
        ) : (
          <>
            {result.meta.total > 0 || filtered ? (
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {result.meta.categories.length > 1 ? (
                  <nav aria-label="Categories" className="flex flex-wrap items-center gap-1">
                    {[{ name: "All", slug: null as string | null }, ...result.meta.categories].map((category) => {
                      const active = (params.category ?? null) === category.slug;
                      return (
                        <Link
                          key={category.slug ?? "all"}
                          href={category.slug ? `/blog?category=${category.slug}` : "/blog"}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "inline-flex min-h-11 items-center rounded-sm px-3 text-sm transition-colors duration-(--duration-fast)",
                            active ? "bg-ink text-paper" : "text-ink-2 hover:bg-muted hover:text-ink",
                          )}
                        >
                          {category.name}
                        </Link>
                      );
                    })}
                  </nav>
                ) : (
                  <span />
                )}
                <form action="/blog" role="search" className="flex w-full items-center gap-2 lg:w-80">
                  {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
                  <label htmlFor="blog-search" className="sr-only">
                    Search writing
                  </label>
                  <div className="relative flex-1">
                    <Icon icon={Search} size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
                    <input
                      id="blog-search"
                      name="q"
                      type="search"
                      defaultValue={params.q ?? ""}
                      placeholder="Search writing"
                      className="min-h-11 w-full rounded-sm border border-rule-strong bg-elevated pr-3 pl-9 text-sm text-ink placeholder:text-ink-3 focus:border-ink"
                    />
                  </div>
                </form>
              </div>
            ) : null}

            {result.data.length === 0 ? (
              <EmptyState
                title={filtered ? "No posts match this search" : "No posts published yet"}
                action={
                  filtered ? (
                    <ButtonLink href="/blog" variant="secondary" size="sm">
                      Show all writing
                    </ButtonLink>
                  ) : (
                    <ButtonLink href="/projects" variant="secondary" size="sm">
                      Read the case studies
                    </ButtonLink>
                  )
                }
              >
                {filtered ? "Try another word or category." : "Notes on statistics and analytics will appear here once they are published."}
              </EmptyState>
            ) : (
              <div className="border-b border-rule">
                {result.data.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            )}
            <div className="mt-8">
              <Pagination page={result.meta.page} totalPages={result.meta.totalPages} hrefFor={hrefFor} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
