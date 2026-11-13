// components/extension/engageExtensions.tsx — the two Engage extensions the
// website's Extension section covers. They're separate products, installed
// and paid for separately, each with its own pages: LinkedIn's at
// /extension/*, X's at /extension/x/*, with the same tabs.
import { EXTENSION_CHECKOUT_PATHS, EXTENSION_STORE_URLS } from "@/lib/plans"
import { ENGAGE_PLATFORMS as PLATFORMS, type EngagePlatform } from "@/lib/engage/features"

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
    checkoutPath: string
    profilesLabel: string
    // Its toolbar icon (see EngageIcon).
    icon: string
    // What to click on the site once it's installed (install steps).
    startWriting: string
    // Its colour on the website: LinkedIn's in the brand violet, X's in black
    // and white, Reddit's in orange. `button` is a buttonVariants variant;
    // `card` a solid card with white text; `text` its colour on white;
    // `storeButton` the Chrome Web Store button.
    theme: { button: "brand" | "primary"; card: string; text: string; storeButton: string }
    // Shown on the website (menus, the Extension dropdown, "Also on" cards).
    // An extension still being built has no pages there yet.
    launched: boolean
  }
> = {
  linkedin: {
    name: "CarouseLabs Engage for LinkedIn",
    storeName: "CarouseLabs Engage",
    summary: "Comments, replies, connection notes and messages on LinkedIn",
    site: "LinkedIn",
    siteUrl: "https://www.linkedin.com/feed/",
    base: "/extension",
    storeUrl: EXTENSION_STORE_URLS.linkedin,
    checkoutPath: EXTENSION_CHECKOUT_PATHS.linkedin,
    profilesLabel: "Custom tones",
    icon: "/images/extensions/engage-linkedin.png",
    startWriting:
      "Click Comment, Reply or Connect on LinkedIn, or open a conversation, and the panel writes it in your voice. You review it and post it yourself.",
    theme: { button: "brand", card: "bg-brand", text: "text-brand", storeButton: "bg-brand hover:bg-brand-hover" },
    launched: true,
  },
  x: {
    name: "CarouseLabs Engage for X",
    storeName: "CarouseLabs Engage for X",
    summary: "Replies and chats on X (Twitter)",
    site: "X",
    siteUrl: "https://x.com/home",
    base: "/extension/x",
    storeUrl: EXTENSION_STORE_URLS.x,
    checkoutPath: EXTENSION_CHECKOUT_PATHS.x,
    profilesLabel: "Reply profiles",
    icon: "/images/extensions/engage-x.png",
    startWriting:
      "Click Reply under a post, or open a chat in Messages, and the panel writes it in your voice. You review it and post it yourself.",
    theme: {
      button: "primary",
      card: "border border-black/10 bg-primary",
      text: "text-black",
      storeButton: "bg-primary-hover hover:bg-primary-hover",
    },
    launched: true,
  },
  reddit: {
    name: "CarouseLabs Engage for Reddit",
    storeName: "CarouseLabs Engage for Reddit",
    summary: "Comments, replies and chats on Reddit",
    site: "Reddit",
    siteUrl: "https://www.reddit.com/",
    base: "/extension/reddit",
    storeUrl: EXTENSION_STORE_URLS.reddit,
    checkoutPath: EXTENSION_CHECKOUT_PATHS.reddit,
    profilesLabel: "Reply profiles",
    icon: "/images/extensions/engage-reddit.png",
    startWriting:
      "Click Reply under a post or a comment on Reddit, and the panel writes it in your voice, following that subreddit's rules. You review it and post it yourself.",
    // Its pages come with stage 2; the orange button variant with them.
    theme: {
      button: "primary",
      card: "bg-[#C2410C]",
      text: "text-[#C2410C]",
      storeButton: "bg-[#C2410C] hover:bg-[#9A3412]",
    },
    launched: false,
  },
}

// The extensions the website shows (launched ones).
export const ENGAGE_PLATFORMS: EngagePlatform[] = PLATFORMS.filter((p) => ENGAGE_EXTENSIONS[p].launched)

// The other extensions, each sold separately (the overview's "Also on" cards).
export function otherPlatforms(platform: EngagePlatform): EngagePlatform[] {
  return ENGAGE_PLATFORMS.filter((p) => p !== platform)
}

// Each extension's sections, by their path under its base (the Engage menu,
// components/extension/EngageRail.tsx). The addresses are the old tabs' so
// links from the extensions keep working: Voices is /profiles, Activity
// /history, Plan & setup /billing. The old Settings (/settings) now lives in
// Plan & setup and redirects there. Saved comments is LinkedIn's alone.
const TAB_PATHS = ["", "/profiles", "/saved", "/agents", "/history", "/billing"] as const
export type ExtensionTabPath = (typeof TAB_PATHS)[number]

export const SECTION_LABELS: Record<ExtensionTabPath, string> = {
  "": "Home",
  "/profiles": "Voices",
  "/saved": "Saved comments",
  "/agents": "Agents",
  "/history": "Activity",
  "/billing": "Plan & setup",
}

const ONLY_ON: Partial<Record<ExtensionTabPath, EngagePlatform>> = { "/saved": "linkedin" }

// Whether an extension has a section (switching extensions keeps the one
// you're on only when the other has it too).
export function hasSection(platform: EngagePlatform, path: ExtensionTabPath): boolean {
  const only = ONLY_ON[path]
  return !only || only === platform
}

export function extensionTabs(platform: EngagePlatform): { path: ExtensionTabPath; href: string; label: string }[] {
  const ext = ENGAGE_EXTENSIONS[platform]
  return TAB_PATHS.filter((path) => hasSection(platform, path)).map((path) => ({
    path,
    href: `${ext.base}${path}`,
    label: SECTION_LABELS[path],
  }))
}

// LinkedIn's pages are /extension/*; every other extension's are below its
// own base (/extension/x/*), launched or not.
export function platformOfPath(pathname: string): EngagePlatform {
  return (
    PLATFORMS.find((p) => {
      const base = ENGAGE_EXTENSIONS[p].base
      return p !== "linkedin" && (pathname === base || pathname.startsWith(`${base}/`))
    }) ?? "linkedin"
  )
}

// Which section a path is, so switching extensions keeps it ("" for anything
// else). The old Settings address belongs to Plan & setup.
export function tabPathOf(pathname: string): ExtensionTabPath {
  const rest = pathname.slice(ENGAGE_EXTENSIONS[platformOfPath(pathname)].base.length)
  if (rest === "/settings") return "/billing"
  return TAB_PATHS.find((path) => path === rest) ?? ""
}

// The extension's own toolbar icon (copied from browser-extension-comment's
// public/ and public-x/), so what the website shows is what people look for
// in their browser.
export function EngageIcon({ platform, size = 32 }: { platform: EngagePlatform; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a 128px icon; nothing to optimise
    <img
      src={ENGAGE_EXTENSIONS[platform].icon}
      alt=""
      width={size}
      height={size}
      className="flex-shrink-0"
    />
  )
}
