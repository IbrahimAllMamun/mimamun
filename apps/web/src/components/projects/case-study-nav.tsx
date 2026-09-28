"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Sticky contents for long case studies. The link for the section currently
 * in view is marked with aria-current="location".
 */
export function CaseStudyNav({ sections }: { sections: { key: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(sections[0]?.key ?? null);

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(section.key))
      .filter((element): element is HTMLElement => Boolean(element));
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Case study contents" className="sticky top-(--sticky-offset)">
      <p className="label mb-3">Contents</p>
      <ol className="space-y-0.5 border-l border-rule">
        {sections.map((section, index) => (
          <li key={section.key}>
            <a
              href={`#${section.key}`}
              aria-current={active === section.key ? "location" : undefined}
              className={cn(
                "-ml-px flex min-h-9 items-center gap-3 border-l-2 py-1 pl-3 text-sm transition-colors duration-(--duration-fast)",
                active === section.key ? "border-accent-mark text-ink" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              <span className="font-mono text-xs tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
