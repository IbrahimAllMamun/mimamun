import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// In the monorepo, environment variables live in the repository root .env.
const repositoryRoot = path.resolve(process.cwd(), "../..");
loadEnvConfig(repositoryRoot);

const apiUrl = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Static security headers. The Content-Security-Policy is set per request in src/proxy.ts. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repositoryRoot,
  transpilePackages: ["@portfolio/shared"],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Uploaded media is served by the API under /media and optimised here.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    deviceSizes: [384, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [32, 64, 96, 128, 256],
    minimumCacheTTL: 31_536_000,
  },
  async rewrites() {
    // In production Caddy routes these paths straight to the API; the rewrites keep
    // development and single-container deployments working with the same URLs.
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
        { source: "/media/:path*", destination: `${apiUrl}/media/:path*` },
        { source: "/cv", destination: `${apiUrl}/cv` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
