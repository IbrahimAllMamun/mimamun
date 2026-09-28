"use server";

import { headers } from "next/headers";
import { contactInput } from "@portfolio/shared";
import { EMPTY_CONTACT_VALUES, type ContactField, type ContactFormState } from "@/components/contact/contact-state";
import { API_INTERNAL_URL } from "@/lib/env";

const FIELDS: ContactField[] = ["name", "email", "subject", "message"];

function fieldErrorsFrom(issues: { path: PropertyKey[] | string; message: string }[]): ContactFormState["fieldErrors"] {
  const errors: ContactFormState["fieldErrors"] = {};
  for (const issue of issues) {
    const key = (Array.isArray(issue.path) ? issue.path[0] : String(issue.path).split(".")[0]) as ContactField;
    if (FIELDS.includes(key) && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Validates with the shared schema, then forwards to the API, which applies
 * rate limits, the timing token, the honeypot and spam heuristics. The
 * visitor's address is passed on from the reverse proxy so rate limits apply
 * per visitor rather than to the web server.
 */
export async function sendContactMessage(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) as Record<ContactField, string>;
  const parsed = contactInput.safeParse({
    ...values,
    token: String(formData.get("token") ?? ""),
    website: String(formData.get("website") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
      values,
    };
  }

  const incoming = await headers();
  const forwardedFor = incoming.get("x-forwarded-for");
  let response: Response;
  try {
    response = await fetch(`${API_INTERNAL_URL}/api/public/contact`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        "user-agent": incoming.get("user-agent") ?? "",
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return {
      status: "error",
      message: "The message could not be sent right now. Please try again in a moment, or email me directly.",
      fieldErrors: {},
      values,
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { success: true; data: { message: string } }
    | { success: false; error: { message: string; details?: { path: string; message: string }[] } }
    | null;
  if (response.ok && body?.success) {
    return { status: "success", message: body.data.message, fieldErrors: {}, values: EMPTY_CONTACT_VALUES };
  }
  const error = body && !body.success ? body.error : null;
  return {
    status: "error",
    message: error?.message ?? "The message could not be sent. Please try again, or email me directly.",
    fieldErrors: error?.details ? fieldErrorsFrom(error.details) : {},
    values,
  };
}
