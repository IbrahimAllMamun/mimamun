/**
 * Post-login destinations. Only paths inside the admin or draft previews are
 * accepted, so a crafted `?next=` link cannot send someone to another site
 * (open redirect) or back to the sign-in pages.
 */
export function safeNext(value: string | string[] | undefined | null): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || next.startsWith("//") || next.includes("\\")) return "/admin";
  if (!/^\/(admin|preview)(\/|$|\?)/.test(next)) return "/admin";
  if (/^\/admin\/(login|forgot-password|reset-password)/.test(next)) return "/admin";
  return next;
}
