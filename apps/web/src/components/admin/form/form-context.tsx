"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OptionsDTO } from "@portfolio/shared";
import type { FormRecord } from "../resources/types";

export interface FormApi {
  record: FormRecord;
  setValue: (path: string, value: unknown) => void;
  /** Field errors keyed by dot path, as returned by the API. */
  errors: Record<string, string>;
  options: OptionsDTO;
  disabled?: boolean;
  /** Reloads option lists, e.g. after creating a tag elsewhere. */
  reloadOptions?: () => void;
}

const FormContext = createContext<FormApi | null>(null);

export function FormProvider({ value, children }: { value: FormApi; children: ReactNode }) {
  return <FormContext value={value}>{children}</FormContext>;
}

export function useForm(): FormApi {
  const form = useContext(FormContext);
  if (!form) throw new Error("useForm must be used inside <FormProvider>");
  return form;
}

/** Errors below a path, e.g. every error inside one content block. */
export function errorsUnder(errors: Record<string, string>, path: string): string[] {
  return Object.entries(errors)
    .filter(([key]) => key === path || key.startsWith(`${path}.`))
    .map(([, message]) => message);
}
