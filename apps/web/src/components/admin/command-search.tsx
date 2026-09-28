"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminSearchResultDTO } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { NAV_GROUPS } from "./navigation";
import { useCan } from "./session";

interface Entry {
  key: string;
  title: string;
  subtitle: string | null;
  href: string;
  group: string;
}

const TYPE_LABELS: Record<string, string> = {
  project: "Projects",
  research: "Research",
  publication: "Publications",
  presentation: "Presentations",
  blog_post: "Writing",
  credential: "Certifications",
  experience: "Experience",
  education: "Education",
  skill: "Skills",
  message: "Messages",
  media: "Media",
};

/**
 * Global admin search (Ctrl/⌘ K): jumps to admin pages by name and searches
 * content, messages and media through the API. Arrow keys move through the
 * results; Enter opens the highlighted one.
 */
export function CommandSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const can = useCan();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; items: AdminSearchResultDTO[] }>({
    query: "",
    items: [],
  });
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      input.current?.select();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const timer = setTimeout(() => {
      void apiRequest<AdminSearchResultDTO[]>(
        "GET",
        `/api/admin/search?q=${encodeURIComponent(term)}`,
      ).then((result) => {
        if (result.ok) setResults({ query: term, items: result.data });
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const entries = useMemo<Entry[]>(() => {
    const term = query.trim().toLowerCase();
    const pages = NAV_GROUPS.flatMap((group) => group.items)
      .filter((item) => can(item.permission) && (!term || item.label.toLowerCase().includes(term)))
      .slice(0, term ? 5 : 8)
      .map((item) => ({
        key: `page:${item.href}`,
        title: item.label,
        subtitle: null,
        href: item.href,
        group: "Go to",
      }));
    const content =
      term.length >= 2 && results.query === query.trim()
        ? results.items.map((item) => ({
            key: `${item.type}:${item.id}`,
            title: item.title,
            subtitle: item.subtitle,
            href: item.href,
            group: TYPE_LABELS[item.type] ?? "Results",
          }))
        : [];
    return [...pages, ...content];
  }, [can, query, results]);

  const go = (entry: Entry | undefined) => {
    if (!entry) return;
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 w-full max-w-sm items-center gap-2 rounded-sm border border-rule-strong bg-elevated px-3 text-sm text-ink-3 hover:border-ink-3"
      >
        <Icon icon={Search} size={16} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded-xs border border-rule px-1.5 font-mono text-xs sm:inline">
          Ctrl K
        </kbd>
      </button>
      <dialog
        ref={dialog}
        aria-label="Search the admin"
        className="dialog-panel dialog-frame mx-auto mt-24 max-w-xl overflow-hidden rounded-md border border-rule bg-paper p-0 text-ink shadow-dialog backdrop:bg-scrim"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <Icon icon={Search} size={18} className="text-ink-3" />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(entries.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                go(entries[active]);
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={entries[active] ? `command-${active}` : undefined}
            placeholder="Search content, messages, media or pages"
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3"
          />
        </div>
        <ul
          id="command-results"
          role="listbox"
          aria-label="Results"
          className="max-h-96 overflow-y-auto py-2"
        >
          {entries.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-ink-3">
              {query.trim().length >= 2 ? "No matches." : "Type to search."}
            </li>
          ) : (
            entries.map((entry, index) => (
              <li key={entry.key} role="presentation">
                {index === 0 || entries[index - 1]?.group !== entry.group ? (
                  <p className="label px-4 pt-3 pb-1" role="presentation">
                    {entry.group}
                  </p>
                ) : null}
                <button
                  type="button"
                  id={`command-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(entry)}
                  className={cn(
                    "flex w-full flex-col items-start px-4 py-2 text-left",
                    index === active && "bg-muted",
                  )}
                >
                  <span className="text-sm text-ink">{entry.title}</span>
                  {entry.subtitle ? (
                    <span className="text-xs text-ink-3">{entry.subtitle}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </dialog>
    </>
  );
}
