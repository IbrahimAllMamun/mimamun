/**
 * Hosts that may be embedded in an iframe through the `embed` block, and
 * video providers. The web app's Content-Security-Policy `frame-src` is built
 * from the same lists, so the two can never drift apart.
 */
export const EMBED_HOSTS: readonly string[] = [
  "public.tableau.com",
  "app.powerbi.com",
  "observablehq.com",
  "lookerstudio.google.com",
  "datawrapper.dwcdn.net",
  "flo.uri.sh",
  "docs.google.com",
  "*.shinyapps.io",
  "*.hf.space",
];

export const VIDEO_FRAME_HOSTS: readonly string[] = [
  "www.youtube-nocookie.com",
  "player.vimeo.com",
];

export function hostMatches(hostname: string, pattern: string): boolean {
  const host = hostname.toLowerCase();
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".shinyapps.io"
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === pattern;
}

export function isAllowedEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return EMBED_HOSTS.some((pattern) => hostMatches(parsed.hostname, pattern));
  } catch {
    return false;
  }
}

export interface ParsedVideo {
  provider: "youtube" | "vimeo";
  id: string;
  embedUrl: string;
}

/** Extracts a provider video id and returns a privacy-friendly embed URL. */
export function parseVideoUrl(url: string): ParsedVideo | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = parsed.pathname.slice(1).split("/")[0] ?? null;
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") youtubeId = parsed.searchParams.get("v");
    const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
    if (match?.[1]) youtubeId = match[1];
  }
  if (youtubeId && /^[A-Za-z0-9_-]{6,20}$/.test(youtubeId)) {
    return {
      provider: "youtube",
      id: youtubeId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = parsed.pathname.match(/(?:^|\/)(\d{5,12})(?:$|\/)/);
    if (match?.[1]) {
      return {
        provider: "vimeo",
        id: match[1],
        embedUrl: `https://player.vimeo.com/video/${match[1]}?dnt=1`,
      };
    }
  }
  return null;
}
