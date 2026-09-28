import type { Metadata } from "next";
import Link from "next/link";
import { pluralize, type CredentialProviderDTO } from "@portfolio/shared";
import { CredentialTree, filterTree, flattenTree } from "@/components/credentials/credential-tree";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState, UnavailableNotice } from "@/components/ui/states";
import { TextLink } from "@/components/ui/text-link";
import { publicApi } from "@/lib/api/server";
import { cn } from "@/lib/cn";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: PageProps<"/certifications">): Promise<Metadata> {
  const [site, params] = await Promise.all([publicApi.site(), searchParams]);
  return pageMetadata({
    site: site.ok ? site.data : null,
    title: "Certifications",
    path: "/certifications",
    routeKey: "certifications",
    // Filtered views are variations of the same page.
    noindex: Boolean(params.type),
  });
}

function typeCounts(providers: CredentialProviderDTO[]) {
  const counts = new Map<string, { name: string; slug: string; count: number }>();
  for (const node of providers.flatMap((provider) => flattenTree(provider.credentials))) {
    const entry = counts.get(node.type.slug) ?? { ...node.type, count: 0 };
    entry.count += 1;
    counts.set(node.type.slug, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export default async function CertificationsPage({ searchParams }: PageProps<"/certifications">) {
  const [certifications, params] = await Promise.all([publicApi.certifications(), searchParams]);

  if (!certifications.ok) {
    return (
      <>
        <PageHeader eyebrow="Certifications" title="Certifications" />
        <div className="container-page">
          <UnavailableNotice title="Certifications are temporarily unavailable" />
        </div>
      </>
    );
  }

  const providers = certifications.data;
  const types = typeCounts(providers);
  const requested = typeof params.type === "string" ? params.type : null;
  const activeType = types.some((type) => type.slug === requested) ? requested : null;
  const total = providers.reduce((sum, provider) => sum + provider.count, 0);
  const visible = providers
    .map((provider) => ({ ...provider, credentials: filterTree(provider.credentials, activeType) }))
    .filter((provider) => provider.credentials.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Certifications"
        title="Certifications"
        lead={
          total
            ? `${pluralize(total, "credential")} from ${pluralize(providers.length, "provider")}, grouped by provider and programme.`
            : null
        }
      />

      <div className="container-page">
        {providers.length === 0 ? (
          <EmptyState title="No certifications listed yet" />
        ) : (
          <>
            {types.length > 1 ? (
              <nav
                aria-label="Filter by type"
                className="mb-6 flex flex-wrap items-center gap-x-1 gap-y-2"
              >
                <span className="label mr-3">Show</span>
                {[{ name: "All", slug: null as string | null, count: total }, ...types].map(
                  (type) => {
                    const active = activeType === type.slug;
                    return (
                      <Link
                        key={type.slug ?? "all"}
                        href={type.slug ? `/certifications?type=${type.slug}` : "/certifications"}
                        aria-current={active ? "page" : undefined}
                        scroll={false}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm transition-colors duration-(--duration-fast)",
                          active ? "bg-ink text-paper" : "text-ink-2 hover:bg-muted hover:text-ink",
                        )}
                      >
                        {type.name}
                        <span
                          className={cn(
                            "font-mono text-xs tabular-nums",
                            active ? "text-paper" : "text-ink-3",
                          )}
                        >
                          {type.count}
                        </span>
                      </Link>
                    );
                  },
                )}
              </nav>
            ) : null}

            <div className="border-t-2 border-ink">
              {visible.map((provider) => (
                <section
                  key={provider.id}
                  id={provider.slug}
                  aria-labelledby={`${provider.slug}-title`}
                  className="grid-editorial scroll-mt-(--sticky-offset) gap-y-3 border-b border-rule py-8 last:border-b-0"
                >
                  <header className="col-span-4 space-y-2 sm:col-span-8 lg:col-span-3">
                    <h2 id={`${provider.slug}-title`} className="font-serif text-2xl text-ink">
                      {provider.name}
                    </h2>
                    <p className="font-mono text-xs text-ink-3 tabular-nums">
                      {pluralize(provider.count, "credential")}
                    </p>
                    {provider.websiteUrl ? (
                      <p className="text-sm">
                        <TextLink href={provider.websiteUrl}>Website</TextLink>
                      </p>
                    ) : null}
                    {provider.description ? (
                      <p className="text-sm text-ink-2">{provider.description}</p>
                    ) : null}
                  </header>
                  <div className="col-span-4 sm:col-span-8 lg:col-span-9">
                    <CredentialTree nodes={provider.credentials} />
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
