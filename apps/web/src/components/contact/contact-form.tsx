"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Send } from "lucide-react";
import { sendContactMessage } from "@/app/(site)/contact/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { EMPTY_CONTACT_VALUES, type ContactField, type ContactFormState } from "./contact-state";

const MESSAGE_MAX = 5000;
const ORDER: ContactField[] = ["name", "email", "subject", "message"];

/**
 * The contact form posts to a Server Action, so it also works before (or
 * without) JavaScript. With JavaScript it adds a pending state, a character
 * count and focus management: the first invalid field after a failed
 * submission, or the confirmation after a successful one.
 */
export function ContactForm({
  token,
  initialSubject = "",
}: {
  token: string;
  initialSubject?: string;
}) {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(
    sendContactMessage,
    {
      status: "idle",
      message: null,
      fieldErrors: {},
      values: { ...EMPTY_CONTACT_VALUES, subject: initialSubject },
    },
  );
  const [messageLength, setMessageLength] = useState(state.values.message.length);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      confirmationRef.current?.focus();
      return;
    }
    if (state.status === "error") {
      const firstInvalid = ORDER.find((field) => state.fieldErrors[field]);
      if (firstInvalid)
        formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
    }
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        ref={confirmationRef}
        tabIndex={-1}
        role="status"
        className="animate-enter border-l-2 border-success bg-success-tint px-5 py-6 focus:outline-none"
      >
        <p className="flex items-center gap-2 font-serif text-2xl text-ink">
          <Icon icon={CheckCircle2} size={22} className="text-success" />
          Message sent
        </p>
        <p className="mt-2 text-ink-2">{state.message}</p>
        <p className="mt-4 text-sm">
          <a href="/contact" className="link">
            Write another message
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="space-y-5"
      aria-describedby={state.status === "error" ? "contact-form-error" : undefined}
    >
      {state.status === "error" && state.message ? (
        <div
          id="contact-form-error"
          role="alert"
          className="flex gap-3 rounded-sm border border-error/40 bg-error-tint px-4 py-3 text-sm"
        >
          <Icon icon={CircleAlert} size={18} className="mt-0.5 shrink-0 text-error" />
          <p className="text-ink">{state.message}</p>
        </div>
      ) : null}

      <input type="hidden" name="token" value={token} />
      <div aria-hidden className="honeypot">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required error={state.fieldErrors.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              autoComplete="name"
              maxLength={120}
              defaultValue={state.values.name}
            />
          )}
        </Field>
        <Field label="Email" required error={state.fieldErrors.email}>
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              defaultValue={state.values.email}
            />
          )}
        </Field>
      </div>
      <Field label="Subject" required error={state.fieldErrors.subject}>
        {(props) => (
          <Input {...props} name="subject" maxLength={160} defaultValue={state.values.subject} />
        )}
      </Field>
      <Field
        label="Message"
        required
        error={state.fieldErrors.message}
        description="At least 20 characters."
      >
        {(props) => (
          <>
            <Textarea
              {...props}
              name="message"
              rows={8}
              maxLength={MESSAGE_MAX}
              defaultValue={state.values.message}
              onChange={(event) => setMessageLength(event.currentTarget.value.length)}
            />
            <p className="text-right font-mono text-xs text-ink-3 tabular-nums" aria-hidden>
              {messageLength.toLocaleString("en-US")} / {MESSAGE_MAX.toLocaleString("en-US")}
            </p>
          </>
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
        <Button type="submit" pending={pending}>
          {pending ? "Sending…" : "Send message"}
          {pending ? null : <Icon icon={Send} size={16} />}
        </Button>
        <p className="text-sm text-ink-3">Your email address is used only to reply to you.</p>
      </div>
    </form>
  );
}
