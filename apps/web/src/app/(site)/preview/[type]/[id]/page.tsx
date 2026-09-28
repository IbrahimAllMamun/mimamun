import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { CONTENT_STATUS_LABELS, formatDate, type BlogPostDetailDTO, type ContentStatus, type ProjectDetailDTO, type ResearchDetailDTO } from "@portfolio/shared";
import { PostArticle } from "@/components/blog/post-article";
import { ProjectArticle } from "@/components/projects/project-article";
import { ResearchArticle } from "@/components/research/research-article";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { UnavailableNotice } from "@/components/ui/states";
import { apiFetch, publicApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

const TYPES = {
  projects: { label: "Project", editor: "projects" },
  research: { label: "Research", editor: "research" },
  "blog-posts": { label: "Post", editor: "blog-posts" },
} as const;
type PreviewType = keyof typeof TYPES;

function isPreviewType(value: string): value is PreviewType {
  return value in TYPES;
}

function PreviewBanner({ type, id, status, updatedAt }: { type: PreviewType; id: string; status: ContentStatus; updatedAt: string }) {
  return (
    <div className="border-b border-accent-mark/40 bg-accent-tint">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 text-sm">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink">
          <Icon icon={Eye} size={16} className="text-accent" />
          <strong className="font-medium">Preview</strong>
          <StatusBadge tone={status === "published" ? "positive" : status === "archived" ? "neutral" : "attention"}>
            {CONTENT_STATUS_LABELS[status]}
          </StatusBadge>
          <span className="text-ink-2">Last saved {formatDate(updatedAt)}. Only signed-in editors can see this page.</span>
        </p>
        <a href={`/admin/${TYPES[type].editor}/${id}`} className="link font-medium">
          Back to editor
        </a>
      </div>
    </div>
  );
}

/** Drafts rendered with the public layouts, for signed-in editors only. */
export default async function PreviewPage({ params }: PageProps<"/preview/[type]/[id]">) {
  const { type, id } = await params;
  if (!isPreviewType(type) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const cookie = (await cookies()).toString();
  const result = await apiFetch<ProjectDetailDTO | ResearchDetailDTO | BlogPostDetailDTO>(`/api/admin/preview/${type}/${id}`, {
    noStore: true,
    cookie,
  });
  if (!result.ok) {
    if (result.status === 401) redirect(`/admin/login?next=${encodeURIComponent(`/preview/${type}/${id}`)}`);
    if (result.status === 404) notFound();
    return (
      <div className="container-page section-space">
        <UnavailableNotice title={result.status === 403 ? "You do not have access to previews" : "The preview could not be loaded"}>
          {result.error.message}
        </UnavailableNotice>
      </div>
    );
  }

  const banner = <PreviewBanner type={type} id={id} status={result.data.status} updatedAt={result.data.updatedAt} />;
  if (type === "projects") {
    return (
      <>
        {banner}
        <ProjectArticle project={result.data as ProjectDetailDTO} preview />
      </>
    );
  }
  if (type === "research") {
    const site = await publicApi.site();
    const research = result.data as ResearchDetailDTO;
    return (
      <>
        {banner}
        <ResearchArticle research={research} owner={site.ok ? site.data.profile.fullName : (research.authors[0] ?? "")} preview />
      </>
    );
  }
  return (
    <>
      {banner}
      <PostArticle post={result.data as BlogPostDetailDTO} preview />
    </>
  );
}
