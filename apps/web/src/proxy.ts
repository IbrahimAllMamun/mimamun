import { NextResponse, type NextRequest } from "next/server";
import { EMBED_HOSTS, VIDEO_FRAME_HOSTS } from "@portfolio/shared";

const SESSION_COOKIES = ["__Host-portfolio_session", "portfolio_session"];
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/forgot-password", "/admin/reset-password"]);

function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  const frameSources = [...EMBED_HOSTS, ...VIDEO_FRAME_HOSTS].map((host) => `https://${host}`).join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // React style attributes (image placeholders, animation indices, chart geometry).
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    `frame-src ${frameSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Runs before every page: issues a per-request CSP nonce and sends visitors
 * without a session cookie from the admin and draft previews to the login.
 * The cookie check is only a convenience — every admin API call (previews
 * included) is authorised by the API itself.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsSession = (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.has(pathname)) || pathname.startsWith("/preview/");
  if (needsSession) {
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Lets server components (the admin session check) build a return path.
  requestHeaders.set("x-pathname", pathname + search);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (pathname.startsWith("/admin") || pathname.startsWith("/preview")) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|media/|cv$|_next/static|_next/image|og/|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
