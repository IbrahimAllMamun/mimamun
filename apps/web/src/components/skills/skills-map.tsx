import {
  SKILL_LEVEL_LABELS,
  type ProjectLinkDTO,
  type SkillCategoryDTO,
  type SkillDTO,
} from "@portfolio/shared";
import { TextLink } from "@/components/ui/text-link";

function uniqueProjects(category: SkillCategoryDTO): ProjectLinkDTO[] {
  const seen = new Map<string, ProjectLinkDTO>();
  const visit = (node: SkillCategoryDTO) => {
    for (const skill of node.skills)
      for (const project of skill.projects) seen.set(project.slug, project);
    node.children.forEach(visit);
  };
  visit(category);
  return [...seen.values()];
}

function SkillList({ skills }: { skills: SkillDTO[] }) {
  if (skills.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-1 gap-y-1 text-ink">
      {skills.map((skill, index) => (
        <li key={skill.id} className="inline">
          <span>{skill.name}</span>
          {skill.level || skill.years ? (
            <span className="ml-1 font-mono text-xs text-ink-3">
              (
              {[
                skill.level ? SKILL_LEVEL_LABELS[skill.level] : null,
                skill.years ? `${skill.years} yrs` : null,
              ]
                .filter(Boolean)
                .join(", ")}
              )
            </span>
          ) : null}
          {index < skills.length - 1 ? (
            <span aria-hidden className="text-ink-3">
              {" "}
              ·
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Table 1 — the toolkit, grouped by the categories stored in the CMS. Skills
 * carry a level only when one was recorded; there are no percentage bars.
 * The last column lists the projects where the skills were used.
 */
export function SkillsMap({
  categories,
  tableNumber,
}: {
  categories: SkillCategoryDTO[];
  tableNumber?: number;
}) {
  if (categories.length === 0) return null;
  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-baseline gap-x-3">
        {tableNumber ? <span className="label">Table {tableNumber}</span> : null}
        <span className="font-serif text-lg text-ink">Skills and tools by area</span>
      </figcaption>
      <div className="border-y-2 border-ink">
        <div
          aria-hidden
          className="hidden border-b border-rule py-2 lg:grid lg:grid-cols-12 lg:gap-x-6"
        >
          <span className="label col-span-3">Area</span>
          <span className="label col-span-6">Skills and tools</span>
          <span className="label col-span-3">Used in</span>
        </div>
        <dl>
          {categories.map((category) => {
            const projects = uniqueProjects(category);
            return (
              <div
                key={category.id}
                className="grid grid-cols-1 gap-y-2 border-b border-rule py-4 last:border-b-0 lg:grid-cols-12 lg:gap-x-6"
              >
                <dt className="lg:col-span-3">
                  <span className="font-medium text-ink">{category.name}</span>
                  {category.description ? (
                    <span className="block text-sm text-ink-3">{category.description}</span>
                  ) : null}
                </dt>
                <dd className="space-y-2 lg:col-span-6">
                  <SkillList skills={category.skills} />
                  {category.children.map((child) => (
                    <div key={child.id} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                      <span className="label shrink-0 pt-1">{child.name}</span>
                      <SkillList skills={child.skills} />
                    </div>
                  ))}
                </dd>
                <dd className="text-sm lg:col-span-3">
                  {projects.length ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 lg:block">
                      <span className="label shrink-0 whitespace-nowrap lg:hidden">Used in</span>
                      <ul className="flex flex-col gap-1">
                        {projects.map((project) => (
                          <li key={project.slug}>
                            <TextLink href={`/projects/${project.slug}`}>{project.title}</TextLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <span className="hidden text-ink-3 lg:inline" aria-hidden>
                      —
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </figure>
  );
}
