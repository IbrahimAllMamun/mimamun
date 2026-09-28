import type { ReactNode } from "react";
import { AnalyticsBeacon } from "@/components/site/analytics-beacon";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const site = await publicApi.site();
  const data = site.ok ? site.data : null;
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-ink px-4 py-3 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader site={data} />
      {!site.ok ? (
        <div className="container-page pt-4">
          <UnavailableNotice title="Some content is temporarily unavailable">
            The site is running in a limited mode. Please try again shortly.
          </UnavailableNotice>
        </div>
      ) : null}
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <SiteFooter site={data} />
      {data?.settings.analyticsEnabled ? <AnalyticsBeacon /> : null}
    </>
  );
}
