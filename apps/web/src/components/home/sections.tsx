import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  formatMonth,
  formatShortDate,
  pluralize,
  type ApproachStepDTO,
  type BlogPostSummaryDTO,
  type EducationDTO,
  type ExperienceDTO,
  type FocusAreaDTO,
  type HomeDTO,
  type ProfileDTO,
  type ProjectSummaryDTO,
  type ResearchSummaryDTO,
  type SocialLinkDTO,
} from "@portfolio/shared";
import { ProjectRow } from "@/components/projects/project-row";
import { ResearchEntry } from "@/components/research/research-entry";
import { SectionHeader } from "@/components/site/section-header";
import { Trajectory } from "@/components/timeline/trajectory";
import { Icon } from "@/components/ui/icon";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/cn";

export function FocusSection({ areas, index }: { areas: FocusAreaDTO[]; index: string }) {
  if (areas.length === 0) return null;
  return (
    <section aria-labelledby="focus-title" className="container-page section-space">
      <SectionHeader index={index} label="Focus" id="focus-title" title="What I work on" />
      <div className="grid-editorial mt-8">
        <dl className="col-span-4 grid sm:col-span-8 sm:grid-cols-2 lg:col-span-9 lg:col-start-4">
          {areas.map((area, position) => (
            <div
              key={area.id}
              className={cn(
                "reveal border-t border-rule py-6 sm:pr-8",
                position % 2 === 1 && "sm:border-l sm:pl-8",
              )}
            >
              <dt className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-ink-3 tabular-nums">
                  {String(position + 1).padStart(2, "0")}
                </span>
                <span className="font-serif text-xl text-ink">{area.title}</span>
              </dt>
              <dd className="mt-2 text-ink-2">{area.description}</dd>
              {area.evidence ? (
                <dd className="mt-3 border-l-2 border-primary pl-3 text-sm text-ink-3">
                  <span className="sr-only">Evidence: </span>
                  {area.evidence}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function SelectedWork({
  projects,
  total,
  index,
}: {
  projects: ProjectSummaryDTO[];
  total: number;
  index: string;
}) {
  if (projects.length === 0) return null;
  const [lead, ...rest] = projects;
  return (
    <section aria-labelledby="work-title" className="container-page section-space pt-0">
      <SectionHeader
        index={index}
        label="Selected work"
        id="work-title"
        title="Projects, from problem to result"
        count={`n = ${total}`}
        action={
          <TextLink href="/projects" arrow>
            All projects
          </TextLink>
        }
      />
      {lead ? (
        <article className="group relative grid-editorial reveal mt-8 gap-y-3 border-t-2 border-ink py-8">
          <p className="label col-span-4 sm:col-span-8 lg:col-span-3">
            <span className="text-ink-2">Featured</span>
            <span className="block">
              {[lead.category?.name, lead.year].filter(Boolean).join(" · ")}
            </span>
          </p>
          <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-9">
            <h3 className="display text-4xl text-ink">
              <Link href={`/projects/${lead.slug}`} className="after:absolute after:inset-0">
                <span className="decoration-2 underline-offset-8 group-hover:underline">
                  {lead.title}
                </span>
              </Link>
            </h3>
            <p className="max-w-2xl text-lg text-ink-2">{lead.summary}</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Read the {lead.sectionCount > 1 ? "case study" : "overview"}
              <Icon
                icon={ArrowRight}
                size={14}
                className="transition-transform duration-(--duration-base) group-hover:translate-x-1"
              />
            </span>
          </div>
        </article>
      ) : null}
      {rest.length ? (
        <div className="reveal">
          {rest.map((project, position) => (
            <ProjectRow key={project.id} project={project} index={position + 1} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** Colour encodes the stage: method (green), research (purple), impact (orange). */
function stepTone(position: number, total: number): string {
  if (total > 1 && position === total - 1) return "bg-accent-mark";
  if (total > 2 && position === total - 2) return "bg-secondary";
  return "bg-primary";
}

/** The Statistics → Data → Modeling → Analytics → Research → Impact pipeline. */
export function ApproachSection({ steps, index }: { steps: ApproachStepDTO[]; index: string }) {
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="approach-title" className="bg-surface">
      <div className="container-page section-space">
        <SectionHeader
          index={index}
          label="Approach"
          id="approach-title"
          title="How I work with data"
          description={steps.map((step) => step.title).join(" → ")}
        />
        <ol className="relative mt-10 grid grid-cols-1 gap-y-8 md:grid-cols-3 md:gap-x-8 lg:grid-cols-6 lg:gap-x-6">
          <span
            aria-hidden
            className="absolute top-2 right-0 left-0 hidden h-px bg-rule-strong lg:block"
          />
          {steps.map((step, position) => (
            <li key={step.id} className="reveal relative pl-6 lg:pt-8 lg:pl-0">
              <span
                aria-hidden
                className={cn(
                  "absolute top-1.5 left-0 size-3 rounded-full ring-4 ring-surface lg:top-0",
                  stepTone(position, steps.length),
                )}
              />
              {position < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute top-5 -bottom-8 left-1.5 w-px bg-rule-strong md:hidden"
                />
              ) : null}
              <p className="font-mono text-xs text-ink-3">
                {String(position + 1).padStart(2, "0")}
                {position < steps.length - 1 ? <span className="sr-only">, then</span> : null}
              </p>
              <h3 className="mt-1 font-serif text-xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-2">{step.description}</p>
              {step.evidence ? (
                <p className="mt-3 text-xs leading-relaxed text-ink-3">{step.evidence}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ResearchSection({
  research,
  counts,
  index,
}: {
  research: ResearchSummaryDTO[];
  counts: HomeDTO["counts"];
  index: string;
}) {
  if (research.length === 0) return null;
  const meta = [
    pluralize(counts.research, "work"),
    counts.presentations ? pluralize(counts.presentations, "presentation") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <section aria-labelledby="research-title" className="container-page section-space">
      <SectionHeader
        index={index}
        label="Research"
        id="research-title"
        title="Research"
        description="Statistical and machine-learning research from my degrees, and where it has been presented."
        count={meta}
        action={
          <TextLink href="/research" arrow>
            All research
          </TextLink>
        }
      />
      <div className="mt-8">
        {research.map((item) => (
          <ResearchEntry key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function RoleSummary({ role, tense }: { role: ExperienceDTO; tense: "now" | "before" }) {
  return (
    <div className="space-y-2">
      <p className="label">{tense === "now" ? "Now" : "Before"}</p>
      <p className="font-serif text-xl text-ink">
        {role.position}, {role.company}
      </p>
      {role.department ? <p className="text-sm text-ink-2">{role.department}</p> : null}
      {role.summary ? <p className="text-ink-2">{role.summary}</p> : null}
    </div>
  );
}

export function TrajectorySection({ home, index }: { home: HomeDTO; index: string }) {
  const current = home.currentExperience[0];
  const previous = home.previousExperience[0];
  return (
    <section aria-labelledby="trajectory-title" className="container-page section-space pt-0">
      <SectionHeader
        index={index}
        label="Trajectory"
        id="trajectory-title"
        title="From statistics to credit analytics"
        action={
          <TextLink href="/experience" arrow>
            Full experience
          </TextLink>
        }
      />
      <div className="reveal mt-8">
        <Trajectory items={home.trajectory} figureNumber={1} />
      </div>
      {current || previous ? (
        <div className="grid-editorial mt-10 gap-y-8">
          {current ? (
            <div className="col-span-4 sm:col-span-4 lg:col-span-5 lg:col-start-4">
              <RoleSummary role={current} tense="now" />
            </div>
          ) : null}
          {previous ? (
            <div className="col-span-4 sm:col-span-4 lg:col-span-4">
              <RoleSummary role={previous} tense="before" />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function grade(item: EducationDTO): string | null {
  if (item.gradeValue === null) return null;
  return `${item.gradeLabel ?? "Grade"} ${item.gradeValue.toFixed(2)}${item.gradeScale ? ` / ${item.gradeScale.toFixed(2)}` : ""}`;
}

export function CredentialsSection({ home, index }: { home: HomeDTO; index: string }) {
  if (home.education.length === 0 && home.counts.credentials === 0) return null;
  return (
    <section aria-labelledby="credentials-title" className="container-page section-space pt-0">
      <SectionHeader
        index={index}
        label="Evidence"
        id="credentials-title"
        title="Education and certifications"
      />
      <div className="grid-editorial mt-8 gap-y-10">
        <div className="col-span-4 sm:col-span-8 lg:col-span-6 lg:col-start-4">
          <p className="label mb-3">Degrees</p>
          <ul className="divide-y divide-rule border-y border-rule">
            {home.education.map((item) => (
              <li key={item.id} className="py-4">
                <p className="font-serif text-lg text-ink">
                  {[item.degree, item.fieldOfStudy].filter(Boolean).join(" in ")}
                </p>
                <p className="text-sm text-ink-2">
                  {item.institution}
                  {item.startDate || item.endDate
                    ? ` · ${formatMonth(item.startDate)} – ${formatMonth(item.endDate)}`
                    : ""}
                </p>
                {grade(item) ? (
                  <p className="mt-1 font-mono text-xs text-ink-3 tabular-nums">{grade(item)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        {home.counts.credentials ? (
          <div className="col-span-4 sm:col-span-8 lg:col-span-3">
            <p className="label mb-3">Certifications</p>
            <p className="font-serif text-4xl text-ink tabular-nums">{home.counts.credentials}</p>
            <p className="mt-1 text-ink-2">
              {pluralize(home.counts.credentials, "certificate")} from{" "}
              {pluralize(home.counts.credentialProviders, "provider")}.
            </p>
            <p className="mt-4">
              <TextLink href="/certifications" arrow>
                Browse certifications
              </TextLink>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function WritingSection({ posts, index }: { posts: BlogPostSummaryDTO[]; index: string }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="writing-title" className="container-page section-space pt-0">
      <SectionHeader
        index={index}
        label="Writing"
        id="writing-title"
        title="Notes"
        action={
          <TextLink href="/blog" arrow>
            All writing
          </TextLink>
        }
      />
      <ul className="mt-8">
        {posts.map((post) => (
          <li key={post.id} className="group relative grid-editorial border-t border-rule py-5">
            <p className="label col-span-4 sm:col-span-2 lg:col-span-3">
              {formatShortDate(post.publishedAt)}
            </p>
            <div className="col-span-4 sm:col-span-6 lg:col-span-9">
              <Link
                href={`/blog/${post.slug}`}
                className="font-serif text-xl text-ink after:absolute after:inset-0 group-hover:underline"
              >
                {post.title}
              </Link>
              {post.excerpt ? <p className="mt-1 text-ink-2">{post.excerpt}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ContactSection({
  profile,
  links,
}: {
  profile: ProfileDTO;
  links: SocialLinkDTO[];
}) {
  const external = links.filter((link) => link.platform !== "email");
  return (
    <section aria-labelledby="contact-title" className="container-page">
      <div className="grid-editorial reveal gap-y-6 border-t-2 border-ink pt-10">
        <p className="label col-span-4 sm:col-span-8 lg:col-span-3">Contact</p>
        <div className="col-span-4 space-y-6 sm:col-span-8 lg:col-span-9">
          <h2 id="contact-title" className="display max-w-3xl text-4xl text-ink">
            Questions about my work, a role or research? Write to me.
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-lg">
            {profile.email ? (
              <a href={`mailto:${profile.email}`} className="link font-serif">
                {profile.email}
              </a>
            ) : null}
            <TextLink href="/contact" arrow>
              Contact form
            </TextLink>
            {external.map((link) => (
              <TextLink key={link.id} href={link.url}>
                {link.label}
              </TextLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
