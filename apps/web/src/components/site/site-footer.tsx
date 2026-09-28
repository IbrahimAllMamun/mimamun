import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SiteDTO } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { FALLBACK_NAV } from "./site-header";

export function SiteFooter({ site }: { site: SiteDTO | null }) {
  const profile = site?.profile;
  const header = site?.navigation.header.length ? site.navigation.header : FALLBACK_NAV;
  const footer = site?.navigation.footer ?? [];
  const year = new Date().getFullYear();
  return (
    <footer className="mt-(--space-section) border-t-2 border-ink bg-paper">
      <div className="container-page grid-editorial gap-y-10 py-12">
        <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-5">
          <p className="font-serif text-2xl text-ink">{profile?.fullName ?? "Ibrahim All-Mamun"}</p>
          <p className="max-w-sm text-ink-2">
            {profile?.headline ?? "Data Scientist"}
            {profile?.location ? ` · ${profile.location}` : ""}
          </p>
          {site?.settings.footerNote ? (
            <p className="max-w-sm text-sm text-ink-3">{site.settings.footerNote}</p>
          ) : null}
        </div>
        <nav aria-label="Footer" className="col-span-2 sm:col-span-4 lg:col-span-3">
          <p className="label mb-3">Index</p>
          <ul className="space-y-1.5 text-sm">
            {[...header, ...footer].map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-ink-2 hover:text-ink focus-visible:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="col-span-2 sm:col-span-4 lg:col-span-4">
          <p className="label mb-3">Elsewhere</p>
          <ul className="space-y-1.5 text-sm">
            {(site?.socialLinks ?? []).map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  className="inline-flex items-center gap-1 text-ink-2 hover:text-ink"
                  {...(link.url.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.platform === "email" ? (link.handle ?? link.label) : link.label}
                  {link.url.startsWith("http") ? <Icon icon={ArrowUpRight} size={13} /> : null}
                </a>
              </li>
            ))}
            {profile?.cv ? (
              <li>
                <a href="/cv" className="text-ink-2 hover:text-ink">
                  Curriculum vitae (PDF)
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="container-page">
        <p className="label flex flex-wrap justify-between gap-2 border-t border-rule py-5">
          <span>
            © {year} {profile?.fullName ?? "Ibrahim All-Mamun"}
          </span>
          <span>Set in Newsreader and IBM Plex</span>
        </p>
      </div>
    </footer>
  );
}
