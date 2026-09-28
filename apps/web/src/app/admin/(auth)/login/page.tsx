import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/auth/login-form";
import { getSession, safeNext } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSession()) redirect(next);
  const notice =
    params.reason === "expired" ? "Your session has expired. Please sign in again." : null;
  return <LoginForm next={next} notice={notice} />;
}
