"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemDTO } from "@portfolio/shared";
import { cn } from "@/lib/cn";

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Header navigation with the current section marked for sighted and screen-reader users. */
export function NavLinks({ items }: { items: NavItemDTO[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const external = item.openInNewTab || /^https?:/.test(item.href);
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                "relative inline-flex min-h-11 items-center px-2.5 text-sm transition-colors duration-(--duration-fast)",
                "after:absolute after:inset-x-2.5 after:bottom-2 after:h-0.5 after:origin-left after:bg-accent-mark after:transition-transform after:duration-(--duration-base) after:ease-out",
                active
                  ? "text-ink after:scale-x-100"
                  : "text-ink-2 after:scale-x-0 hover:text-ink hover:after:scale-x-100 focus-visible:after:scale-x-100",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
