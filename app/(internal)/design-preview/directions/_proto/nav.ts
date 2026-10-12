// Every customer-app destination that exists today, and where each layout
// direction puts it. Routes are unchanged; only how people reach them moves.

export type Destination = {
  id: string
  label: string
  route: string
  /** What the page is for, shown on stub screens in the prototypes. */
  purpose: string
}

export const destinations = {
  generate: { id: "generate", label: "Generate ideas", route: "/dashboard", purpose: "Get 10 post ideas from a topic or your profile." },
  ownIdea: { id: "ownIdea", label: "Start from my idea", route: "/own-idea", purpose: "Bring your own idea and build it out." },
  create: { id: "create", label: "Post editor", route: "/idea/[id] → /generate/caption · image · carousel", purpose: "Breakdown, format, writing, visuals, publish." },
  thumbnail: { id: "thumbnail", label: "Thumbnail maker", route: "/thumbnail", purpose: "Recreate a YouTube thumbnail with your content." },
  tapHold: { id: "tapHold", label: "Tap & Hold maker", route: "/tools/tap-hold-maker", purpose: "Free hidden-image tool for X and Instagram." },
  calendar: { id: "calendar", label: "Calendar", route: "/content-hub", purpose: "Schedule, queue, recurring slots, library, bulk upload." },
  ideasBoard: { id: "ideasBoard", label: "Ideas board", route: "/content-hub/ideas", purpose: "Collect and organize ideas for later." },
  history: { id: "history", label: "History", route: "/history", purpose: "Everything you've created, searchable." },
  pinned: { id: "pinned", label: "Pinned ideas", route: "/pinned", purpose: "Ideas you saved from Generate." },
  liOverview: { id: "liOverview", label: "LinkedIn · Overview", route: "/extension", purpose: "Plan, usage and install steps for Engage for LinkedIn." },
  liAgents: { id: "liAgents", label: "LinkedIn · Agents", route: "/extension/agents", purpose: "Custom AI agents for LinkedIn messages." },
  liProfiles: { id: "liProfiles", label: "LinkedIn · Voice profiles", route: "/extension/profiles", purpose: "How comments, notes and messages sound." },
  liHistory: { id: "liHistory", label: "LinkedIn · History", route: "/extension/history", purpose: "Past LinkedIn generations." },
  liSettings: { id: "liSettings", label: "LinkedIn · Settings", route: "/extension/settings", purpose: "Extension options." },
  liBilling: { id: "liBilling", label: "LinkedIn · Billing", route: "/extension/billing", purpose: "Engage for LinkedIn subscription." },
  xOverview: { id: "xOverview", label: "X · Overview", route: "/extension/x", purpose: "Plan, usage and install steps for Engage for X." },
  xAgents: { id: "xAgents", label: "X · Agents", route: "/extension/x/agents", purpose: "Custom AI agents for X messages." },
  xProfiles: { id: "xProfiles", label: "X · Voice profiles", route: "/extension/x/profiles", purpose: "How replies and messages sound on X." },
  xHistory: { id: "xHistory", label: "X · History", route: "/extension/x/history", purpose: "Past X generations." },
  xSettings: { id: "xSettings", label: "X · Settings", route: "/extension/x/settings", purpose: "Extension options." },
  xBilling: { id: "xBilling", label: "X · Billing", route: "/extension/x/billing", purpose: "Engage for X subscription." },
  profile: { id: "profile", label: "Profile", route: "/settings/profile", purpose: "Your onboarding answers: role, industry, audience, voice." },
  voicePresets: { id: "voicePresets", label: "Voice presets", route: "/settings/voice-presets", purpose: "Saved tones and rules for captions." },
  billing: { id: "billing", label: "Plan & credits", route: "/settings/billing", purpose: "Credits, plan, upgrade or cancel, extension plans." },
  referrals: { id: "referrals", label: "Referrals", route: "/settings/referrals", purpose: "Your link and referral earnings." },
  startPage: { id: "startPage", label: "Start Page", route: "/settings/start-page", purpose: "Your public link-in-bio page." },
  account: { id: "account", label: "Account & security", route: "/settings/account", purpose: "Email, password, LinkedIn connection, notifications, data export." },
  toolkit: { id: "toolkit", label: "All tools", route: "/toolkit", purpose: "Directory of every tool and extension." },
} satisfies Record<string, Destination>

export type DestinationId = keyof typeof destinations

export type NavGroup = { id: "create" | "content" | "engage"; label: string; items: DestinationId[] }

/** Activities shared by both directions. */
export const groups: NavGroup[] = [
  { id: "create", label: "Create", items: ["generate", "ownIdea", "thumbnail", "tapHold"] },
  { id: "content", label: "Content", items: ["calendar", "ideasBoard", "history", "pinned"] },
  {
    id: "engage",
    label: "Engage",
    items: ["liOverview", "liAgents", "liProfiles", "liHistory", "liSettings", "liBilling", "xOverview", "xAgents", "xProfiles", "xHistory", "xSettings", "xBilling"],
  },
]

/** Account menu (both directions). */
export const accountItems: DestinationId[] = ["profile", "voicePresets", "billing", "referrals", "startPage", "account", "toolkit"]

export function groupOf(id: DestinationId): NavGroup["id"] | "account" {
  if (id === "create") return "create"
  return groups.find((g) => g.items.includes(id))?.id ?? "account"
}

/** How each direction exposes a destination — for the comparison table. */
export const placement: Record<DestinationId, { a: string; b: string }> = Object.fromEntries(
  (Object.keys(destinations) as DestinationId[]).map((id) => {
    const g = groupOf(id)
    if (id === "create")
      return [id, { a: "Opens from an idea (\"Develop this idea\"); breadcrumb in the toolbar", b: "Opens from an idea (\"Use this idea\"); breadcrumb in the top bar" }]
    if (g === "account")
      return [id, { a: "Avatar menu (top right)", b: "Avatar menu (top right) and Go to… (⌘K)" }]
    const label = groups.find((x) => x.id === g)!.label
    const sub = id.startsWith("li") || id.startsWith("x") ? `${label} → ${id.startsWith("li") ? "LinkedIn" : "X"} switch → tab` : `${label} → sub-tab`
    return [id, { a: `Top bar: ${sub}`, b: `Dock: ${label} menu, and Go to… (⌘K)` }]
  })
) as Record<DestinationId, { a: string; b: string }>
