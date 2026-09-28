"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ENTITY_TYPE_LABELS,
  type AnalyticsSummaryDTO,
  type ChartBlockData,
} from "@portfolio/shared";
import { Chart } from "@/components/charts/chart";
import { cn } from "@/lib/cn";
import { AdminPageHeader, ErrorPanel, LoadingRows, Panel } from "../page";
import { useApiQuery } from "../use-api";

const PERIODS = [7, 30, 90, 365] as const;

function delta(
  current: number,
  previous: number,
): { text: string; tone: "up" | "down" | "flat" } | null {
  if (!previous) return null;
  const value = ((current - previous) / previous) * 100;
  if (Math.abs(value) < 0.5) return { text: "no change", tone: "flat" };
  return { text: `${value > 0 ? "+" : ""}${value.toFixed(0)}%`, tone: value > 0 ? "up" : "down" };
}

/** Ranked list with a proportional bar, the most legible way to compare counts. */
function Ranked({
  rows,
  empty,
}: {
  rows: { label: string; value: number; href?: string; mono?: boolean }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-ink-3">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ol className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {row.href ? (
              <a
                href={row.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("truncate text-ink hover:underline", row.mono && "font-mono text-xs")}
              >
                {row.label}
              </a>
            ) : (
              <span className={cn("truncate text-ink", row.mono && "font-mono text-xs")}>
                {row.label}
              </span>
            )}
            <span className="shrink-0 text-ink-2 tabular-nums">
              {row.value.toLocaleString("en-GB")}
            </span>
          </div>
          <div aria-hidden className="h-1 rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-chart-1"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const { data, error, reload, loading } = useApiQuery<AnalyticsSummaryDTO>(
    `/api/admin/analytics/summary?days=${days}`,
  );

  const chart: ChartBlockData | null =
    data && data.daily.length
      ? {
          chartType: "line",
          title: `Daily page views and visitors, last ${days} days`,
          description: `Page views and unique daily visitors per day over the last ${days} days.`,
          xLabel: "Date",
          yLabel: "Count",
          yFormat: "number",
          referenceLine: "none",
          source: null,
          data: {
            x: data.daily.map((day) => day.date.slice(5)),
            series: [
              { name: "Page views", values: data.daily.map((day) => day.pageViews) },
              { name: "Visitors", values: data.daily.map((day) => day.visitors) },
            ],
          },
        }
      : null;

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="Anonymous and cookie-free: no personal data is stored, visitors are counted with a daily salted hash, and Do Not Track and Global Privacy Control are respected."
        actions={
          <div
            role="tablist"
            aria-label="Period"
            className="flex gap-1 rounded-sm border border-rule bg-elevated p-1"
          >
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                role="tab"
                aria-selected={days === period}
                onClick={() => setDays(period)}
                className={cn(
                  "min-h-8 pointer-coarse:min-h-11 rounded-xs px-3 text-sm",
                  days === period ? "bg-ink text-paper" : "text-ink-2 hover:bg-muted",
                )}
              >
                {period === 365 ? "1 year" : `${period} days`}
              </button>
            ))}
          </div>
        }
      />
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {!data && !error ? <LoadingRows rows={8} /> : null}
      {data ? (
        <div className={cn("space-y-6", loading && "opacity-60")}>
          {!data.enabled ? (
            <p className="rounded-md border border-warning/40 bg-warning-tint px-4 py-3 text-sm">
              Analytics is switched off, so nothing new is recorded. Turn it on in{" "}
              <Link href="/admin/settings" className="underline">
                Settings
              </Link>
              .
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Page views",
                value: data.totals.pageViews,
                change: delta(data.totals.pageViews, data.previousTotals.pageViews),
              },
              {
                label: "Visitors",
                value: data.totals.visitors,
                change: delta(data.totals.visitors, data.previousTotals.visitors),
              },
              { label: "Downloads", value: data.totals.downloads, change: null },
              { label: "Outbound clicks", value: data.totals.outboundClicks, change: null },
            ].map((stat) => (
              <div key={stat.label} className="rounded-md border border-rule bg-elevated px-4 py-3">
                <dt className="label">{stat.label}</dt>
                <dd className="mt-1 font-serif text-3xl text-ink tabular-nums">
                  {stat.value.toLocaleString("en-GB")}
                </dd>
                {stat.change ? (
                  <dd
                    className={cn(
                      "text-xs",
                      stat.change.tone === "up"
                        ? "text-success"
                        : stat.change.tone === "down"
                          ? "text-error"
                          : "text-ink-3",
                    )}
                  >
                    {stat.change.text} on the previous {days} days
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>

          {chart ? (
            <Panel>
              <Chart chart={chart} />
            </Panel>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Most read content">
              <Ranked
                rows={data.popular.map((item) => ({
                  label: `${item.title} (${ENTITY_TYPE_LABELS[item.type]})`,
                  value: item.views,
                }))}
                empty="No views of projects, research or posts yet."
              />
            </Panel>
            <Panel title="Top pages">
              <Ranked
                rows={data.topPages.map((page) => ({
                  label: page.path,
                  value: page.views,
                  mono: true,
                }))}
                empty="No page views yet."
              />
            </Panel>
            <Panel title="Referrers" description="Where visitors came from (site name only).">
              <Ranked
                rows={data.referrers.map((row) => ({ label: row.host, value: row.views }))}
                empty="No referrers recorded."
              />
            </Panel>
            <Panel title="Downloads">
              <Ranked
                rows={data.downloads.map((row) => ({
                  label: row.target,
                  value: row.count,
                  mono: true,
                }))}
                empty="No downloads yet."
              />
            </Panel>
            <Panel title="Outbound links">
              <Ranked
                rows={data.outbound.map((row) => ({
                  label: row.target,
                  value: row.count,
                  href: row.target,
                  mono: true,
                }))}
                empty="No outbound clicks yet."
              />
            </Panel>
            <Panel title="Devices and browsers">
              <div className="grid gap-6 sm:grid-cols-2">
                <Ranked
                  rows={data.devices.map((row) => ({ label: row.name, value: row.count }))}
                  empty="No data."
                />
                <Ranked
                  rows={data.browsers.map((row) => ({ label: row.name, value: row.count }))}
                  empty="No data."
                />
              </div>
            </Panel>
            {data.countries.length ? (
              <Panel title="Countries" description="Only when the proxy provides a country header.">
                <Ranked
                  rows={data.countries.map((row) => ({ label: row.name, value: row.count }))}
                  empty="No data."
                />
              </Panel>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
