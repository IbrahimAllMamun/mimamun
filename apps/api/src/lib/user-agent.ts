import type { DeviceCategory } from "@portfolio/shared";

/**
 * Minimal user-agent classification for privacy-preserving analytics. Only
 * coarse families are derived; the raw user agent is never stored.
 */
export interface UserAgentInfo {
  isBot: boolean;
  device: DeviceCategory;
  browser: string;
  os: string;
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|quora link preview|headlesschrome|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client|java\/|preview|scanner/i;

export function classifyUserAgent(userAgent: string | undefined | null): UserAgentInfo {
  const ua = userAgent ?? "";
  if (!ua) return { isBot: true, device: "desktop", browser: "Other", os: "Other" };
  const isBot = BOT_PATTERN.test(ua);

  let device: DeviceCategory = "desktop";
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) device = "tablet";
  else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua)) device = "mobile";

  let browser = "Other";
  if (/edg(e|a|ios)?\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/chrome|crios|chromium/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";

  let os = "Other";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return { isBot, device, browser, os };
}

/** Describes a session's device for the admin sessions list, e.g. "Chrome on macOS". */
export function describeUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const info = classifyUserAgent(userAgent);
  return `${info.browser} on ${info.os}`;
}
