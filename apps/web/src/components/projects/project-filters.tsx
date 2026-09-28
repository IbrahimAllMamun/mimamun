"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { PROJECT_TYPE_LABELS, type ProjectFacetsDTO, type ProjectType } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";

const SORTS = [
  { value: "", label: "Featured first" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title (A–Z)" },
];

const control =
  "min-h-11 w-full rounded-xs border border-rule-strong bg-elevated px-3 text-sm text-ink focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-accent-mark";

/**
 * Filters are a plain GET form (they work without JavaScript). With JS, the
 * results update as soon as a control changes, and the URL stays shareable.
 */
export function ProjectFilters({ facets, total }: { facets: ProjectFacetsDTO; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const submit = () => {
    if (!form.current) return;
    const data = new FormData(form.current);
    const next = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value.trim() !== "") next.set(key, value.trim());
    }
    startTransition(() =>
      router.replace(`/projects${next.size ? `?${next}` : ""}`, { scroll: false }),
    );
  };

  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timer = setTimeout(submit, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <form
      ref={form}
      action="/projects"
      method="get"
      role="search"
      aria-label="Filter projects"
      onChange={(event) => {
        if ((event.target as HTMLElement).getAttribute("name") !== "q") submit();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-4"
      aria-busy={pending}
    >
      <div>
        <label htmlFor="project-search" className="label mb-1.5 block">
          Search
        </label>
        <input
          id="project-search"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Methods, tools, topics…"
          className={control}
        />
      </div>
      {/* Keyed by the URL so the selects follow back/forward navigation and "Clear all". */}
      <FilterControls key={params.toString()} facets={facets} params={params} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p aria-live="polite" className="text-ink-2">
          {pending ? "Updating…" : `${total} ${total === 1 ? "project" : "projects"}`}
        </p>
        <noscript>
          <button type="submit" className="link">
            Apply filters
          </button>
        </noscript>
        {params.size ? (
          <Link
            href="/projects"
            scroll={false}
            onClick={() => setQuery("")}
            className="inline-flex min-h-11 items-center gap-1 text-ink-2 hover:text-ink"
          >
            <Icon icon={X} size={14} /> Clear all
          </Link>
        ) : null}
      </div>
    </form>
  );
}

interface Option {
  value: string;
  label: string;
}

/** Only filters with a real choice (two or more options, or an active value) are shown. */
function FilterControls({
  facets,
  params,
}: {
  facets: ProjectFacetsDTO;
  params: ReturnType<typeof useSearchParams>;
}) {
  const fields: { name: string; label: string; all: string; options: Option[] }[] = [
    {
      name: "type",
      label: "Type",
      all: "All types",
      options: facets.types.map((item) => ({
        value: item.type,
        label: `${PROJECT_TYPE_LABELS[item.type as ProjectType]} (${item.count})`,
      })),
    },
    {
      name: "category",
      label: "Category",
      all: "All categories",
      options: facets.categories.map((item) => ({
        value: item.slug,
        label: `${item.name} (${item.count})`,
      })),
    },
    {
      name: "tech",
      label: "Technology",
      all: "Any technology",
      options: facets.technologies.map((item) => ({
        value: item.name,
        label: `${item.name} (${item.count})`,
      })),
    },
    {
      name: "year",
      label: "Year",
      all: "Any year",
      options: facets.years.map((item) => ({
        value: String(item.year),
        label: `${item.year} (${item.count})`,
      })),
    },
  ].filter((field) => field.options.length > 1 || params.get(field.name));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={`filter-${field.name}`} className="label mb-1.5 block">
            {field.label}
          </label>
          <select
            id={`filter-${field.name}`}
            name={field.name}
            defaultValue={params.get(field.name) ?? ""}
            className={control}
          >
            <option value="">{field.all}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div>
        <label htmlFor="filter-sort" className="label mb-1.5 block">
          Sort
        </label>
        <select
          id="filter-sort"
          name="sort"
          defaultValue={params.get("sort") ?? ""}
          className={control}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
