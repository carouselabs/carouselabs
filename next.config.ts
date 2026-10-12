import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep this application isolated from unrelated parent lockfiles.
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  // Audit builds can coexist with a developer's running dev server.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  experimental: {
    // Turbopack's build cache (on by default since 16.3) served a stale
    // app/globals.css on Vercel after a large change: the 2026-10-12 redesign
    // deploy shipped the previous stylesheet with the new pages. Reproduced
    // locally by building the old commit, then the new one on its cache.
    // Every production build compiles from scratch instead.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Script nonces need Clerk + checkout validation before enforcement.
          { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
