import { ArrowRight, Download } from "lucide-react";
import { formatMonth, type EducationDTO, type ExperienceDTO, type ProfileDTO } from "@portfolio/shared";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextLink } from "@/components/ui/text-link";
import { stagger } from "@/lib/style";

function roleLine(experience: ExperienceDTO): string {
  return `${experience.position}, ${experience.company}`;
}

/**
 * The home page opens like a paper's title block: name, statement, actions,
 * and an affiliation table built from the database (current role, previous
 * role, education, location).
 */
export function FrontMatter({
  profile,
  current,
  previous,
  education,
}: {
  profile: ProfileDTO;
  current: ExperienceDTO[];
  previous: ExperienceDTO[];
  education: EducationDTO[];
}) {
  const facts: { label: string; value: string; detail?: string | null }[] = [];
  for (const role of current) {
    facts.push({
      label: "Currently",
      value: roleLine(role),
      detail: [role.department, role.startDate ? `since ${formatMonth(role.startDate)}` : null].filter(Boolean).join(" · "),
    });
  }
  const last = previous[0];
  if (last) {
    facts.push({
      label: "Previously",
      value: roleLine(last),
      detail: [last.department, last.endDate ? `until ${formatMonth(last.endDate)}` : null].filter(Boolean).join(" · "),
    });
  }
  if (education.length) {
    const institutions = [...new Set(education.map((item) => item.institution))].join(", ");
    facts.push({
      label: "Trained in",
      value: education.map((item) => [item.degree, item.fieldOfStudy].filter(Boolean).join(" ")).join("; "),
      detail: institutions,
    });
  }
  if (profile.location) facts.push({ label: "Based in", value: profile.location });

  return (
    <section aria-labelledby="front-matter-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="analytic-grid fade-out-bottom pointer-events-none absolute inset-0"
      />
      <div className="relative container-page pt-12 sm:pt-16 lg:pt-24">
        <div className="grid-editorial gap-y-6">
          <div className="col-span-4 sm:col-span-8 lg:col-span-3">
            <p className="label motion-enter">{profile.headline}</p>
          </div>
          <div className="col-span-4 sm:col-span-8 lg:col-span-9">
            <h1 id="front-matter-title" className="display motion-enter text-5xl text-ink" style={stagger(1)}>
              {profile.fullName}
            </h1>
            {profile.statement ? (
              <p className="motion-enter mt-6 max-w-3xl font-serif text-2xl leading-snug text-ink-2" style={stagger(2)}>
                {profile.statement}
              </p>
            ) : null}
            <div className="motion-enter mt-8 flex flex-wrap items-center gap-3" style={stagger(3)}>
              <ButtonLink href="/projects">
                Selected work <Icon icon={ArrowRight} size={16} />
              </ButtonLink>
              {profile.cv ? (
                <ButtonLink href="/cv" variant="secondary">
                  <Icon icon={Download} size={16} /> Download CV
                </ButtonLink>
              ) : null}
              <TextLink href="/contact" className="ml-1 text-sm">
                Get in touch
              </TextLink>
            </div>
          </div>
        </div>

        {facts.length ? (
          <div className="mt-14 lg:mt-20">
            <div aria-hidden className="motion-rule h-0.5 bg-ink" />
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {facts.map((fact, index) => (
                <div
                  key={fact.label}
                  className="motion-enter border-rule py-5 sm:pr-6 sm:[&:nth-child(even)]:border-l sm:[&:nth-child(even)]:pl-6 lg:border-l lg:pl-6 lg:first:border-l-0 lg:first:pl-0 max-sm:[&:not(:first-child)]:border-t"
                  style={stagger(4 + index)}
                >
                  <dt className="label">{fact.label}</dt>
                  <dd className="mt-2 text-ink">{fact.value}</dd>
                  {fact.detail ? <dd className="mt-1 text-sm text-ink-3">{fact.detail}</dd> : null}
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}
