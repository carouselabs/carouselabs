// components/extension/engageExtensions.tsx — the two Engage extensions the
// website's Extension section covers. They're separate products, installed
// and paid for separately, each with its own pages: LinkedIn's at
// /extension/*, X's at /extension/x/*, with the same tabs.
import { EXTENSION_STORE_URL, X_EXTENSION_STORE_URL } from "@/lib/plans"
import type { EngagePlatform } from "@/lib/engage/features"

export const ENGAGE_EXTENSIONS: Record<
  EngagePlatform,
  {
    name: string
    // What the Chrome Web Store listing and the browser's toolbar call it.
    storeName: string
    summary: string
    site: string
    siteUrl: string
    base: string
    storeUrl: string | null
    profilesLabel: string
  }
> = {
  linkedin: {
    name: "CarouseLabs Engage for LinkedIn",
    storeName: "CarouseLabs Engage",
    summary: "Comments, replies, connection notes and messages on LinkedIn",
    site: "LinkedIn",
    siteUrl: "https://www.linkedin.com/feed/",
    base: "/extension",
    storeUrl: EXTENSION_STORE_URL,
    profilesLabel: "Custom tones",
  },
  x: {
    name: "CarouseLabs Engage for X",
    storeName: "CarouseLabs Engage for X",
    summary: "Replies and chats on X (Twitter)",
    site: "X",
    siteUrl: "https://x.com/home",
    base: "/extension/x",
    storeUrl: X_EXTENSION_STORE_URL,
    profilesLabel: "Reply profiles",
  },
}

export const ENGAGE_PLATFORMS: EngagePlatform[] = ["linkedin", "x"]

// The same tabs for both, by their path under the extension's base.
const TAB_PATHS = ["", "/profiles", "/agents", "/history", "/settings", "/billing"] as const
export type ExtensionTabPath = (typeof TAB_PATHS)[number]

export function extensionTabs(platform: EngagePlatform): { path: ExtensionTabPath; href: string; label: string }[] {
  const ext = ENGAGE_EXTENSIONS[platform]
  const labels: Record<ExtensionTabPath, string> = {
    "": "Overview",
    "/profiles": ext.profilesLabel,
    "/agents": "AI agents",
    "/history": "History",
    "/settings": "Settings",
    "/billing": "Plan & payments",
  }
  return TAB_PATHS.map((path) => ({ path, href: `${ext.base}${path}`, label: labels[path] }))
}

export function platformOfPath(pathname: string): EngagePlatform {
  return pathname === "/extension/x" || pathname.startsWith("/extension/x/") ? "x" : "linkedin"
}

// Which tab a path is, so switching extensions keeps it ("" for anything else).
export function tabPathOf(pathname: string): ExtensionTabPath {
  const rest = pathname.slice(ENGAGE_EXTENSIONS[platformOfPath(pathname)].base.length)
  return TAB_PATHS.find((path) => path === rest) ?? ""
}

// The extension's own toolbar icon (copied from browser-extension-comment's
// public/ and public-x/), so what the website shows is what people look for
// in their browser.
export function EngageIcon({ platform, size = 32 }: { platform: EngagePlatform; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a 128px icon; nothing to optimise
    <img
      src={platform === "x" ? "/images/extensions/engage-x.png" : "/images/extensions/engage-linkedin.png"}
      alt=""
      width={size}
      height={size}
      className="flex-shrink-0"
    />
  )
}
