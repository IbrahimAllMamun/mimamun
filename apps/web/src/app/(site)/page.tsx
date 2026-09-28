import type { Metadata } from "next";
import { FrontMatter } from "@/components/home/front-matter";
import {
  ApproachSection,
  ContactSection,
  CredentialsSection,
  FocusSection,
  ResearchSection,
  SelectedWork,
  TrajectorySection,
  WritingSection,
} from "@/components/home/sections";
import { JsonLd } from "@/components/site/json-ld";
import { UnavailableNotice } from "@/components/ui/states";
import { publicApi } from "@/lib/api/server";
import { SITE_URL } from "@/lib/env";
import { graph, pageMetadata, personSchema } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicApi.site();
  return pageMetadata({ site: site.ok ? site.data : null, path: "/", routeKey: "home", type: "profile" });
}

export default async function HomePage() {
  const [site, home] = await Promise.all([publicApi.site(), publicApi.home()]);
  if (!site.ok || !home.ok) {
    return (
      <div className="container-page section-space">
        <h1 className="display text-4xl">Ibrahim All-Mamun</h1>
        <UnavailableNotice className="mt-8" title="The portfolio is temporarily unavailable">
          The content service could not be reached. Please try again in a few minutes.
        </UnavailableNotice>
      </div>
    );
  }
  const { profile, socialLinks } = site.data;
  const data = home.data;

  // Section numbers follow the sections actually shown.
  const order = [
    data.focusAreas.length > 0 && "focus",
    data.featuredProjects.length > 0 && "work",
    data.approachSteps.length > 0 && "approach",
    data.featuredResearch.length > 0 && "research",
    "trajectory",
    (data.education.length > 0 || data.counts.credentials > 0) && "credentials",
    data.latestPosts.length > 0 && "writing",
  ].filter(Boolean) as string[];
  const index = (key: string) => String(order.indexOf(key) + 1).padStart(2, "0");

  return (
    <>
      <JsonLd
        data={graph(personSchema(site.data), {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: site.data.settings.siteName,
          publisher: { "@id": `${SITE_URL}/#person` },
        })}
      />
      <FrontMatter profile={profile} current={data.currentExperience} previous={data.previousExperience} education={data.education} />
      <FocusSection areas={data.focusAreas} index={index("focus")} />
      <SelectedWork projects={data.featuredProjects} total={data.counts.projects} index={index("work")} />
      <ApproachSection steps={data.approachSteps} index={index("approach")} />
      <ResearchSection research={data.featuredResearch} counts={data.counts} index={index("research")} />
      <TrajectorySection home={data} index={index("trajectory")} />
      <CredentialsSection home={data} index={index("credentials")} />
      <WritingSection posts={data.latestPosts} index={index("writing")} />
      <ContactSection profile={profile} links={socialLinks} />
    </>
  );
}
