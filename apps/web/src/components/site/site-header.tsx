import Link from "next/link";
import { Download } from "lucide-react";
import type { SiteDTO } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export const FALLBACK_NAV = [
  { id: "projects", label: "Projects", href: "/projects", openInNewTab: false },
  { id: "research", label: "Research", href: "/research", openInNewTab: false },
  { id: "experience", label: "Experience", href: "/experience", openInNewTab: false },
  { id: "about", label: "About", href: "/about", openInNewTab: false },
  { id: "contact", label: "Contact", href: "/contact", openInNewTab: false },
];

export function SiteHeader({ site }: { site: SiteDTO | null }) {
  const name = site?.profile.fullName ?? "Ibrahim All-Mamun";
  const items = site?.navigation.header.length ? site.navigation.header : FALLBACK_NAV;
  const hasCv = Boolean(site?.profile.cv);
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper">
      <div className="container-page flex h-(--header-height) items-center justify-between gap-4">
        <Link href="/" className="group flex min-h-11 items-baseline gap-3" aria-label={`${name} — home`}>
          <span className="font-serif text-lg font-medium text-ink">{name}</span>
          <span className="label hidden transition-colors group-hover:text-ink-2 lg:inline">
            {site?.profile.headline ?? "Data Scientist"}
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden md:block">
          <NavLinks items={items} />
        </nav>
        <div className="flex items-center gap-1">
          {hasCv ? (
            <a
              href="/cv"
              className="hidden min-h-11 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary-tint md:inline-flex"
            >
              <Icon icon={Download} size={15} />
              CV
            </a>
          ) : null}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <MobileMenu items={items} socialLinks={site?.socialLinks ?? []} hasCv={hasCv} />
        </div>
      </div>
    </header>
  );
}
