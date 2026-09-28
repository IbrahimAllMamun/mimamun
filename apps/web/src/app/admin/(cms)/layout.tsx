import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { currentPath, getSession } from "@/lib/admin-server";

/** Every CMS page requires a valid session, checked against the API on each request. */
export default async function CmsLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect(`/admin/login?reason=expired&next=${encodeURIComponent(await currentPath())}`);
  return <AdminShell session={session}>{children}</AdminShell>;
}
