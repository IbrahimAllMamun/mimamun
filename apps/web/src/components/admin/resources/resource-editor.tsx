"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, CircleAlert, ExternalLink, Eye, Save, Send, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  CONTENT_STATUS_LABELS,
  EMPTY_SEO,
  PERMISSIONS,
  type ContentStatus,
  type OptionsDTO,
} from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { apiRequest, fieldErrors } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { useConfirm } from "../dialog";
import { FieldControl, FieldGrid } from "../form/field-control";
import { FormProvider } from "../form/form-context";
import { setIn } from "../form/paths";
import { AdminPageHeader, ErrorPanel, LoadingRows, Panel, relativeTime } from "../page";
import { useCan } from "../session";
import { useToast } from "../toast";
import { useUnsavedChanges } from "../unsaved";
import { useApiQuery, withQuery } from "../use-api";
import { optionTypesFor } from "./registry";
import type { AdminField, AdminResource, FormRecord } from "./types";

const STATUS_TONES: Record<ContentStatus, "positive" | "attention" | "neutral"> = {
  published: "positive",
  draft: "attention",
  archived: "neutral",
};

function normalize(resource: AdminResource, record: FormRecord): FormRecord {
  const merged: FormRecord = { ...resource.initial(), ...record };
  if ("seo" in merged) merged.seo = { ...EMPTY_SEO, ...((record.seo as FormRecord | null) ?? {}) };
  return merged;
}

function snapshot(record: FormRecord): string {
  const { updatedAt: _updated, createdAt: _created, ...rest } = record;
  return JSON.stringify(rest);
}

/** Loads the record (or starts a new one) and the option lists its form needs. */
export function ResourceEditor({ resource, id }: { resource: AdminResource; id: string }) {
  const isNew = id === "new";
  const record = useApiQuery<FormRecord>(isNew ? null : `/api/admin/${resource.path}/${id}`);
  const types = optionTypesFor(resource);
  const options = useApiQuery<OptionsDTO>(
    types.length ? withQuery("/api/admin/options", { types: types.join(",") }) : null,
  );

  if (!isNew && record.error) {
    return (
      <>
        <AdminPageHeader
          title={resource.label}
          breadcrumbs={[
            { label: resource.plural, href: `/admin/${resource.path}` },
            { label: "Not available" },
          ]}
        />
        <ErrorPanel error={record.error} onRetry={record.reload} />
      </>
    );
  }
  if ((!isNew && !record.data) || (types.length > 0 && !options.data && !options.error)) {
    return (
      <>
        <AdminPageHeader
          title={isNew ? `New ${resource.label.toLowerCase()}` : "Loading…"}
          breadcrumbs={[{ label: resource.plural, href: `/admin/${resource.path}` }]}
        />
        <Panel>
          <LoadingRows rows={6} />
        </Panel>
      </>
    );
  }
  const initial = normalize(resource, isNew ? {} : (record.data ?? {}));
  return (
    <EditorForm
      key={isNew ? "new" : String(record.data?.id)}
      resource={resource}
      initial={initial}
      isNew={isNew}
      options={options.data ?? {}}
      reloadOptions={options.reload}
    />
  );
}

