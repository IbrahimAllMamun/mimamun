"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import type { SessionDTO } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { apiRequest, fieldErrors } from "@/lib/api/client";

export function LoginForm({ next, notice }: { next: string; notice?: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setErrors({});
    const result = await apiRequest<SessionDTO>("POST", "/api/auth/login", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (result.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setPending(false);
    setErrors(fieldErrors(result.error.details));
    setError(result.error.message);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <h1 className="font-serif text-2xl text-ink">Sign in</h1>
      {notice ? (
        <p className="rounded-sm bg-success-tint px-3 py-2 text-sm text-ink">{notice}</p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="flex gap-2 rounded-sm border border-error/40 bg-error-tint px-3 py-2 text-sm text-ink"
        >
          <Icon icon={CircleAlert} size={16} className="mt-0.5 shrink-0 text-error" />
          {error}
        </div>
      ) : null}
      <Field label="Email" required error={errors.email}>
        {(props) => (
          <Input {...props} name="email" type="email" autoComplete="username" autoFocus />
        )}
      </Field>
      <Field label="Password" required error={errors.password}>
        {(props) => (
          <Input {...props} name="password" type="password" autoComplete="current-password" />
        )}
      </Field>
      <Button type="submit" pending={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/admin/forgot-password" className="link">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
