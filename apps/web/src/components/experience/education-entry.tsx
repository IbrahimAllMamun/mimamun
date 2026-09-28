import { educationAnchor, formatPeriod, type EducationDTO } from "@portfolio/shared";
import { Markdown } from "@/components/content/markdown";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";

export function formatGrade(item: EducationDTO): string | null {
  if (item.gradeValue === null) return null;
  const value = item.gradeValue.toFixed(2);
  const scale = item.gradeScale ? ` / ${item.gradeScale.toFixed(2)}` : "";
  return `${item.gradeLabel ?? "Grade"} ${value}${scale}`;
}

/** A degree: period in the margin, then degree, institution, grade and final project. */
export function EducationEntry({ item, headingLevel = 3 }: { item: EducationDTO; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const anchor = educationAnchor(item);
  const grade = formatGrade(item);
  const research = item.research[0];
  return (
    <article id={anchor} aria-labelledby={`${anchor}-title`} className="grid-editorial scroll-mt-(--sticky-offset) gap-y-3 border-t border-rule py-7">
      <p className="label col-span-4 sm:col-span-8 lg:col-span-3">{formatPeriod(item.startDate, item.endDate, item.isCurrent)}</p>
      <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-9">
        <header className="space-y-1">
          <Heading id={`${anchor}-title`} className="font-serif text-2xl leading-snug text-ink">
            {[item.degree, item.fieldOfStudy].filter(Boolean).join(" in ")}
          </Heading>
          <p className="text-ink-2">
            {item.institutionUrl ? <TextLink href={item.institutionUrl}>{item.institution}</TextLink> : item.institution}
            {item.location ? <span className="text-ink-3"> · {item.location}</span> : null}
          </p>
        </header>
        {grade ? <p className="font-mono text-sm text-ink tabular-nums">{grade}</p> : null}
        {item.projectTitle ? (
          <p className="max-w-measure text-ink-2">
            <span className="label mr-2">Project</span>
            {research ? (
              <TextLink href={`/research/${research.slug}`}>{item.projectTitle}</TextLink>
            ) : (
              <span className="font-serif-italic italic">{item.projectTitle}</span>
            )}
          </p>
        ) : null}
        <Markdown source={item.description} className="max-w-measure" headingBase={4} />
        {item.courses.length ? (
          <div className="space-y-2">
            <h4 className="label">Selected courses</h4>
            <TagList items={item.courses} label="Selected courses" />
          </div>
        ) : null}
      </div>
    </article>
  );
}