function EditorForm({
  resource,
  initial,
  isNew,
  options,
  reloadOptions,
}: {
  resource: AdminResource;
  initial: FormRecord;
  isNew: boolean;
  options: OptionsDTO;
  reloadOptions: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const can = useCan();
  const unsaved = useUnsavedChanges();
  const [record, setRecord] = useState<FormRecord>(initial);
  const [saved, setSaved] = useState(() => snapshot(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirty = snapshot(record) !== saved;
  const recordId = typeof record.id === "string" ? record.id : null;
  const status = (record.status as ContentStatus | undefined) ?? null;
  const canWrite = can(PERMISSIONS.CONTENT_WRITE);
  const canPublish = can(PERMISSIONS.CONTENT_PUBLISH);
  const canDelete = can(PERMISSIONS.CONTENT_DELETE);
  const key = `${resource.path}:${recordId ?? "new"}`;

  useEffect(() => {
    unsaved.setDirty(key, dirty);
    return () => unsaved.setDirty(key, false);
  }, [dirty, key, unsaved]);

  const setValue = useCallback((path: string, value: unknown) => {
    setRecord((current) => setIn(current, path, value));
  }, []);

  const save = useCallback(
    async (override?: FormRecord, { silent = false }: { silent?: boolean } = {}) => {
      const payload = override ?? record;
      setSaving(true);
      setErrorMessage(null);
      const result = recordId
        ? await apiRequest<FormRecord>("PUT", `/api/admin/${resource.path}/${recordId}`, payload)
        : await apiRequest<FormRecord>("POST", `/api/admin/${resource.path}`, payload);
      setSaving(false);
      if (!result.ok) {
        const mapped = fieldErrors(result.error.details);
        setErrors(mapped);
        setErrorMessage(result.error.message);
        if (!silent || Object.keys(mapped).length) toast.error(result.error.message);
        return false;
      }
      const next = normalize(resource, result.data);
      setRecord(next);
      setSaved(snapshot(next));
      setErrors({});
      setSavedAt(new Date().toISOString());
      if (!silent) toast.success(`${resource.label} saved`);
      if (!recordId && typeof result.data.id === "string") {
        unsaved.setDirty(key, false);
        router.replace(`/admin/${resource.path}/${result.data.id}`);
      }
      reloadOptions();
      return true;
    },
    [key, record, recordId, reloadOptions, resource, router, toast, unsaved],
  );
  const autosave = useEffectEvent(() => void save(undefined, { silent: true }));
  const saveNow = useEffectEvent(() => void save());

  // Drafts save themselves a few seconds after the last change.
  useEffect(() => {
    if (!dirty || !recordId || status !== "draft" || saving || !canWrite) return;
    const timer = setTimeout(() => autosave(), 4000);
    return () => clearTimeout(timer);
  }, [dirty, record, recordId, status, saving, canWrite]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeStatus = async (next: ContentStatus) => {
    if (
      next === "published" &&
      !(await confirm({
        title: `Publish this ${resource.label.toLowerCase()}?`,
        body: "It becomes visible on the public site straight away.",
        confirmLabel: "Publish",
      }))
    )
      return;
    await save({ ...record, status: next });
  };

  const remove = async () => {
    if (!recordId) return;
    const ok = await confirm({
      title: `Delete this ${resource.label.toLowerCase()}?`,
      body: `“${resource.title(record)}” will be removed permanently. This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const result = await apiRequest("DELETE", `/api/admin/${resource.path}/${recordId}`);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    unsaved.setDirty(key, false);
    toast.success(`${resource.label} deleted`);
    router.push(`/admin/${resource.path}`);
  };

  const publicPath = resource.publicPath?.(record) ?? null;
  const errorCount = Object.keys(errors).length;
  const formApi = useMemo(
    () => ({ record, setValue, errors, options, disabled: !canWrite, reloadOptions }),
    [record, setValue, errors, options, canWrite, reloadOptions],
  );

  const sideFields: AdminField[] = resource.editorial
    ? [
        {
          name: "visibility",
          label: "Visibility",
          kind: "select",
          options: [
            { value: "public", label: "Listed" },
            { value: "unlisted", label: "Unlisted (link only)" },
          ],
          help: "Unlisted items are published but left out of lists, search and the sitemap.",
        },
        {
          name: "publishedAt",
          label: "Publication date",
          kind: "datetime",
          help: "Set automatically when first published.",
        },
        ...(resource.featurable
          ? [{ name: "featured", label: "Feature on the home page", kind: "boolean" } as AdminField]
          : []),
      ]
    : [
        ...(resource.visibleToggle
          ? [{ name: "isVisible", label: "Show on the site", kind: "boolean" } as AdminField]
          : []),
        ...(resource.featurable
          ? [{ name: "featured", label: "Featured", kind: "boolean" } as AdminField]
          : []),
      ];

  return (
    <FormProvider value={formApi}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        noValidate
      >
        <AdminPageHeader
          breadcrumbs={[
            { label: resource.plural, href: `/admin/${resource.path}` },
            { label: isNew ? "New" : resource.title(record) },
          ]}
          title={isNew ? `New ${resource.label.toLowerCase()}` : resource.title(record)}
          meta={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {status ? (
                <StatusBadge tone={STATUS_TONES[status]}>
                  {CONTENT_STATUS_LABELS[status]}
                </StatusBadge>
              ) : null}
              {saving ? (
                <span>Saving…</span>
              ) : dirty ? (
                <span className="text-accent">Unsaved changes</span>
              ) : savedAt ? (
                <span>Saved {relativeTime(savedAt)}</span>
              ) : record.updatedAt ? (
                <span>Last saved {relativeTime(String(record.updatedAt))}</span>
              ) : null}
              {status === "draft" && recordId ? (
                <span className="text-ink-3">Drafts save automatically.</span>
              ) : null}
            </span>
          }
          actions={
            <>
              {resource.preview && recordId ? (
                <a
                  href={`/preview/${resource.preview}/${recordId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm text-ink-2 hover:bg-muted hover:text-ink"
                  title={dirty ? "Save first to preview your latest changes" : undefined}
                >
                  <Icon icon={Eye} size={16} /> Preview
                </a>
              ) : null}
              {publicPath && !isNew ? (
                <a
                  href={publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm text-ink-2 hover:bg-muted hover:text-ink"
                >
                  <Icon icon={ExternalLink} size={16} /> View on site
                </a>
              ) : null}
              {canWrite ? (
                <Button type="submit" pending={saving} disabled={!dirty && !isNew}>
                  <Icon icon={Save} size={16} /> Save
                </Button>
              ) : null}
            </>
          }
        />

        {errorCount || errorMessage ? (
          <div
            role="alert"
            className="mb-6 flex gap-3 rounded-md border border-error/40 bg-error-tint px-4 py-3 text-sm"
          >
            <Icon icon={CircleAlert} size={18} className="mt-0.5 shrink-0 text-error" />
            <div className="space-y-1">
              <p className="font-medium text-ink">
                {errorMessage ?? "Some fields need attention."}
              </p>
              {errorCount ? (
                <ul className="list-disc space-y-0.5 pl-4 text-ink-2">
                  {Object.entries(errors)
                    .slice(0, 8)
                    .map(([path, message]) => (
                      <li key={path}>
                        <span className="font-mono text-xs">{path}</span>: {message}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        {!canWrite ? (
          <p className="mb-6 rounded-md border border-rule bg-surface px-4 py-3 text-sm text-ink-2">
            You can view this item but not change it.
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-(--editor-columns)">
          <div className="min-w-0 space-y-6">
            {resource.groups.map((group) => (
              <Panel key={group.title} title={group.title} description={group.description}>
                {group.fields.length === 1 &&
                ["sections", "blocks", "seo"].includes(group.fields[0]?.kind ?? "") ? (
                  <FieldControl
                    field={group.fields[0] as AdminField}
                    path={(group.fields[0] as AdminField).name}
                  />
                ) : (
                  <FieldGrid fields={group.fields} />
                )}
              </Panel>
            ))}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
            {resource.editorial ? (
              <Panel title="Publishing">
                <div className="space-y-4">
                  <p className="flex items-center justify-between text-sm">
                    <span className="text-ink-2">Status</span>
                    {status ? (
                      <StatusBadge tone={STATUS_TONES[status]}>
                        {CONTENT_STATUS_LABELS[status]}
                      </StatusBadge>
                    ) : null}
                  </p>
                  {canPublish ? (
                    <div className="flex flex-wrap gap-2">
                      {status !== "published" ? (
                        <Button
                          type="button"
                          onClick={() => void changeStatus("published")}
                          pending={saving}
                        >
                          <Icon icon={Send} size={15} /> Publish
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void changeStatus("draft")}
                        >
                          <Icon icon={Undo2} size={15} /> Unpublish
                        </Button>
                      )}
                      {status !== "archived" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void changeStatus("archived")}
                        >
                          <Icon icon={Archive} size={15} /> Archive
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-3">
                      An editor with publishing rights will publish this.
                    </p>
                  )}
                  <FieldGrid fields={sideFields} />
                </div>
              </Panel>
            ) : sideFields.length ? (
              <Panel title="Display">
                <FieldGrid fields={sideFields} />
              </Panel>
            ) : null}

            {!isNew && canDelete ? (
              <Panel title="Delete">
                <p className="mb-3 text-sm text-ink-2">
                  Removes this {resource.label.toLowerCase()} permanently.
                  {resource.editorial ? " Archive it instead to keep it out of sight." : ""}
                </p>
                <Button type="button" variant="danger" size="sm" onClick={() => void remove()}>
                  <Icon icon={Trash2} size={14} /> Delete {resource.label.toLowerCase()}
                </Button>
              </Panel>
            ) : null}

            {!isNew ? (
              <p className="px-1 text-xs text-ink-3">
                Changes are recorded in the{" "}
                <Link href="/admin/audit-logs" className="underline">
                  audit log
                </Link>
                .
              </p>
            ) : null}
          </aside>
        </div>

        {dirty && canWrite ? (
          <div
            className={cn(
              "sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-md border border-rule bg-elevated px-4 py-3 shadow-popover xl:hidden",
            )}
          >
            <span className="text-sm text-ink-2">Unsaved changes</span>
            <Button type="submit" size="sm" pending={saving}>
              Save
            </Button>
          </div>
        ) : null}
      </form>
    </FormProvider>
  );
}
