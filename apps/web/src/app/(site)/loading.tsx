import { Skeleton } from "@/components/ui/states";

/** Shown while a page's data loads: the title block and a few rows, in place. */
export default function SiteLoading() {
  return (
    <div role="status" aria-label="Loading" className="container-page pt-10 sm:pt-14 lg:pt-20">
      <div className="grid-editorial gap-y-6">
        <div className="col-span-4 sm:col-span-8 lg:col-span-3">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="col-span-4 space-y-5 sm:col-span-8 lg:col-span-9">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
          <div className="space-y-4 pt-10">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-2 border-t border-rule pt-5">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
