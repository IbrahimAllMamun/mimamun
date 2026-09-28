import type { ReactNode } from "react";

/** Re-mounts on navigation so the short page-entrance transition plays (reduced-motion aware). */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <div className="motion-safe:animate-page">{children}</div>;
}
