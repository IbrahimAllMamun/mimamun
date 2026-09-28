import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { formatMonth, PROJECT_TYPE_LABELS } from "@portfolio/shared";
import { CredentialTree, flattenTree } from "@/components/credentials/credential-tree";
import { JsonLd } from "@/components/site/json-ld";
import { MetaTable } from "@/components/site/meta-table";
import { PageHeader } from "@/components/site/page-header";
import { Icon } from "@/components/ui/icon";
import { UnavailableNotice } from "@/components/ui/states";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { publicApi } from "@/lib/api/server";
import { SITE_URL } from "@/lib/env";
import { absoluteUrl, breadcrumbSchema, graph, pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/certifications/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [site, credential] = await Promise.all([publicApi.site(), publicApi.credential(slug)]);
  if (!credential.ok) return { title: "Certification" };
  const data = credential.data;
  return pageMetadata({
    site: site.ok ? site.data : null,
    title: data.title,
    description: data.description ?? `${data.type.name} from ${data.provider.name}.`,
    path: `/certifications/${slug}`,
    image: data.image,
    ogPath: `/og/certifications/${slug}`,
  });
}

export default async function CredentialPage({ params }: PageProps<"/certifications/[slug]">) {
  const { slug } = await params;
  const [credential, all] = await Promise.all([
    publicApi.credential(slug),
    publicApi.certifications(),
  ]);
  if (!credential.ok) {
    if (credential.status === 404) notFound();
    return (
      <div className="container-page section-space">
        <UnavailableNotice title="This certification is temporarily unavailable" />
      </div>
    );
  }
  const data = credential.data;
  const provider = all.ok ? all.data.find((item) => item.slug === data.provider.slug) : undefined;
  const excluded = new Set([
    data.slug,
    ...data.ancestors.map((item) => item.slug),
    ...flattenTree(data.children).map((item) => item.slug),
  ]);
  const others = provider
    ? flattenTree(provider.credentials).filter((node) => !excluded.has(node.slug))
    : [];
  const verifyUrl = data.verificationUrl ?? data.credentialUrl;
  const credentialId = `${absoluteUrl(`/certifications/${data.slug}`)}#credential`;

  return (
    <>
      <JsonLd
        data={graph(
          {
            "@type": "EducationalOccupationalCredential",
            "@id": credentialId,
            name: data.title,
            description: data.description ?? undefined,
            credentialCategory: data.type.name,
            educationalLevel: data.level ?? undefined,
            recognizedBy: {
              "@type": "Organization",
              name: data.provider.name,
              url: data.provider.websiteUrl ?? undefined,
            },
            dateCreated: data.issuedOn ?? undefined,
            expires: data.expiresOn ?? undefined,
            url: verifyUrl ?? absoluteUrl(`/certifications/${data.slug}`),
            about: data.skills.length ? data.skills.map((skill) => skill.name) : undefined,
          },
          {
            "@type": "Person",
            "@id": `${SITE_URL}/#person`,
            hasCredential: { "@id": credentialId },
          },
          breadcrumbSchema([
            { name: "Certifications", path: "/certifications" },
            { name: data.title, path: `/certifications/${data.slug}` },
          ]),
        )}
      />
      <article>
        <PageHeader
          breadcrumbs={[
            { name: "Certifications", href: "/certifications" },
            { name: data.provider.name, href: `/certifications#${data.provider.slug}` },
            ...data.ancestors.map((item) => ({
              name: item.title,
              href: `/certifications/${item.slug}`,
            })),
            { name: data.title },
          ]}
          eyebrow={[data.type.name, data.provider.name].join(" · ")}
          title={data.title}
          lead={data.description}
        >
          <MetaTable
            className="mt-4"
            items={[
              {
                label: "Provider",
                value: data.provider.websiteUrl ? (
                  <TextLink href={data.provider.websiteUrl}>{data.provider.name}</TextLink>
                ) : (
                  data.provider.name
                ),
              },
              { label: "Type", value: data.type.name },
              { label: "Level", value: data.level },
              { label: "Issued", value: data.issuedOn ? formatMonth(data.issuedOn) : null },
              { label: "Expires", value: data.expiresOn ? formatMonth(data.expiresOn) : null },
              {
                label: "Credential ID",
                value: data.credentialCode ? (
                  <span className="font-mono text-sm break-all">{data.credentialCode}</span>
                ) : null,
              },
              {
                label: "Verification",
                value: verifyUrl ? <TextLink href={verifyUrl}>Verify credential</TextLink> : null,
              },
              {
                label: "Part of",
                value: data.ancestors.length ? (
                  <TextLink
                    href={`/certifications/${data.ancestors[data.ancestors.length - 1]?.slug}`}
                  >
                    {data.ancestors[data.ancestors.length - 1]?.title}
                  </TextLink>
                ) : null,
              },
            ]}
          />
          {data.skills.length ? (
            <div className="mt-5 space-y-2">
              <p className="label">Skills</p>
              <TagList items={data.skills.map((skill) => skill.name)} label="Skills" />
            </div>
          ) : null}
        </PageHeader>

        <div className="container-page">
          <div className="grid-editorial gap-y-12">
            <div className="col-span-4 space-y-12 sm:col-span-8 lg:col-span-9 lg:col-start-4">
              {data.image && data.image.width && data.image.height ? (
                <figure>
                  <Image
                    src={data.image.url}
                    alt={data.image.alt || `${data.title} certificate`}
                    width={data.image.width}
                    height={data.image.height}
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="h-auto w-full max-w-3xl rounded-xs border border-rule bg-muted"
                  />
                  {data.image.caption ? (
                    <figcaption className="mt-2 text-sm text-ink-3">
                      {data.image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ) : null}

              {data.pdf ? (
                <p>
                  <a href={data.pdf.url} className="link inline-flex min-h-11 items-center gap-1.5">
                    <Icon icon={FileDown} size={16} /> Certificate (PDF)
                  </a>
                </p>
              ) : null}

              {data.children.length ? (
                <section aria-labelledby="contents-title" className="border-t-2 border-ink pt-6">
                  <h2 id="contents-title" className="label mb-2">
                    In this {data.type.name.toLowerCase()}
                  </h2>
                  <CredentialTree nodes={data.children} />
                </section>
              ) : null}

              {data.relatedProject ? (
                <section aria-labelledby="applied-title" className="border-t-2 border-ink pt-6">
                  <h2 id="applied-title" className="label mb-3">
                    Applied in
                  </h2>
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <TextLink href={`/projects/${data.relatedProject.slug}`} arrow>
                      {data.relatedProject.title}
                    </TextLink>
                    <span className="font-mono text-xs text-ink-3">
                      {PROJECT_TYPE_LABELS[data.relatedProject.type]}
                    </span>
                  </p>
                </section>
              ) : null}

              {others.length ? (
                <section aria-labelledby="more-title" className="border-t-2 border-ink pt-6">
                  <h2 id="more-title" className="label mb-2">
                    More from {data.provider.name}
                  </h2>
                  <ul className="divide-y divide-rule">
                    {others.map((node) => (
                      <li
                        key={node.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-6 py-3"
                      >
                        <Link href={`/certifications/${node.slug}`} className="link">
                          {node.title}
                        </Link>
                        <span className="font-mono text-xs text-ink-3">{node.type.name}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p>
                <TextLink href="/certifications" arrow>
                  All certifications
                </TextLink>
              </p>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
