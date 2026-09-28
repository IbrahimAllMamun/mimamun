import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * Inline text link. `arrow` adds a directional glyph that shifts slightly on
 * hover and focus; external links open in a new tab with an explicit hint.
 */
export function TextLink({
  href,
  children,
  arrow = false,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  arrow?: boolean;
  className?: string;
  external?: boolean;
}) {
  const isExternal = external ?? /^https?:\/\//.test(href);
  const content = (
    <>
      <span>{children}</span>
      {arrow || isExternal ? (
        <Icon
          icon={isExternal ? ArrowUpRight : ArrowRight}
          size={14}
          className="shrink-0 transition-transform duration-(--duration-fast) ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
        />
      ) : null}
      {isExternal ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </>
  );
  const classes = cn("link group inline-flex items-baseline gap-1", className);
  if (isExternal || href.startsWith("mailto:") || href.startsWith("/media/") || href === "/cv") {
    return (
      <a href={href} className={classes} {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
