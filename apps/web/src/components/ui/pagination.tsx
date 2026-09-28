import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Icon } from "./icon";

/** Previous/next pagination that keeps the current query string. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const itemClass = "inline-flex min-h-11 items-center gap-2 text-sm link";
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-rule pt-6"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={itemClass} rel="prev">
          <Icon icon={ArrowLeft} size={14} /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="label">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={itemClass} rel="next">
          Next <Icon icon={ArrowRight} size={14} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
