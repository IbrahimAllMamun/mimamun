import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tagClass =
  "inline-flex items-center rounded-xs border border-rule px-1.5 py-0.5 font-mono text-xs leading-none text-ink-2";

/** Small mono label for technologies, keywords and methods. */
export function Tag({ children, href, className }: { children: ReactNode; href?: string; className?: string }) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(tagClass, "transition-colors duration-(--duration-fast) hover:border-ink-3 hover:text-ink", className)}
      >
        {children}
      </Link>
    );
  }
  return <span className={cn(tagClass, className)}>{children}</span>;
}

export function TagList({ items, hrefFor, label }: { items: string[]; hrefFor?: (item: string) => string; label: string }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={label}>
      {items.map((item) => (
        <li key={item}>
          <Tag href={hrefFor?.(item)}>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}
