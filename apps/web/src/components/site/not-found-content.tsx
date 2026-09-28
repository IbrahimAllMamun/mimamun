import { ButtonLink } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";

const SUGGESTIONS = [
  { href: "/projects", label: "Projects" },
  { href: "/research", label: "Research" },
  { href: "/experience", label: "Experience" },
  { href: "/contact", label: "Contact" },
];

/** 404 body shared by the site-level and root-level not-found pages. */
export function NotFoundContent() {
  return (
    <div className="container-page section-space">
      <div className="grid-editorial gap-y-6">
        <p className="label col-span-4 sm:col-span-8 lg:col-span-3">Error 404</p>
        <div className="col-span-4 space-y-6 sm:col-span-8 lg:col-span-9">
          <h1 className="display text-5xl text-ink">This page does not exist.</h1>
          <p className="max-w-measure text-lg text-ink-2">
            It may have moved, or the address may have a typo. Search the site or start from one of
            the sections below.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/search">Search the site</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Home
            </ButtonLink>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-rule pt-5">
            {SUGGESTIONS.map((item) => (
              <li key={item.href}>
                <TextLink href={item.href} arrow>
                  {item.label}
                </TextLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
