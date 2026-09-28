import type { Metadata } from "next";
import { Download, Info } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { PageHeader } from "@/components/site/page-header";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { UnavailableNotice } from "@/components/ui/states";
import { TextLink } from "@/components/ui/text-link";
import { publicApi } from "@/lib/api/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicApi.site();
  return pageMetadata({ site: site.ok ? site.data : null, title: "Contact", path: "/contact", routeKey: "contact" });
}

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const [site, token, params] = await Promise.all([publicApi.site(), publicApi.contactToken(), searchParams]);
  const profile = site.ok ? site.data.profile : null;
  const links = site.ok ? site.data.socialLinks.filter((link) => link.platform !== "email") : [];
  const formEnabled = site.ok && site.data.settings.contactFormEnabled;
  const cvRequested = params.topic === "cv";

  return (
    <>
      <PageHeader eyebrow="Contact" title="Contact" lead="Get in touch about data science roles, research or collaboration." />
      <div className="container-page">
        <div className="grid-editorial gap-y-12">
          <aside aria-label="Direct contact" className="col-span-4 space-y-8 sm:col-span-8 lg:col-span-3">
            {profile?.email ? (
              <div className="space-y-1">
                <p className="label">Email</p>
                <a href={`mailto:${profile.email}`} className="link font-serif text-xl break-all">
                  {profile.email}
                </a>
                <div>
                  <CopyButton text={profile.email} label="Copy address" />
                </div>
              </div>
            ) : null}
            {profile?.location ? (
              <div className="space-y-1">
                <p className="label">Based in</p>
                <p className="text-ink">{profile.location}</p>
              </div>
            ) : null}
            {links.length ? (
              <div className="space-y-1">
                <p className="label">Elsewhere</p>
                <ul className="space-y-1">
                  {links.map((link) => (
                    <li key={link.id}>
                      <TextLink href={link.url}>{link.label}</TextLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {profile?.cv ? (
              <div className="space-y-1">
                <p className="label">CV</p>
                <a href="/cv" className="link inline-flex min-h-11 items-center gap-1.5">
                  <Icon icon={Download} size={16} /> Download CV
                </a>
              </div>
            ) : null}
          </aside>

          <div className="col-span-4 space-y-6 sm:col-span-8 lg:col-span-7 lg:col-start-5">
            {cvRequested && !profile?.cv ? (
              <div role="status" className="flex gap-3 rounded-sm border border-info/40 bg-info-tint px-4 py-3 text-sm">
                <Icon icon={Info} size={18} className="mt-0.5 shrink-0 text-info" />
                <p className="text-ink">The CV is not available to download at the moment. You can request a copy with the form below.</p>
              </div>
            ) : null}
            {!formEnabled ? (
              <UnavailableNotice title="The contact form is closed">
                {profile?.email ? `Please email ${profile.email} instead.` : "Please try again later."}
              </UnavailableNotice>
            ) : !token.ok ? (
              <UnavailableNotice title="The contact form is temporarily unavailable">
                {profile?.email ? `Please email ${profile.email} instead.` : "Please try again in a few minutes."}
              </UnavailableNotice>
            ) : (
              <ContactForm token={token.data.token} initialSubject={cvRequested ? "CV request" : ""} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
