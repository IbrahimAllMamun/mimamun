"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Download, Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { NavItemDTO, SocialLinkDTO } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { isActivePath } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/**
 * Small-screen navigation in a native <dialog>: focus is contained, Escape
 * closes it and focus returns to the trigger.
 */
export function MobileMenu({
  items,
  socialLinks,
  hasCv,
}: {
  items: NavItemDTO[];
  socialLinks: SocialLinkDTO[];
  hasCv: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm text-ink hover:bg-muted md:hidden"
        aria-haspopup="dialog"
      >
        <Icon icon={Menu} size={18} />
        Menu
      </button>
      <dialog
        ref={dialog}
        aria-label="Site navigation"
        className="mobile-sheet m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-scrim"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="container-page flex min-h-full flex-col py-3">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <span className="label">Navigation</span>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm hover:bg-muted"
            >
              <Icon icon={X} size={18} />
              Close
            </button>
          </div>
          <nav aria-label="Primary" className="py-6">
            <ul className="space-y-1">
              <li>
                <Link href="/" className={cn("block py-2 font-serif text-3xl", pathname === "/" ? "text-ink" : "text-ink-2")}>
                  Home
                </Link>
              </li>
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                    className={cn(
                      "block py-2 font-serif text-3xl aria-[current=page]:text-ink",
                      isActivePath(pathname, item.href) ? "text-ink" : "text-ink-2",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto space-y-4 border-t border-rule pt-5">
            {hasCv ? (
              <a href="/cv" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
                <Icon icon={Download} size={16} /> Download CV
              </a>
            ) : null}
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {socialLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-2 hover:text-ink"
                    {...(link.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {link.label}
                    <Icon icon={ArrowUpRight} size={14} />
                  </a>
                </li>
              ))}
            </ul>
            <ThemeToggle withLabel className="-ml-2 px-2" />
          </div>
        </div>
      </dialog>
    </>
  );
}
