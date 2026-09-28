import helmet from "helmet";

/**
 * API responses are JSON (or media files with their own headers), so the CSP
 * is locked down completely. HSTS is set by the reverse proxy in production.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  strictTransportSecurity: false,
  xFrameOptions: { action: "deny" },
});
