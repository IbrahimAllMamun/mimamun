"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, ListOrdered, Plus, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_STATUSES,
  PERMISSIONS,
  type AdminListItemDTO,
  type BulkAction,
  type OptionsDTO,
  type PageMeta,
} from "@portfolio/shared";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { useConfirm } from "../dialog";
import { AdminPageHeader, EmptyPanel, ErrorPanel, LoadingRows, relativeTime } from "../page";
import { useCan } from "../session";
import { useToast } from "../toast";
import { useApiQuery, withQuery } from "../use-api";
import type { AdminResource } from "./types";

const STATUS_TONES = { published: "positive", draft: "attention", archived: "neutral" } as const;
const FILTER_KEYS = ["q", "status", "featured", "visible", "type", "parent", "sort", "page"] as const;

type BulkOption = { action: BulkAction; label: string };

function bulkOptions(resource: AdminResource, canPublish: boolean, canDelete: boolean): BulkOption[] {
  const options: BulkOption[] = [];
  if (canPublish && resource.editorial) {
    options.push({ action: "publish", label: "Publish" }, { action: "unpublish", label: "Move to drafts" }, { action: "archive", label: "Archive" });
  }
  if (canPublish && resource.featurable) options.push({ action: "feature", label: "Feature" }, { action: "unfeature", label: "Unfeature" });
  if (canPublish && resource.visibleToggle) options.push({ action: "show", label: "Show on site" }, { action: "hide", label: "Hide from site" });
  if (canDelete) options.push({ action: "delete", label: "Delete" });
  return options;
}

function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? ""])) as Record<(typeof FILTER_KEYS)[number], string>;
  const update = (changes: Partial<typeof filters>) => {
    const next = { ...filters, ...changes };
    if (!("page" in changes)) next.page = "";
    router.replace(withQuery(pathname, next), { scroll: false });
  };
  return { filters, update };
}

