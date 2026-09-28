/** Immutable get/set by dot path ("sections.overview.0.data.markdown"). */

export function getIn(source: unknown, path: string): unknown {
  if (!path) return source;
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function setIn<T>(source: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split(".");
  if (head === undefined) return value as T;
  const container: Record<string, unknown> | unknown[] = Array.isArray(source)
    ? [...source]
    : { ...((source as Record<string, unknown> | null) ?? {}) };
  const current = (container as Record<string, unknown>)[head];
  const next = rest.length ? setIn(current ?? (/^\d+$/.test(rest[0] ?? "") ? [] : {}), rest.join("."), value) : value;
  (container as Record<string, unknown>)[head] = next;
  return container as T;
}

/** RFC 4122 v4 id; falls back to getRandomValues where randomUUID is unavailable (plain-HTTP origins). */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
