"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, ExternalLink, Plus, Upload } from "lucide-react";
import {
  ENTITY_TYPE_LABELS,
  PERMISSIONS,
  type DashboardDTO,
  type EntityType,
} from "@portfolio/shared";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { AdminPageHeader, ErrorPanel, LoadingRows, Panel, relativeTime } from "../page";
import { useCan, useSession } from "../session";
import { useApiQuery } from "../use-api";

function StatCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: number;
  detail?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-md border border-rule bg-elevated px-4 py-3 transition-colors hover:border-ink-3"
    >
      <p className="label">{label}</p>
      <p className="mt-1 font-serif text-3xl text-ink tabular-nums">{value}</p>
      {detail ? <p className="text-xs text-ink-3">{detail}</p> : null}
    </Link>
  );
}

function statusDetail(counts: { published: number; draft: number; archived: number }): string {
  return [
    `${counts.draft} draft${counts.draft === 1 ? "" : "s"}`,
    counts.archived ? `${counts.archived} archived` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function change(current: number, previous: number): string | null {
  if (!previous) return null;
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% on the previous week`;
}

export function Dashboard() {
  const session = useSession();
  const can = useCan();
  const { data, error, reload } = useApiQuery<DashboardDTO>("/api/admin/dashboard");

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`Signed in as ${session.user.name} (${session.user.role.name}).`}
        actions={
          <>
            {can(PERMISSIONS.MEDIA_MANAGE) ? (
              <ButtonLink href="/admin/media" variant="secondary">
                <Icon icon={Upload} size={16} /> Media
              </ButtonLink>
            ) : null}
            {can(PERMISSIONS.CONTENT_WRITE) ? (
              <ButtonLink href="/admin/projects/new">
                <Icon icon={Plus} size={16} /> New project
              </ButtonLink>
            ) : null}
          </>
        }
      />
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {!data && !error ? <LoadingRows rows={8} /> : null}
      {data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <StatCard
              label="Projects"
              value={data.counts.projects.published}
              detail={statusDetail(data.counts.projects)}
              href="/admin/projects"
            />
            <StatCard
              label="Research"
              value={data.counts.research.published}
              detail={statusDetail(data.counts.research)}
              href="/admin/research"
            />
            <StatCard
              label="Publications"
              value={data.counts.publications.published}
              detail={statusDetail(data.counts.publications)}
              href="/admin/publications"
            />
            <StatCard
              label="Writing"
              value={data.counts.posts.published}
              detail={statusDetail(data.counts.posts)}
              href="/admin/blog-posts"
            />
            <StatCard
              label="Certifications"
              value={data.counts.credentials}
              href="/admin/credentials"
            />
            <StatCard label="Media files" value={data.counts.media} href="/admin/media" />
            {can(PERMISSIONS.MESSAGES_MANAGE) ? (
              <StatCard
                label="New messages"
                value={data.counts.newMessages}
                href="/admin/messages?status=new"
              />
            ) : null}
          </div>
          <p className="-mt-3 text-xs text-ink-3">
            Counts show published items; drafts and archived items are listed underneath.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Continue editing" description="Most recently changed drafts.">
              {data.drafts.length ? (
                <ul className="divide-y divide-rule">
                  {data.drafts.map((draft) => (
                    <li
                      key={`${draft.type}-${draft.id}`}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={draft.href}
                          className="block truncate text-sm font-medium text-ink hover:underline"
                        >
                          {draft.title}
                        </Link>
                        <p className="text-xs text-ink-3">
                          {ENTITY_TYPE_LABELS[draft.type as EntityType] ?? draft.type} ·{" "}
                          {relativeTime(draft.updatedAt)}
                        </p>
                      </div>
                      <StatusBadge tone="attention">Draft</StatusBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No drafts in progress.</p>
              )}
            </Panel>

            <Panel title="Setup" description="Things that make the site complete.">
              <ul className="space-y-1">
                {data.checklist.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="flex min-h-9 items-center gap-2.5 rounded-xs px-1 text-sm hover:bg-muted"
                    >
                      <Icon
                        icon={item.done ? CheckCircle2 : Circle}
                        size={16}
                        className={item.done ? "text-success" : "text-ink-3"}
                      />
                      <span
                        className={cn(
                          "flex-1",
                          item.done ? "text-ink-3 line-through decoration-rule-strong" : "text-ink",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.done ? null : (
                        <Icon icon={ArrowRight} size={14} className="text-ink-3" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {can(PERMISSIONS.MESSAGES_MANAGE) ? (
              <Panel
                title="Recent messages"
                actions={
                  <Link href="/admin/messages" className="text-sm text-primary hover:underline">
                    All messages
                  </Link>
                }
              >
                {data.recentMessages.length ? (
                  <ul className="divide-y divide-rule">
                    {data.recentMessages.map((message) => (
                      <li key={message.id} className="py-2.5">
                        <Link
                          href={`/admin/messages/${message.id}`}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <span
                            className={cn(
                              "truncate text-sm",
                              message.status === "new" ? "font-medium text-ink" : "text-ink-2",
                            )}
                          >
                            {message.subject}
                          </span>
                          <span className="shrink-0 text-xs text-ink-3">
                            {relativeTime(message.createdAt)}
                          </span>
                        </Link>
                        <p className="truncate text-xs text-ink-3">
                          {message.name} · {message.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-3">No messages yet.</p>
                )}
              </Panel>
            ) : null}

            {can(PERMISSIONS.AUDIT_READ) ? (
              <Panel
                title="Recent activity"
                actions={
                  <Link href="/admin/audit-logs" className="text-sm text-primary hover:underline">
                    Audit log
                  </Link>
                }
              >
                {data.recentActivity.length ? (
                  <ul className="divide-y divide-rule">
                    {data.recentActivity.map((entry) => (
                      <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2">
                        <span className="min-w-0 truncate text-sm text-ink-2">
                          <span className="text-ink">
                            {entry.actor.name ?? entry.actor.email ?? "System"}
                          </span>{" "}
                          · {entry.summary ?? entry.action}
                        </span>
                        <span className="shrink-0 text-xs text-ink-3">
                          {relativeTime(entry.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-3">Nothing recorded yet.</p>
                )}
              </Panel>
            ) : null}
          </div>

          {data.analytics ? (
            <Panel
              title="Last 7 days"
              description={
                data.analytics.enabled
                  ? "Anonymous, cookie-free counts."
                  : "Analytics is switched off in Settings."
              }
              actions={
                <Link href="/admin/analytics" className="text-sm text-primary hover:underline">
                  Analytics
                </Link>
              }
            >
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  {
                    label: "Page views",
                    value: data.analytics.totals.pageViews,
                    detail: change(
                      data.analytics.totals.pageViews,
                      data.analytics.previousTotals.pageViews,
                    ),
                  },
                  {
                    label: "Visitors",
                    value: data.analytics.totals.visitors,
                    detail: change(
                      data.analytics.totals.visitors,
                      data.analytics.previousTotals.visitors,
                    ),
                  },
                  { label: "Downloads", value: data.analytics.totals.downloads, detail: null },
                  {
                    label: "Outbound clicks",
                    value: data.analytics.totals.outboundClicks,
                    detail: null,
                  },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="label">{stat.label}</dt>
                    <dd className="font-serif text-2xl text-ink tabular-nums">{stat.value}</dd>
                    {stat.detail ? <dd className="text-xs text-ink-3">{stat.detail}</dd> : null}
                  </div>
                ))}
              </dl>
              {data.analytics.topPages.length ? (
                <div className="mt-4 border-t border-rule pt-3">
                  <p className="label mb-2">Top pages</p>
                  <ol className="space-y-1 text-sm">
                    {data.analytics.topPages.slice(0, 5).map((page) => (
                      <li key={page.path} className="flex justify-between gap-3">
                        <span className="truncate font-mono text-xs text-ink-2">{page.path}</span>
                        <span className="text-ink-3 tabular-nums">{page.views}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </Panel>
          ) : null}

          <p className="text-sm">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Icon icon={ExternalLink} size={14} /> Open the public site
            </a>
          </p>
        </div>
      ) : null}
    </>
  );
}
