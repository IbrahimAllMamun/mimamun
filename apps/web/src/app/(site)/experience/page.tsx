import type { Metadata } from "next";
import { Download } from "lucide-react";
import { formatMonthLong } from "@portfolio/shared";
import { EducationEntry } from "@/components/experience/education-entry";
import { RoleEntry } from "@/components/experience/role-entry";
import { PageHeader } from "@/components/site/page-header";
import { SectionHeader } from "@/components/site/section-header";
import { Trajectory } from "@/components/timeline/trajectory";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, UnavailableNotice } from "@/components/ui/states";
import { TextLink } from "@/components/ui/text-link";
import { publicApi } from "@/lib/api/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicApi.site();
  return pageMetadata({ site: site.ok ? site.data : null, title: "Experience", path: "/experience", routeKey: "experience" });
}

export default async function ExperiencePage() {
  const [site, experience] = await Promise.all([publicApi.site(), publicApi.experience()]);
  const cv = site.ok ? site.data.profile.cv : null;

  if (!experience.ok) {
    return (
      <>
        <PageHeader eyebrow="Experience" title="Experience" />
        <div className="container-page">
          <UnavailableNotice title="Experience is temporarily unavailable" />
        </div>
      </>
    );
  }

  const { experiences, education, trajectory } = experience.data;
  const current = experiences.find((role) => role.isCurrent);
  const lead = current
    ? `${current.position} at ${current.company}${current.startDate ? ` since ${formatMonthLong(current.startDate)}` : ""}.`
    : null;

  return (
    <>
      <PageHeader eyebrow="Experience" title="Experience" lead={lead}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {cv ? (
            <ButtonLink href="/cv" variant="secondary">
              <Icon icon={Download} size={16} /> Download CV
            </ButtonLink>
          ) : null}
          <TextLink href="/contact" arrow>
            Get in touch
          </TextLink>
        </div>
      </PageHeader>

      <div className="container-page space-y-(--space-section)">
        {trajectory.length ? (
          <section aria-label="Trajectory" className="reveal">
            <Trajectory items={trajectory} figureNumber={1} />
          </section>
        ) : null}

        <section aria-labelledby="roles-title">
          <SectionHeader
            index="01"
            label="Roles"
            id="roles-title"
            title="Professional experience"
            count={experiences.length ? `n = ${experiences.length}` : null}
          />
          <div className="mt-2">
            {experiences.length ? (
              experiences.map((role) => <RoleEntry key={role.id} role={role} />)
            ) : (
              <EmptyState title="No roles listed yet" />
            )}
          </div>
        </section>

        {education.length ? (
          <section aria-labelledby="education-title">
            <SectionHeader index="02" label="Education" id="education-title" title="Degrees" />
            <div className="mt-2">
              {education.map((item) => (
                <EducationEntry key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
