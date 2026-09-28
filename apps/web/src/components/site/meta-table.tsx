import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface MetaItem {
  label: string;
  value: ReactNode;
}

/** Definition table for page metadata (role, period, institution…). Empty values are skipped. */
export function MetaTable({ items, className, columns = 4 }: { items: MetaItem[]; className?: string; columns?: 2 | 3 | 4 }) {
  const visible = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== "" && !(Array.isArray(item.value) && item.value.length === 0));
  if (visible.length === 0) return null;
  return (
    <dl
      className={cn(
        "grid grid-cols-1 border-t border-rule sm:grid-cols-2",
        columns === 4 && "lg:grid-cols-4",
        columns === 3 && "lg:grid-cols-3",
        className,
      )}
    >
      {visible.map((item) => (
        <div key={item.label} className="border-b border-rule py-3 sm:pr-6">
          <dt className="label">{item.label}</dt>
          <dd className="mt-1 text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
