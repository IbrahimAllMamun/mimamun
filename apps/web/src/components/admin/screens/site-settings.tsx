"use client";

import Link from "next/link";
import { useState } from "react";
import { STATIC_ROUTE_KEYS, type EMPTY_SEO, type StaticRouteKey } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { apiRequest, fieldErrors } from "@/lib/api/client";
import { SeoFields } from "../form/field-control";
import { FormProvider } from "../form/form-context";
import { setIn } from "../form/paths";
import { AdminPageHeader, ErrorPanel, LoadingRows, Panel, relativeTime } from "../page";
import type { FormRecord } from "../resources/types";
import { useToast } from "../toast";
import { useApiQuery } from "../use-api";
import { SingletonEditor } from "./singleton-editor";

export function ProfileSettings() {
  return (
    <SingletonEditor
      endpoint="/api/admin/profile"
      title="Profile and CV"
      description="Who you are on the site: name, statement, biography, portrait and the CV behind every Download CV button."
      aside={
        <Panel title="Where this appears">
          <ul className="space-y-1.5 text-sm text-ink-2">
            <li>Name, title and statement: home page, header, social cards.</li>
            <li>Biography: About page (Markdown).</li>
            <li>Research interests: Research and About pages.</li>
            <li>
              CV: the “Download CV” buttons and /cv link. Without a CV, visitors are sent to the
              contact form.
            </li>
          </ul>
        </Panel>
      }
      groups={[
        {
          title: "Identity",
          fields: [
            {
              name: "fullName",
              label: "Full name",
              kind: "text",
              required: true,
              maxLength: 120,
              width: "half",
            },
            {
              name: "headline",
              label: "Professional title",
              kind: "text",
              required: true,
              maxLength: 120,
              width: "half",
            },
            {
              name: "statement",
              label: "Statement",
              kind: "textarea",
              rows: 2,
              maxLength: 300,
              help: "One sentence under your name on the home page.",
            },
            { name: "location", label: "Location", kind: "text", maxLength: 160, width: "half" },
            { name: "email", label: "Public email", kind: "email", width: "half" },
            {
              name: "availability",
              label: "Availability",
              kind: "text",
              maxLength: 200,
              help: "Optional, e.g. “Open to research collaborations”. Leave empty to hide.",
            },
          ],
        },
        {
          title: "Portrait and CV",
          fields: [
            {
              name: "avatarMediaId",
              label: "Portrait",
              kind: "media",
              accept: "image",
              help: "Optional. Shown on the About page.",
            },
            {
              name: "cvMediaId",
              label: "CV (PDF)",
              kind: "media",
              accept: "document",
              help: "Upload a new version any time; the /cv link always serves the current one.",
            },
          ],
        },
        {
          title: "Writing about you",
          fields: [
            {
              name: "intro",
              label: "Short introduction",
              kind: "markdown",
              rows: 4,
              maxLength: 2000,
            },
            { name: "bio", label: "Biography", kind: "markdown", rows: 12, maxLength: 12000 },
            {
              name: "researchInterests",
              label: "Research interests",
              kind: "textarea",
              rows: 3,
              maxLength: 4000,
            },
            {
              name: "philosophy",
              label: "Working philosophy",
              kind: "markdown",
              rows: 4,
              maxLength: 6000,
            },
            {
              name: "interests",
              label: "Outside work",
              kind: "markdown",
              rows: 3,
              maxLength: 4000,
              help: "Optional section at the end of the About page.",
            },
          ],
        },
      ]}
    />
  );
}