export function ResourceList({ resource }: { resource: AdminResource }) {
  const can = useCan();
  const toast = useToast();
  const confirm = useConfirm();
  const { filters, update } = useFilters();
  const [search, setSearch] = useState(filters.q);
  const [selected, setSelected] = useState<string[]>([]);
  const [reordering, setReordering] = useState(false);
  const canWrite = can(PERMISSIONS.CONTENT_WRITE);
  const canPublish = can(PERMISSIONS.CONTENT_PUBLISH);
  const canDelete = can(PERMISSIONS.CONTENT_DELETE);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (search === filters.q) return;
    const timer = setTimeout(() => update({ q: search }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed value should trigger this
  }, [search]);

  const filtered = Boolean(filters.q || filters.status || filters.featured || filters.visible || filters.type || filters.parent);
  const treeMode = Boolean(resource.tree) && !filtered && !reordering;
  const listPath = withQuery(`/api/admin/${resource.path}`, {
    ...filters,
    sort: reordering || treeMode ? "order" : filters.sort,
    page: reordering || treeMode ? 1 : filters.page,
    pageSize: reordering || treeMode ? 100 : 25,
  });
  const list = useApiQuery<AdminListItemDTO[], PageMeta>(listPath);
  const optionTypes = [resource.parentFilter?.optionsType, resource.tree?.groupOptionsType].filter(Boolean) as string[];
  const options = useApiQuery<OptionsDTO>(optionTypes.length ? withQuery("/api/admin/options", { types: [...new Set(optionTypes)].join(",") }) : null);
  const items = list.data ?? [];
  const bulk = bulkOptions(resource, canPublish, canDelete);

  const runBulk = async (action: BulkAction) => {
    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${selected.length} item${selected.length === 1 ? "" : "s"}?`,
        body: "Deleted items cannot be restored.",
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
    }
    const result = await apiRequest<{ succeeded: string[]; failed: { id: string; message: string }[] }>("POST", `/api/admin/${resource.path}/bulk`, { ids: selected, action });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    const { succeeded, failed } = result.data;
    if (succeeded.length) toast.success(`${succeeded.length} item${succeeded.length === 1 ? "" : "s"} updated`);
    if (failed.length) toast.error(`${failed.length} could not be changed: ${failed[0]?.message ?? ""}`);
    setSelected([]);
    list.reload();
  };

  const toggleAll = () => setSelected(selected.length === items.length ? [] : items.map((item) => item.id));
  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <>
      <AdminPageHeader
        title={resource.plural}
        description={resource.description}
        actions={
          <>
            {resource.orderable && canWrite && !reordering ? (
              <Button variant="secondary" onClick={() => setReordering(true)}>
                <Icon icon={ListOrdered} size={16} /> Reorder
              </Button>
            ) : null}
            {canWrite ? (
              <ButtonLink href={`/admin/${resource.path}/new`}>
                <Icon icon={Plus} size={16} /> New {resource.label.toLowerCase()}
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {reordering ? (
        <ReorderList resource={resource} items={items} loading={list.loading} onDone={() => { setReordering(false); list.reload(); }} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Icon icon={Search} size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${resource.plural.toLowerCase()}`}
                aria-label={`Search ${resource.plural.toLowerCase()}`}
                className="min-h-10 w-full rounded-sm border border-rule-strong bg-elevated pr-3 pl-9 text-sm"
              />
            </div>
            {resource.editorial ? (
              <FilterSelect label="Status" value={filters.status} onChange={(status) => update({ status })} options={CONTENT_STATUSES.map((value) => ({ value, label: CONTENT_STATUS_LABELS[value] }))} />
            ) : null}
            {resource.typeFilter ? <FilterSelect label={resource.typeFilter.label} value={filters.type} onChange={(type) => update({ type })} options={resource.typeFilter.options} /> : null}
            {resource.parentFilter ? (
              <FilterSelect
                label={resource.parentFilter.label}
                value={filters.parent}
                onChange={(parent) => update({ parent })}
                options={(options.data?.[resource.parentFilter.optionsType] ?? []).map((option) => ({ value: option.id, label: option.label }))}
              />
            ) : null}
            {resource.featurable ? (
              <FilterSelect label="Featured" value={filters.featured} onChange={(featured) => update({ featured })} options={[{ value: "true", label: "Featured" }, { value: "false", label: "Not featured" }]} />
            ) : null}
            {resource.visibleToggle ? (
              <FilterSelect label="Visibility" value={filters.visible} onChange={(visible) => update({ visible })} options={[{ value: "true", label: "Shown" }, { value: "false", label: "Hidden" }]} />
            ) : null}
            {resource.sorts && !treeMode ? (
              <select value={filters.sort || resource.sorts[0]?.value} onChange={(event) => update({ sort: event.target.value })} aria-label="Sort" className="min-h-10 rounded-sm border border-rule-strong bg-elevated px-2 text-sm">
                {resource.sorts.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
            ) : null}
            {filtered ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  update({ q: "", status: "", featured: "", visible: "", type: "", parent: "" });
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          {selected.length && bulk.length ? (
            <div role="region" aria-label="Bulk actions" className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-primary/40 bg-primary-tint px-3 py-2 text-sm">
              <span className="mr-2 font-medium text-ink">{selected.length} selected</span>
              {bulk.map((option) => (
                <Button key={option.action} size="sm" variant={option.action === "delete" ? "danger" : "secondary"} onClick={() => void runBulk(option.action)}>
                  {option.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear selection
              </Button>
            </div>
          ) : null}

          {list.error ? <ErrorPanel error={list.error} onRetry={list.reload} /> : null}
          {!list.data && list.loading ? <LoadingRows /> : null}
          {list.data && items.length === 0 ? (
            <EmptyPanel
              title={filtered ? "Nothing matches these filters" : `No ${resource.plural.toLowerCase()} yet`}
              action={
                filtered ? null : canWrite ? (
                  <ButtonLink href={`/admin/${resource.path}/new`}>
                    <Icon icon={Plus} size={16} /> New {resource.label.toLowerCase()}
                  </ButtonLink>
                ) : null
              }
            >
              {filtered ? "Try a broader search or clear the filters." : resource.description}
            </EmptyPanel>
          ) : null}

          {items.length ? (
            <div className={cn("overflow-x-auto rounded-md border border-rule bg-elevated transition-opacity", list.loading && "opacity-60")}>
              <table className="w-full text-sm">
                <thead className="border-b border-rule bg-surface text-left">
                  <tr>
                    {bulk.length ? (
                      <th scope="col" className="w-10 px-3 py-2">
                        <input type="checkbox" aria-label="Select all" checked={selected.length === items.length} onChange={toggleAll} className="size-4 accent-primary" />
                      </th>
                    ) : null}
                    <th scope="col" className="px-3 py-2 font-medium text-ink-2">
                      Title
                    </th>
                    {resource.columns?.map((column) => (
                      <th key={column.key} scope="col" className="hidden px-3 py-2 font-medium text-ink-2 md:table-cell">
                        {column.label}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 font-medium text-ink-2">
                      State
                    </th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium text-ink-2 sm:table-cell">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {(treeMode ? treeOrder(items, resource, options.data ?? {}) : items.map((item) => ({ item, depth: 0, group: null as string | null }))).map(({ item, depth, group }) => (
                    <ListRow
                      key={item.id}
                      item={item}
                      depth={depth}
                      group={group}
                      resource={resource}
                      selectable={bulk.length > 0}
                      selected={selected.includes(item.id)}
                      onToggle={() => toggle(item.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!treeMode && list.meta && list.meta.totalPages > 1 ? (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
              <Button variant="ghost" size="sm" disabled={list.meta.page <= 1} onClick={() => update({ page: String(list.meta!.page - 1) })}>
                Previous
              </Button>
              <span className="text-ink-3">
                Page {list.meta.page} of {list.meta.totalPages} · {list.meta.total} items
              </span>
              <Button variant="ghost" size="sm" disabled={list.meta.page >= list.meta.totalPages} onClick={() => update({ page: String(list.meta!.page + 1) })}>
                Next
              </Button>
            </nav>
          ) : list.meta ? (
            <p className="mt-3 text-sm text-ink-3">
              {list.meta.total} item{list.meta.total === 1 ? "" : "s"}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className={cn("min-h-10 rounded-sm border bg-elevated px-2 text-sm", value ? "border-primary text-ink" : "border-rule-strong text-ink-2")}>
      <option value="">{label}: all</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ListRow({
  item,
  depth,
  group,
  resource,
  selectable,
  selected,
  onToggle,
}: {
  item: AdminListItemDTO;
  depth: number;
  group: string | null;
  resource: AdminResource;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {group ? (
        <tr className="bg-surface">
          <th colSpan={99} scope="colgroup" className="px-3 py-2 text-left">
            <span className="label">{group}</span>
          </th>
        </tr>
      ) : null}
      <tr className={cn("hover:bg-surface", selected && "bg-primary-tint")}>
        {selectable ? (
          <td className="px-3 py-2.5 align-top">
            <input type="checkbox" aria-label={`Select ${item.title}`} checked={selected} onChange={onToggle} className="size-4 accent-primary" />
          </td>
        ) : null}
        <td className="px-3 py-2.5">
          <div className="flex items-start gap-2" style={depth ? { paddingLeft: `${depth * 1.25}rem` } : undefined}>
            {depth ? <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-rule-strong" /> : null}
            <div className="min-w-0">
              <Link href={`/admin/${resource.path}/${item.id}`} className="font-medium text-ink hover:underline">
                {item.title}
              </Link>
              {item.subtitle ? <p className="line-clamp-1 max-w-xl text-ink-3">{item.subtitle}</p> : null}
            </div>
          </div>
        </td>
        {resource.columns?.map((column) => (
          <td key={column.key} className="hidden px-3 py-2.5 text-ink-2 md:table-cell">
            {String(item.extra[column.key] ?? "—")}
          </td>
        ))}
        <td className="px-3 py-2.5">
          <span className="flex flex-wrap items-center gap-2">
            {item.status ? <StatusBadge tone={STATUS_TONES[item.status]}>{CONTENT_STATUS_LABELS[item.status]}</StatusBadge> : null}
            {item.featured ? <Icon icon={Star} size={14} label="Featured" className="fill-current text-accent" /> : null}
            {item.isVisible === false ? <Icon icon={EyeOff} size={14} label="Hidden" className="text-ink-3" /> : item.isVisible === true && !item.status ? <Icon icon={Eye} size={14} label="Shown" className="text-ink-3" /> : null}
          </span>
        </td>
        <td className="hidden px-3 py-2.5 text-right whitespace-nowrap text-ink-3 sm:table-cell">{relativeTime(item.updatedAt)}</td>
      </tr>
    </>
  );
}

/** Orders rows depth-first under their parents (and groups, e.g. provider). */
function treeOrder(items: AdminListItemDTO[], resource: AdminResource, options: OptionsDTO) {
  const tree = resource.tree!;
  const children = new Map<string | null, AdminListItemDTO[]>();
  const ids = new Set(items.map((item) => item.id));
  for (const item of items) {
    const parent = (item.extra[tree.parentKey] as string | null) ?? null;
    const key = parent && ids.has(parent) ? parent : null;
    children.set(key, [...(children.get(key) ?? []), item]);
  }
  const groupName = (item: AdminListItemDTO) => {
    if (!tree.groupKey) return null;
    const id = item.extra[tree.groupKey] as string | null;
    return options[tree.groupOptionsType ?? ""]?.find((option) => option.id === id)?.label ?? "Other";
  };
  const rows: { item: AdminListItemDTO; depth: number; group: string | null }[] = [];
  const roots = [...(children.get(null) ?? [])].sort((a, b) => (groupName(a) ?? "").localeCompare(groupName(b) ?? ""));
  let lastGroup: string | null = null;
  const visit = (item: AdminListItemDTO, depth: number) => {
    const name = depth === 0 ? groupName(item) : null;
    rows.push({ item, depth, group: name && name !== lastGroup ? name : null });
    if (name) lastGroup = name;
    for (const child of children.get(item.id) ?? []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return rows;
}

/** Reorder by drag and drop or with the arrow buttons, then save. */
function ReorderList({ resource, items, loading, onDone }: { resource: AdminResource; items: AdminListItemDTO[]; loading: boolean; onDone: () => void }) {
  const toast = useToast();
  const [order, setOrder] = useState<AdminListItemDTO[] | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => order ?? items, [order, items]);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    setOrder(next);
  };
  const save = async () => {
    setSaving(true);
    const result = await apiRequest("POST", `/api/admin/${resource.path}/reorder`, { ids: rows.map((item) => item.id) });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Order saved");
    onDone();
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-rule bg-surface px-4 py-3 text-sm">
        <p className="text-ink-2">Drag items, or use the arrows, to set the order used on the site.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={() => void save()} pending={saving} disabled={!order}>
            Save order
          </Button>
        </div>
      </div>
      {loading && !items.length ? <LoadingRows /> : null}
      <ol className="divide-y divide-rule rounded-md border border-rule bg-elevated">
        {rows.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => setDragging(index)}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragging !== null && dragging !== index) {
                move(dragging, index);
                setDragging(index);
              }
            }}
            onDragEnd={() => setDragging(null)}
            className={cn("flex items-center gap-3 px-3 py-2", dragging === index && "bg-primary-tint")}
          >
            <Icon icon={GripVertical} size={16} className="cursor-grab text-ink-3" />
            <span className="w-8 font-mono text-xs text-ink-3">{index + 1}</span>
            <span className="flex-1 text-sm text-ink">{item.title}</span>
            <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${item.title} up`}>
              <Icon icon={ArrowUp} size={14} />
            </Button>
            <Button variant="ghost" size="sm" disabled={index === rows.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${item.title} down`}>
              <Icon icon={ArrowDown} size={14} />
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
