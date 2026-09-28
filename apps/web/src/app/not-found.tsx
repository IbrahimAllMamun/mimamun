import type { Metadata } from "next";
import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { publicApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Unmatched URLs render outside the (site) layout, so the chrome is added here. */
export default async function RootNotFound() {
  const site = await publicApi.site();
  const data = site.ok ? site.data : null;
  return (
    <>
      <SiteHeader site={data} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <NotFoundContent />
      </main>
      <SiteFooter site={data} />
    </>
  );
}
