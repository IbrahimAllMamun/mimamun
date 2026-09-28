export type ContactField = "name" | "email" | "subject" | "message";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<ContactField, string>>;
  /** Submitted values, returned on error so nothing typed is lost. */
  values: Record<ContactField, string>;
}

export const EMPTY_CONTACT_VALUES: Record<ContactField, string> = {
  name: "",
  email: "",
  subject: "",
  message: "",
};
