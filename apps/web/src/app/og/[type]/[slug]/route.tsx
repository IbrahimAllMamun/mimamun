import { formatDate, PROJECT_TYPE_LABELS, RESEARCH_KIND_LABELS } from "@portfolio/shared";
import { publicApi } from "@/lib/api/server";
import { SITE_URL } from "@/lib/env";
import { renderCard, type CardInput } from "@/lib/og/card";

const CACHE = { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" };

async function cardFor(
  type: string,
  slug: string,
  author: string,
  role: string,
): Promise<CardInput | null> {
  const host = new URL(SITE_URL).host;
  const base = { author, role, host };
  switch (type) {
    case "site": {
      if (slug !== "default") return null;
      const site = await publicApi.site();
      if (!site.ok) return null;
      // The name is the title here, so the footer carries the address instead.
      return {
        ...base,
        author: host,
        host: "",
        eyebrow: site.data.profile.location ?? "Portfolio",
        title: author,
        description: site.data.profile.statement,
      };
    }
    case "projects": {
      const project = await publicApi.project(slug);
      if (!project.ok) return null;
      const data = project.data;
      return {
        ...base,
        eyebrow: ["Case study", PROJECT_TYPE_LABELS[data.type], data.year]
          .filter(Boolean)
          .join(" · "),
        title: data.title,
        description: data.summary,
        tone: "primary",
      };
    }
    case "research": {
      const research = await publicApi.researchItem(slug);
      if (!research.ok) return null;
      const data = research.data;
      return {
        ...base,
        eyebrow: [RESEARCH_KIND_LABELS[data.kind], data.institution, data.year]
          .filter(Boolean)
          .join(" · "),
        title: data.title,
        description: data.summary,
        tone: "secondary",
      };
    }
    case "blog": {
      const post = await publicApi.post(slug);
      if (!post.ok) return null;
      const data = post.data;
      return {
        ...base,
        eyebrow: ["Writing", data.publishedAt ? formatDate(data.publishedAt) : null]
          .filter(Boolean)
          .join(" · "),
        title: data.title,
        description: data.excerpt,
        tone: "accent",
      };
    }
    case "certifications": {
      const credential = await publicApi.credential(slug);
      if (!credential.ok) return null;
      const data = credential.data;
      return {
        ...base,
        eyebrow: `${data.type.name} · ${data.provider.name}`,
        title: data.title,
        description: data.description,
        tone: "primary",
      };
    }
    default:
      return null;
  }
}

/** Social cards: /og/{projects|research|blog|certifications}/{slug} and /og/site/default. */
export async function GET(_request: Request, { params }: RouteContext<"/og/[type]/[slug]">) {
  const { type, slug } = await params;
  const site = await publicApi.site();
  const author = site.ok ? site.data.profile.fullName : "Ibrahim All-Mamun";
  const role = site.ok ? site.data.profile.headline : "Data Scientist";
  const card = await cardFor(type, slug, author, role);
  if (!card)
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  return renderCard(card, { headers: CACHE });
}
