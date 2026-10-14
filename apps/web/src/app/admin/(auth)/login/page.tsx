import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleSignInMessage, type AuthProvidersDTO } from "@portfolio/shared";
import { LoginForm } from "@/components/admin/auth/login-form";
import { getSession, safeNext } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api/server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSession()) redirect(next);
  const notice =
    params.reason === "expired" ? "Your session has expired. Please sign in again." : null;
  // Without the API the password form still renders; it reports the outage on submit.
  const providers = await apiFetch<AuthProvidersDTO>("/api/auth/providers", { noStore: true });
  return (
    <LoginForm
      next={next}
      notice={notice}
      initialError={googleSignInMessage(params.error)}
      google={providers.ok && providers.data.google}
    />
  );
}
