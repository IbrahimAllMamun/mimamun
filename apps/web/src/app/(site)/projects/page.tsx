import type { Metadata } from "next";
import { Suspense } from "react";
import { GithubSection } from "@/components/projects/github-section";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectRow } from "@/components/projects/project-row";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";
import { pageMetadata } from "@/lib/seo";

const KEYS = ["q", "category", "tech", "year", "type", "featured", "sort", "page"] as const;

function pickParams(searchParams: Record<string, string | string[] | undefined>) {
  const params: Record<string, string> = {};
  for (const key of KEYS) {
    const value = searchParams[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params[key] = single.slice(0, 120);
  }
  return params;
}

export async function generateMetadata({ searchParams }: PageProps<"/projects">): Promise<Metadata> {
  const site = await publicApi.site();
  const filtered = Object.keys(pickParams(await searchParams)).length > 0;
  return pageMetadata({
    site: site.ok ? site.data : null,
    title: "Projects",
    path: "/projects",
    routeKey: "projects",
    // Filtered views are variations of one page; keep them out of the index.
    noindex: filtered,
  });
}

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const params = pickParams(await searchParams);
  const filtered = Object.keys(params).length > 0;
  const [result, github] = await Promise.all([publicApi.projects(params), filtered ? null : publicApi.github()]);
  const page = Number(params.page ?? 1) || 1;
  const hrefFor = (target: number) => {
    const next = new URLSearchParams({ ...params, page: String(target) });
    return `/projects?${next}`;
  };
  return (
    <>
      <PageHeader
        eyebrow="Index of work"
        title="Projects"
        lead="Case studies in statistics, machine learning and analytics. Each follows the same path: problem, data, method, model, evaluation, result and impact."
      />
      <div className="container-page">
        {!result.ok ? (
          <UnavailableNotice title="Projects are temporarily unavailable" />
        ) : (
          <div className="grid-editorial gap-y-8">
            <div className="col-span-4 sm:col-span-8 lg:col-span-12">
              <Suspense>
                <ProjectFilters facets={result.meta.facets} total={result.meta.total} />
              </Suspense>
            </div>
            <div className="col-span-4 sm:col-span-8 lg:col-span-12">
              {result.data.length === 0 ? (
                <EmptyState
                  title={Object.keys(params).length ? "No projects match these filters" : "No projects published yet"}
                  action={
                    Object.keys(params).length ? (
                      <ButtonLink href="/projects" variant="secondary" size="sm">
                        Clear filters
                      </ButtonLink>
                    ) : null
                  }
                >
                  {Object.keys(params).length
                    ? "Try a broader search, or remove a filter."
                    : "Case studies will appear here once they are published."}
                </EmptyState>
              ) : (
                <div key={JSON.stringify(params)} className="motion-safe:animate-fade border-b border-rule">
                  {result.data.map((project, index) => (
                    <ProjectRow key={project.id} project={project} index={(page - 1) * 24 + index} headingLevel={2} />
                  ))}
                </div>
              )}
              <div className="mt-8">
                <Pagination page={result.meta.page} totalPages={result.meta.totalPages} hrefFor={hrefFor} />
              </div>
            </div>
            {github?.ok ? (
              <div className="col-span-4 mt-(--space-block) sm:col-span-8 lg:col-span-12">
                <GithubSection github={github.data} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