export function SiteSettings() {
  return (
    <SingletonEditor
      endpoint="/api/admin/settings"
      title="Settings"
      description="Site-wide options: name and description, the contact form, analytics and the GitHub integration."
      aside={
        <Panel title="Related">
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link href="/admin/seo" className="text-primary hover:underline">
                Search and sharing for each page
              </Link>
            </li>
            <li>
              <Link href="/admin/navigation" className="text-primary hover:underline">
                Header and footer links
              </Link>
            </li>
            <li>
              <Link href="/admin/integrations" className="text-primary hover:underline">
                GitHub repositories
              </Link>
            </li>
          </ul>
        </Panel>
      }
      groups={[
        {
          title: "Site",
          fields: [
            { name: "siteName", label: "Site name", kind: "text", required: true, maxLength: 120 },
            {
              name: "siteDescription",
              label: "Description",
              kind: "textarea",
              required: true,
              rows: 2,
              maxLength: 300,
              help: "Used by search engines when a page has no description of its own.",
            },
            {
              name: "defaultOgImageId",
              label: "Default social image",
              kind: "media",
              accept: "image",
              help: "1200×630. Without it, a card with your name is generated.",
            },
            { name: "footerNote", label: "Footer note", kind: "text", maxLength: 300 },
          ],
        },
        {
          title: "Contact form",
          fields: [
            {
              name: "contactFormEnabled",
              label: "Accept messages through the contact form",
              kind: "boolean",
            },
            {
              name: "contactNotificationEmail",
              label: "Send notifications to",
              kind: "email",
              help: "Needs SMTP settings on the server. Leave empty to only use the inbox here.",
            },
          ],
        },
        {
          title: "Analytics",
          description: "Anonymous, cookie-free page counts. No IP addresses are stored.",
          fields: [
            { name: "analyticsEnabled", label: "Record anonymous page views", kind: "boolean" },
            {
              name: "analyticsRetentionDays",
              label: "Keep events for (days)",
              kind: "number",
              min: 30,
              max: 1095,
              step: 1,
              width: "half",
            },
          ],
        },
        {
          title: "GitHub",
          fields: [
            {
              name: "githubUsername",
              label: "GitHub username",
              kind: "text",
              width: "half",
              placeholder: "IbrahimAllMamun",
            },
            {
              name: "githubSyncEnabled",
              label: "Sync repositories automatically",
              kind: "boolean",
              help: "Runs on a schedule; the site keeps the last good copy if GitHub is unavailable.",
            },
          ],
        },
      ]}
    />
  );
}

const ROUTE_LABELS: Record<StaticRouteKey, string> = {
  home: "Home",
  about: "About",
  experience: "Experience",
  projects: "Projects",
  research: "Research",
  publications: "Publications",
  certifications: "Certifications",
  blog: "Writing",
  contact: "Contact",
  search: "Search",
};

type RouteSeo = { routeKey: StaticRouteKey; updatedAt: string | null } & typeof EMPTY_SEO;

export function SeoSettings() {
  const query = useApiQuery<RouteSeo[]>("/api/admin/seo");
  const [open, setOpen] = useState<StaticRouteKey | null>("home");
  return (
    <>
      <AdminPageHeader
        title="Search and sharing"
        description="Titles, descriptions and social images for the fixed pages. Projects, research and posts have their own settings in their editors."
      />
      {query.error ? <ErrorPanel error={query.error} onRetry={query.reload} /> : null}
      {!query.data && !query.error ? <LoadingRows /> : null}
      <div className="space-y-3">
        {STATIC_ROUTE_KEYS.map((key) => {
          const row = query.data?.find((item) => item.routeKey === key);
          if (!row) return null;
          return (
            <Panel
              key={key}
              title={
                <button
                  type="button"
                  onClick={() => setOpen(open === key ? null : key)}
                  aria-expanded={open === key}
                  className="flex w-full items-center gap-3 text-left"
                >
                  {ROUTE_LABELS[key]}
                  <span className="font-mono text-xs font-normal text-ink-3">
                    {key === "home" ? "/" : `/${key}`}
                  </span>
                </button>
              }
              description={
                row.title || row.description
                  ? `${row.title ?? ""}${row.title && row.description ? " — " : ""}${row.description ?? ""}`
                  : "Using defaults"
              }
            >
              {open === key ? (
                <RouteSeoForm row={row} onSaved={query.reload} />
              ) : (
                <p className="text-sm text-ink-3">
                  {row.updatedAt ? `Updated ${relativeTime(row.updatedAt)}` : "Not customised"}
                </p>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}

function RouteSeoForm({ row, onSaved }: { row: RouteSeo; onSaved: () => void }) {
  const toast = useToast();
  const [record, setRecord] = useState<FormRecord>({
    seo: {
      title: row.title,
      description: row.description,
      canonicalUrl: row.canonicalUrl,
      ogImageId: row.ogImageId,
      noindex: row.noindex,
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const result = await apiRequest("PUT", `/api/admin/seo/${row.routeKey}`, record.seo);
    setSaving(false);
    if (!result.ok) {
      const mapped = fieldErrors(result.error.details);
      setErrors(
        Object.fromEntries(Object.entries(mapped).map(([key, value]) => [`seo.${key}`, value])),
      );
      toast.error(result.error.message);
      return;
    }
    setErrors({});
    toast.success("Saved");
    onSaved();
  };
  return (
    <FormProvider
      value={{
        record,
        setValue: (path, value) => setRecord((current) => setIn(current, path, value)),
        errors,
        options: {},
      }}
    >
      <div className="space-y-4">
        <SeoFields path="seo" />
        <Button onClick={() => void save()} pending={saving}>
          Save
        </Button>
      </div>
    </FormProvider>
  );
}
