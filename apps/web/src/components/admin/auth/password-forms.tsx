"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { apiRequest, fieldErrors } from "@/lib/api/client";

function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-sm border border-error/40 bg-error-tint px-3 py-2 text-sm text-ink"
    >
      <Icon icon={CircleAlert} size={16} className="mt-0.5 shrink-0 text-error" />
      {message}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setPending(true);
    setError(null);
    const result = await apiRequest<{ message: string }>("POST", "/api/auth/password/forgot", {
      email,
    });
    setPending(false);
    if (result.ok) setSent(result.data.message);
    else setError(result.error.message);
  };

  if (sent) {
    return (
      <div role="status" className="space-y-4">
        <h1 className="font-serif text-2xl text-ink">Check your email</h1>
        <p className="text-ink-2">{sent} The link is valid for one hour.</p>
        <Link href="/admin/login" className="link text-sm">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl text-ink">Reset your password</h1>
        <p className="text-sm text-ink-2">
          Enter the email address of your admin account and we will send a reset link.
        </p>
      </div>
      <ErrorBox message={error} />
      <Field label="Email" required>
        {(props) => (
          <Input {...props} name="email" type="email" autoComplete="username" autoFocus />
        )}
      </Field>
      <Button type="submit" pending={pending} className="w-full">
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/admin/login" className="link">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setErrors({ confirm: "The passwords do not match" });
      return;
    }
    setPending(true);
    setError(null);
    setErrors({});
    const result = await apiRequest<{ message: string }>("POST", "/api/auth/password/reset", {
      token,
      password,
    });
    setPending(false);
    if (result.ok) setDone(result.data.message);
    else {
      setErrors(fieldErrors(result.error.details));
      setError(result.error.message);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl text-ink">Link incomplete</h1>
        <p className="text-ink-2">
          This reset link is missing its token. Request a new link and open it from the email.
        </p>
        <Link href="/admin/forgot-password" className="link text-sm">
          Request a new link
        </Link>
      </div>
    );
  }
  if (done) {
    return (
      <div role="status" className="space-y-4">
        <h1 className="font-serif text-2xl text-ink">Password updated</h1>
        <p className="text-ink-2">{done}</p>
        <Link href="/admin/login" className="link text-sm">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <h1 className="font-serif text-2xl text-ink">Choose a new password</h1>
      <ErrorBox message={error} />
      <Field
        label="New password"
        required
        error={errors.password}
        description={`At least ${PASSWORD_MIN_LENGTH} characters. A long phrase works well.`}
      >
        {(props) => (
          <Input {...props} name="password" type="password" autoComplete="new-password" autoFocus />
        )}
      </Field>
      <Field label="Repeat the new password" required error={errors.confirm}>
        {(props) => <Input {...props} name="confirm" type="password" autoComplete="new-password" />}
      </Field>
      <Button type="submit" pending={pending} className="w-full">
        Save password
      </Button>
    </form>
  );
}
