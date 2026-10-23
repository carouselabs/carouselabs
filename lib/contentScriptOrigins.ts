// lib/contentScriptOrigins.ts — the pages the extensions' content scripts run
// on, and so the only origins app/api/ext/config answers with CORS headers:
// LinkedIn (browser-extension-comment/manifest.config.ts) and X
// (manifest.x.config.ts). The e2e harness answers with the same list, so a
// page missing here fails the tests the way it fails in production.
import type { EngagePlatform } from "@/lib/engage/features"

// Each extension's site.
export const PLATFORM_ORIGINS: Record<EngagePlatform, string[]> = {
  linkedin: ["https://www.linkedin.com"],
  x: ["https://x.com"],
  reddit: ["https://www.reddit.com"],
}

export const CONTENT_SCRIPT_ORIGINS = Object.values(PLATFORM_ORIGINS).flat()

// The extension whose content script runs on this page, if any.
export function platformOfOrigin(origin: string | null): EngagePlatform | null {
  const entry = Object.entries(PLATFORM_ORIGINS).find(([, origins]) => !!origin && origins.includes(origin))
  return entry ? (entry[0] as EngagePlatform) : null
}
