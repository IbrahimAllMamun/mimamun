import Link from "next/link";

export interface Crumb {
  name: string;
  href?: string;
}

/** Breadcrumb trail; the last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="label">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden className="text-rule-strong">/</span> : null}
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="hover:text-ink focus-visible:text-ink">
                {item.name}
              </Link>
            ) : (
              <span aria-current={index === items.length - 1 ? "page" : undefined} className="text-ink-2">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
