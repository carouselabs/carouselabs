// The app's navigation map (approved layout A): three activities in the top
// bar, each with its own pages as sub-tabs, plus the account menu. Labels are
// the existing ones from the old sidebar, Toolkit, Settings and the
// extension tabs. Routes are unchanged.
import { ENGAGE_EXTENSIONS, extensionTabs, platformOfPath } from "@/components/extension/engageExtensions"

export type NavItem = { label: string; href: string }
export type GroupId = "create" | "content" | "engage"

export const GROUPS: { id: GroupId; label: string; items: NavItem[] }[] = [
  {
    id: "create",
    label: "Create",
    items: [
      { label: "Generate", href: "/dashboard" },
      { label: "Work on Own Idea", href: "/own-idea" },
      { label: "Toolkit", href: "/toolkit" },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { label: "Content Hub", href: "/content-hub" },
      { label: "Ideas Board", href: "/content-hub/ideas" },
      { label: "History", href: "/history" },
      { label: "Pinned", href: "/pinned" },
    ],
  },
  {
    id: "engage",
    label: "Engage",
    // The sub-tabs are the current extension's own pages — see subNavItems.
    items: [{ label: "Extension", href: "/extension" }],
  },
]

export const SETTINGS_ITEMS: NavItem[] = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Voice Presets", href: "/settings/voice-presets" },
  { label: "Billing", href: "/settings/billing" },
  { label: "Referrals", href: "/settings/referrals" },
  { label: "Start Page", href: "/settings/start-page" },
  { label: "Account", href: "/settings/account" },
]

/** Which activity a path belongs to (drives the active state and sub-tabs). */
export function groupOf(pathname: string): GroupId | "settings" | "intern" | null {
  if (pathname.startsWith("/settings")) return "settings"
  if (pathname === "/intern" || pathname.startsWith("/intern/")) return "intern"
  if (pathname === "/extension" || pathname.startsWith("/extension/")) return "engage"
  if (pathname === "/content-hub" || pathname.startsWith("/content-hub/") || pathname === "/history" || pathname === "/pinned") return "content"
  if (
    pathname === "/dashboard" ||
    pathname === "/own-idea" ||
    pathname === "/toolkit" ||
    pathname === "/thumbnail" ||
    pathname.startsWith("/thumbnail/") ||
    pathname.startsWith("/idea/") ||
    pathname.startsWith("/generate/")
  )
    return "create"
  return null
}

/** Sub-tab match: exact, except Toolkit also covers the tools it lists. */
export function isActiveItem(href: string, pathname: string): boolean {
  if (href === "/toolkit") return pathname === "/toolkit" || pathname === "/thumbnail" || pathname.startsWith("/thumbnail/")
  return pathname === href
}

/** Mid-flow pages show no sub-tabs (the creation flows and Thumbnail have their own toolbar). */
export function showsSubNav(pathname: string): boolean {
  return !pathname.startsWith("/idea/") && !pathname.startsWith("/generate/") && pathname !== "/thumbnail"
}

/**
 * The second header row for a page: its activity's pages, the current Engage
 * extension's tabs (LinkedIn's or X's — the page title switches extensions),
 * or the Settings tabs. Null when there's nothing to choose between.
 */
export function subNavItems(pathname: string): NavItem[] | null {
  if (!showsSubNav(pathname)) return null
  const group = groupOf(pathname)
  if (group === "engage") return extensionTabs(platformOfPath(pathname)).map(({ label, href }) => ({ label, href }))
  if (group === "settings") return SETTINGS_ITEMS
  const items = GROUPS.find((g) => g.id === group)?.items
  return items && items.length > 1 ? items : null
}

/** Everything "Go to…" can open, grouped. */
export function allDestinations({ isIntern, isAdmin }: { isIntern: boolean; isAdmin: boolean }) {
  const engage = (["linkedin", "x"] as const).flatMap((platform) =>
    extensionTabs(platform).map((tab) => ({
      label: `${ENGAGE_EXTENSIONS[platform].name} · ${tab.label}`,
      href: tab.href,
    }))
  )
  return [
    { group: "Create", items: [...GROUPS[0].items, { label: "Thumbnail Recreation Tool", href: "/thumbnail" }, { label: "Tap & Hold Maker", href: "/tools/tap-hold-maker" }] },
    { group: "Content", items: GROUPS[1].items },
    { group: "Engage", items: engage },
    {
      group: "Settings",
      items: [
        ...SETTINGS_ITEMS,
        ...(isIntern ? [{ label: "Intern Points", href: "/intern" }] : []),
        ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
      ],
    },
  ]
}
