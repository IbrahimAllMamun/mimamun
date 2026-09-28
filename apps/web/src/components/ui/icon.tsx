import type { LucideIcon, LucideProps } from "lucide-react";

/** Consistent icon rendering: 1.5px strokes, hidden from assistive tech unless labelled. */
export function Icon({
  icon: Component,
  size = 16,
  label,
  ...props
}: { icon: LucideIcon; size?: number; label?: string } & Omit<LucideProps, "ref">) {
  return (
    <Component
      width={size}
      height={size}
      strokeWidth={1.5}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      {...props}
    />
  );
}
