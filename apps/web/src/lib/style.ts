import type { CSSProperties } from "react";

/** Index for staggered entrance animations (see .motion-enter in motion.css). */
export function stagger(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}
