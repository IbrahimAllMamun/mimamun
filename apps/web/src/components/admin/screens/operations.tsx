"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import type {
  AdminGithubRepoDTO,
  AuditLogDTO,
  OptionsDTO,
  PageMeta,
  SystemStatusDTO,
} from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatBytes } from "../media/media-utils";
import { AdminPageHeader, EmptyPanel, ErrorPanel, LoadingRows, Panel, relativeTime } from "../page";
import { useToast } from "../toast";
import { useApiQuery, withQuery } from "../use-api";

// ── Audit log ────────────────────────────────────────────────────────────

function preview(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

/** Shows only the fields that changed between the stored before/after snapshots. */
function Changes({ before, after }: { before: unknown; after: unknown }) {
  const a = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const b = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
    (key) =>
      !["updatedAt", "createdAt", "searchText", "updatedBy"].includes(key) &&
      JSON.stringify(a[key]) !== JSON.stringify(b[key]),
  );
  if (keys.length === 0)
    return <p className="text-sm text-ink-3">No field-level changes recorded.</p>;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-ink-3">
          <th scope="col" className="py-1 pr-3 font-medium">
            Field
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            Before
          </th>
          <th scope="col" className="py-1 font-medium">
            After
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {keys.map((key) => (
          <tr key={key} className="align-top">
            <td className="py-1.5 pr-3 font-mono text-ink">{key}</td>
            <td className="py-1.5 pr-3 break-all text-error">{preview(a[key])}</td>
            <td className="py-1.5 break-all text-success">{preview(b[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AuditLogPage() {
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const logs = useApiQuery<AuditLogDTO[], PageMeta>(
    withQuery("/api/admin/audit-logs", { q, entityType, page }),
  );
  const types = [
    "project",
    "research",
    "publication",
    "presentation",
    "blog_post",
    "experience",
    "education",
    "credential",
    "skill",
    "media",
    "user",
    "role",
    "settings",
    "profile",
    "seo",
    "message",
    "integration",
  ];

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="Every sign-in, change and deletion, with who did it and what changed. Entries cannot be edited."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Icon
            icon={Search}
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder="Search summaries, actions or people"
            aria-label="Search the audit log"
            className="min-h-10 w-full rounded-sm border border-rule-strong bg-elevated pr-3 pl-9 text-sm"
          />
        </div>
        <select
          value={entityType}
          onChange={(event) => {
            setEntityType(event.target.value);
            setPage(1);
          }}
          aria-label="Type"
          className="min-h-10 rounded-sm border border-rule-strong bg-elevated px-2 text-sm"
        >
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {logs.error ? <ErrorPanel error={logs.error} onRetry={logs.reload} /> : null}
      {!logs.data && !logs.error ? <LoadingRows /> : null}
      {logs.data && logs.data.length === 0 ? <EmptyPanel title="Nothing recorded" /> : null}
      {logs.data?.length ? (
        <ol
          className={cn(
            "divide-y divide-rule rounded-md border border-rule bg-elevated",
            logs.loading && "opacity-60",
          )}
        >
          {logs.data.map((entry) => {
            const expanded = open === entry.id;
            const hasChanges = entry.previousValue !== null || entry.newValue !== null;
            return (
              <li key={entry.id} className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : entry.id)}
                  aria-expanded={hasChanges ? expanded : undefined}
                  disabled={!hasChanges}
                  className="flex w-full items-start gap-3 text-left disabled:cursor-default"
                >
                  <Icon
                    icon={expanded ? ChevronDown : ChevronRight}
                    size={14}
                    className={cn("mt-1 shrink-0 text-ink-3", !hasChanges && "invisible")}
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="text-ink">{entry.summary ?? entry.action}</span>
                    <span className="block text-xs text-ink-3">
                      {entry.actor.name ?? entry.actor.email ?? "System"} ·{" "}
                      <span className="font-mono">{entry.action}</span>
                      {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                    </span>
                  </span>
                  <time
                    dateTime={entry.createdAt}
                    title={new Date(entry.createdAt).toLocaleString("en-GB")}
                    className="shrink-0 text-xs text-ink-3"
                  >
                    {relativeTime(entry.createdAt)}
                  </time>
                </button>
                {expanded ? (
                  <div className="mt-2 ml-7 rounded-sm bg-surface p-3">
                    <Changes before={entry.previousValue} after={entry.newValue} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
      {logs.meta && logs.meta.totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Newer
          </Button>
          <span className="text-ink-3">
            Page {logs.meta.page} of {logs.meta.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= logs.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Older
          </Button>
        </nav>
      ) : null}
    </>
  );
}

// ── Integrations ─────────────────────────────────────────────────────────

interface GithubAdminDTO {
  username: string | null;
  syncEnabled: boolean;
  tokenConfigured: boolean;
  status: {
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
  };
  repositories: AdminGithubRepoDTO[];
}

export function IntegrationsPage() {
  const toast = useToast();
  const github = useApiQuery<GithubAdminDTO>("/api/admin/integrations/github");
  const projects = useApiQuery<OptionsDTO>("/api/admin/options?types=projects");
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    const result = await apiRequest<{ repositories: number }>(
      "POST",
      "/api/admin/integrations/github/sync",
    );
    setSyncing(false);
    if (!result.ok) toast.error(result.error.message);
    else toast.success(`Synced ${result.data.repositories} repositories`);
    github.reload();
  };

  const update = async (
    repo: AdminGithubRepoDTO,
    changes: Partial<
      Pick<AdminGithubRepoDTO, "isSelected" | "displayOrder" | "customDescription" | "projectId">
    >,
  ) => {
    const body = {
      isSelected: repo.isSelected,
      displayOrder: repo.displayOrder,
      customDescription: repo.customDescription,
      projectId: repo.projectId,
      ...changes,
    };
    const result = await apiRequest(
      "PATCH",
      `/api/admin/integrations/github/repositories/${repo.id}`,
      body,
    );
    if (!result.ok) toast.error(result.error.message);
    else github.reload();
  };

  const data = github.data;
  return (
    <>
      <AdminPageHeader
        title="Integrations"
        description="Public GitHub repositories, synced on a schedule and cached, so the site never depends on GitHub being available."
        actions={
          <Button onClick={() => void sync()} pending={syncing} disabled={!data?.username}>
            <Icon icon={RefreshCw} size={16} /> Sync now
          </Button>
        }
      />
      {github.error ? <ErrorPanel error={github.error} onRetry={github.reload} /> : null}
      {!data && !github.error ? <LoadingRows /> : null}
      {data ? (
        <div className="space-y-6">
          <Panel title="GitHub">
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="label">Account</dt>
                <dd className="mt-1">
                  {data.username ? (
                    <a
                      href={`https://github.com/${data.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      @{data.username} <Icon icon={ExternalLink} size={12} />
                    </a>
                  ) : (
                    <Link href="/admin/settings" className="text-primary hover:underline">
                      Set a username
                    </Link>
                  )}
                </dd>
              </div>
              <div>
                <dt className="label">Automatic sync</dt>
                <dd className="mt-1">
                  {data.syncEnabled ? (
                    <StatusBadge tone="positive">On</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Off</StatusBadge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="label">API token</dt>
                <dd className="mt-1 text-ink-2">
                  {data.tokenConfigured
                    ? "Configured (higher rate limit)"
                    : "Not set (public rate limit)"}
                </dd>
              </div>
              <div>
                <dt className="label">Last successful sync</dt>
                <dd className="mt-1 text-ink-2">
                  {data.status.lastSuccessAt ? relativeTime(data.status.lastSuccessAt) : "Never"}
                </dd>
              </div>
            </dl>
            {data.status.lastError &&
            data.status.lastErrorAt &&
            (!data.status.lastSuccessAt || data.status.lastErrorAt > data.status.lastSuccessAt) ? (
              <p className="mt-4 rounded-sm border border-error/40 bg-error-tint px-3 py-2 text-sm">
                Last attempt failed {relativeTime(data.status.lastErrorAt)}: {data.status.lastError}
                . The site keeps showing the previous data.
              </p>
            ) : null}
          </Panel>

          <Panel
            title="Repositories"
            description="Choose which repositories appear on the Projects page and link them to case studies."
            padded={false}
          >
            {data.repositories.length === 0 ? (
              <p className="p-5 text-sm text-ink-3">
                {data.username
                  ? "Nothing synced yet. Use “Sync now”."
                  : "Set a GitHub username in Settings first."}
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {data.repositories.map((repo) => (
                  <li
                    key={repo.id}
                    className="grid gap-3 px-5 py-3 md:grid-cols-(--repo-columns) md:items-start"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={repo.isSelected}
                        onChange={(event) =>
                          void update(repo, { isSelected: event.target.checked })
                        }
                        className="mt-1 size-4 accent-primary"
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-mono text-ink">{repo.fullName}</span>
                        <span className="block text-ink-3">
                          {[
                            repo.primaryLanguage,
                            repo.stars ? `★ ${repo.stars}` : null,
                            repo.pushedAt ? `updated ${relativeTime(repo.pushedAt)}` : null,
                            repo.isFork ? "fork" : null,
                            repo.isArchived ? "archived" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {repo.description ? (
                          <span className="mt-1 block text-ink-2">{repo.description}</span>
                        ) : null}
                      </span>
                    </label>
                    <select
                      value={repo.projectId ?? ""}
                      onChange={(event) =>
                        void update(repo, { projectId: event.target.value || null })
                      }
                      aria-label={`Case study for ${repo.fullName}`}
                      className="min-h-9 rounded-sm border border-rule-strong bg-elevated px-2 text-sm"
                    >
                      <option value="">No case study</option>
                      {(projects.data?.projects ?? []).map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  );
}

// ── System ───────────────────────────────────────────────────────────────

function duration(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? `${days}d` : null, hours ? `${hours}h` : null, `${minutes}m`]
    .filter(Boolean)
    .join(" ");
}

export function SystemPage() {
  const { data, error, reload, loading } = useApiQuery<SystemStatusDTO>("/api/admin/system");
  return (
    <>
      <AdminPageHeader
        title="System"
        description="Health of the running services. Load balancers and monitors can use /api/health and /api/health/db."
        actions={
          <Button variant="secondary" onClick={reload} pending={loading}>
            <Icon icon={RefreshCw} size={16} /> Refresh
          </Button>
        }
      />
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {!data && !error ? <LoadingRows /> : null}
      {data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Application">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="label">Version</dt>
                <dd className="mt-1 font-mono">{data.version}</dd>
              </div>
              <div>
                <dt className="label">Environment</dt>
                <dd className="mt-1">{data.environment}</dd>
              </div>
              <div>
                <dt className="label">Node.js</dt>
                <dd className="mt-1 font-mono">{data.nodeVersion}</dd>
              </div>
              <div>
                <dt className="label">Uptime</dt>
                <dd className="mt-1">{duration(data.uptimeSeconds)}</dd>
              </div>
              <div>
                <dt className="label">Memory (RSS)</dt>
                <dd className="mt-1">{formatBytes(data.memory.rssBytes)}</dd>
              </div>
              <div>
                <dt className="label">Heap used</dt>
                <dd className="mt-1">{formatBytes(data.memory.heapUsedBytes)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Database">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="label">Status</dt>
                <dd className="mt-1">
                  {data.database.status === "ok" ? (
                    <StatusBadge tone="positive">Connected</StatusBadge>
                  ) : (
                    <StatusBadge tone="negative">Unavailable</StatusBadge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="label">Latency</dt>
                <dd className="mt-1">
                  {data.database.latencyMs !== null ? `${data.database.latencyMs} ms` : "—"}
                </dd>
              </div>
              <div>
                <dt className="label">Migrations applied</dt>
                <dd className="mt-1">{data.database.migrationsApplied}</dd>
              </div>
              <div>
                <dt className="label">Last migration</dt>
                <dd className="mt-1">
                  {data.database.lastMigrationAt
                    ? relativeTime(data.database.lastMigrationAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="label">Size</dt>
                <dd className="mt-1">
                  {data.database.sizeBytes !== null ? formatBytes(data.database.sizeBytes) : "—"}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Storage and mail">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="label">Storage</dt>
                <dd className="mt-1">{data.storage.driver}</dd>
              </div>
              <div>
                <dt className="label">Files</dt>
                <dd className="mt-1">
                  {data.storage.files} · {formatBytes(data.storage.totalBytes)}
                </dd>
              </div>
              <div>
                <dt className="label">Email (SMTP)</dt>
                <dd className="mt-1">
                  {data.mail.configured ? (
                    <StatusBadge tone="positive">Configured</StatusBadge>
                  ) : (
                    <StatusBadge tone="attention">Not configured</StatusBadge>
                  )}
                </dd>
              </div>
            </dl>
            {!data.mail.configured ? (
              <p className="mt-3 text-sm text-ink-3">
                Set the SMTP variables on the server to receive contact notifications and password
                reset emails.
              </p>
            ) : null}
          </Panel>
          <Panel title="Integrations">
            <ul className="space-y-2 text-sm">
              {data.integrations.map((integration) => (
                <li key={integration.key} className="flex items-center justify-between gap-3">
                  <span>{integration.label}</span>
                  <span className="text-ink-3">
                    {integration.enabled
                      ? integration.lastSuccessAt
                        ? `last sync ${relativeTime(integration.lastSuccessAt)}`
                        : "never synced"
                      : "off"}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
