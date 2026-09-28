import { formatShortDate, type GithubSectionDTO } from "@portfolio/shared";
import { SectionHeader } from "@/components/site/section-header";
import { TextLink } from "@/components/ui/text-link";

/**
 * Curated public repositories from the GitHub integration. Shows only what the
 * last successful sync stored; when nothing is curated it falls back to a link
 * to the profile.
 */
export function GithubSection({ github }: { github: GithubSectionDTO }) {
  if (github.repositories.length === 0) {
    return github.profileUrl ? (
      <p className="border-t border-rule pt-5 text-ink-2">
        More code is on{" "}
        <TextLink href={github.profileUrl}>GitHub{github.username ? ` (@${github.username})` : ""}</TextLink>.
      </p>
    ) : null;
  }
  return (
    <section aria-labelledby="code-title">
      <SectionHeader
        label="Code"
        id="code-title"
        title="Open-source repositories"
        count={github.lastSyncedAt ? `Synced ${formatShortDate(github.lastSyncedAt)}` : null}
        action={github.profileUrl ? <TextLink href={github.profileUrl}>All repositories</TextLink> : null}
      />
      <ul className="mt-6 grid gap-x-8 sm:grid-cols-2">
        {github.repositories.map((repo) => (
          <li key={repo.id} className="group relative space-y-2 border-t border-rule py-5">
            <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-ink after:absolute after:inset-0 group-hover:underline">
              {repo.fullName}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {repo.description ? <p className="text-ink-2">{repo.description}</p> : null}
            {repo.languages.length ? (
              <div aria-label="Languages" className="flex h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-muted">
                {repo.languages.slice(0, 4).map((language, index) => (
                  <span
                    key={language.name}
                    title={`${language.name} ${Math.round(language.share * 100)}%`}
                    className={["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"][index]}
                    style={{ width: `${language.share * 100}%` }}
                  />
                ))}
              </div>
            ) : null}
            <p className="flex flex-wrap gap-x-4 font-mono text-xs text-ink-3">
              {repo.languages.length ? (
                <span>{repo.languages.slice(0, 3).map((language) => `${language.name} ${Math.round(language.share * 100)}%`).join(" · ")}</span>
              ) : repo.primaryLanguage ? (
                <span>{repo.primaryLanguage}</span>
              ) : null}
              {repo.stars ? <span>★ {repo.stars}</span> : null}
              {repo.pushedAt ? <span>Updated {formatShortDate(repo.pushedAt)}</span> : null}
            </p>
            {repo.project ? (
              <p className="relative z-10 text-sm">
                <TextLink href={`/projects/${repo.project.slug}`} arrow>
                  Case study
                </TextLink>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
