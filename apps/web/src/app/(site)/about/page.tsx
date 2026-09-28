import type { Metadata } from "next";
import Image from "next/image";
import { Download } from "lucide-react";
import { pluralize } from "@portfolio/shared";
import { Markdown } from "@/components/content/markdown";
import { EducationEntry } from "@/components/experience/education-entry";
import { ApproachSection, ContactSection } from "@/components/home/sections";
import { JsonLd } from "@/components/site/json-ld";
import { MetaTable } from "@/components/site/meta-table";
import { PageHeader } from "@/components/site/page-header";
import { SectionHeader } from "@/components/site/section-header";
import { SkillsMap } from "@/components/skills/skills-map";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { UnavailableNotice } from "@/components/ui/states";
import { TextLink } from "@/components/ui/text-link";
import { publicApi } from "@/lib/api/server";
import { graph, pageMetadata, personSchema } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicApi.site();
  return pageMetadata({ site: site.ok ? site.data : null, title: "About", path: "/about", routeKey: "about", type: "profile" });
}

export default async function AboutPage() {
  const [site, about] = await Promise.all([publicApi.site(), publicApi.about()]);
  if (!site.ok || !about.ok) {
    return (
      <>
        <PageHeader eyebrow="About" title="About" />
        <div className="container-page">
          <UnavailableNotice title="This page is temporarily unavailable" />
        </div>
      </>
    );
  }
  const { profile, socialLinks } = site.data;
  const data = about.data;
  const current = data.experience.find((role) => role.isCurrent);
  const elsewhere = socialLinks.filter((link) => link.platform !== "email");

  // Section numbers follow the sections actually shown.
  const order = [
    profile.bio && "background",
    data.approachSteps.length > 0 && "approach",
    data.skills.length > 0 && "toolkit",
    profile.researchInterests && "research",
    (data.education.length > 0 || data.credentialSummary.total > 0) && "education",
    profile.interests && "interests",
  ].filter(Boolean) as string[];
  const index = (key: string) => String(order.indexOf(key) + 1).padStart(2, "0");

  return (
    <>
      <JsonLd data={graph(personSchema(site.data))} />
      <PageHeader eyebrow="About" title={profile.fullName} lead={profile.statement}>
        <MetaTable
          className="mt-4"
          items={[
            { label: "Currently", value: current ? `${current.position}, ${current.company}` : profile.headline },
            { label: "Based in", value: profile.location },
            {
              label: "Email",
              value: profile.email ? (
                <a href={`mailto:${profile.email}`} className="link">
                  {profile.email}
                </a>
              ) : null,
            },
            {
              label: "Elsewhere",
              value: elsewhere.length ? (
                <span className="flex flex-wrap gap-x-4">
                  {elsewhere.map((link) => (
                    <TextLink key={link.id} href={link.url}>
                      {link.label}
                    </TextLink>
                  ))}
                </span>
              ) : null,
            },
          ]}
        />
        {profile.availability ? <p className="mt-4 text-ink-2">{profile.availability}</p> : null}
        {profile.cv ? (
          <div className="mt-6">
            <ButtonLink href="/cv" variant="secondary">
              <Icon icon={Download} size={16} /> Download CV
            </ButtonLink>
          </div>
        ) : null}
      </PageHeader>

      {profile.bio ? (
        <section aria-labelledby="background-title" className="container-page section-space pt-4">
          <SectionHeader index={index("background")} label="Profile" id="background-title" title="Background" />
          <div className="grid-editorial mt-8 gap-y-6">
            {profile.avatar && profile.avatar.width && profile.avatar.height ? (
              <div className="col-span-2 sm:col-span-3 lg:col-span-3">
                <Image
                  src={profile.avatar.url}
                  alt={profile.avatar.alt || profile.fullName}
                  width={profile.avatar.width}
                  height={profile.avatar.height}
                  sizes="(min-width: 1024px) 20vw, 40vw"
                  className="h-auto w-full rounded-xs border border-rule bg-muted"
                />
              </div>
            ) : null}
            <Markdown
              source={profile.bio}
              className="col-span-4 max-w-measure text-lg sm:col-span-8 lg:col-span-9 lg:col-start-4"
              headingBase={3}
            />
          </div>
        </section>
      ) : null}

      <ApproachSection steps={data.approachSteps} index={index("approach")} />

      {data.skills.length ? (
        <section aria-labelledby="toolkit-title" className="container-page section-space">
          <SectionHeader
            index={index("toolkit")}
            label="Toolkit"
            id="toolkit-title"
            title="Skills and tools"
            description="Grouped by area. Levels appear only where I have recorded them."
          />
          <div className="reveal mt-8">
            <SkillsMap categories={data.skills} tableNumber={1} />
          </div>
        </section>
      ) : null}

      {profile.researchInterests ? (
        <section aria-labelledby="interests-title" className="container-page section-space pt-0">
          <SectionHeader
            index={index("research")}
            label="Research"
            id="interests-title"
            title="Research interests"
            description={profile.researchInterests}
            action={
              <TextLink href="/research" arrow>
                Research
              </TextLink>
            }
          />
        </section>
      ) : null}

      {data.education.length || data.credentialSummary.total ? (
        <section id="education" aria-labelledby="education-title" className="container-page section-space scroll-mt-(--sticky-offset) pt-0">
          <SectionHeader index={index("education")} label="Evidence" id="education-title" title="Education and certifications" />
          <div className="mt-2">
            {data.education.map((item) => (
              <EducationEntry key={item.id} item={item} />
            ))}
          </div>
          {data.credentialSummary.total ? (
            <div className="grid-editorial gap-y-3 border-t border-rule py-7">
              <p className="label col-span-4 sm:col-span-8 lg:col-span-3">Certifications</p>
              <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-9">
                <p className="font-serif text-2xl text-ink">
                  {pluralize(data.credentialSummary.total, "certificate")} from{" "}
                  {pluralize(data.credentialSummary.providers.length, "provider")}
                </p>
                <ul className="flex flex-wrap gap-x-6 gap-y-1">
                  {data.credentialSummary.providers.map((provider) => (
                    <li key={provider.slug} className="text-ink-2">
                      <TextLink href={`/certifications#${provider.slug}`}>{provider.name}</TextLink>
                      <span className="ml-1.5 font-mono text-xs text-ink-3 tabular-nums">{provider.count}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  <TextLink href="/certifications" arrow>
                    All certifications
                  </TextLink>
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {profile.interests ? (
        <section aria-labelledby="beyond-title" className="container-page section-space pt-0">
          <SectionHeader index={index("interests")} label="Elsewhere" id="beyond-title" title="Outside work" />
          <div className="grid-editorial mt-6">
            <Markdown
              source={profile.interests}
              className="col-span-4 max-w-measure sm:col-span-8 lg:col-span-9 lg:col-start-4"
              headingBase={3}
            />
          </div>
        </section>
      ) : null}

      <ContactSection profile={profile} links={socialLinks} />
    </>
  );
}
