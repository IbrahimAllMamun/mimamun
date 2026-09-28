import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-medium whitespace-nowrap select-none rounded-sm border transition-[background-color,border-color,color,transform] duration-(--duration-fast) ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary border-primary hover:bg-primary-hover hover:border-primary-hover",
  secondary: "bg-transparent text-ink border-rule-strong hover:border-ink hover:bg-elevated",
  ghost: "bg-transparent text-ink-2 border-transparent hover:bg-muted hover:text-ink",
  danger: "bg-error text-on-primary border-error hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

/** A button. Use `ButtonLink` when the action navigates. */
export function Button({
  variant,
  size,
  className,
  pending = false,
  children,
  ...props
}: CommonProps & ComponentProps<"button"> & { pending?: boolean }) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      aria-busy={pending || undefined}
      disabled={props.disabled || pending}
      {...props}
    >
      {pending ? (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

/** A link styled as a button — keeps navigation semantics. */
export function ButtonLink({
  variant,
  size,
  className,
  children,
  href,
  external,
  ...props
}: CommonProps & Omit<ComponentProps<typeof Link>, "href"> & { href: string; external?: boolean }) {
  const classes = buttonClass(variant, size, className);
  if (external || href.startsWith("/media/") || href === "/cv") {
    return (
      <a href={href} className={classes} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
