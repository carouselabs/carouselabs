// lib/engage/features.ts — the Engage features an admin can switch on or off
// and limit per user, and what each generation route counts as. No database
// or framework imports: shared by the rules, the gate, the admin API and the
// admin UI.

// Features with their own switch and their own day/month limits: LinkedIn's,
// then CarouseLabs Engage for X's, then CarouseLabs Engage for Reddit's
// (separate extensions on the same account, each sold separately).
export const ENGAGE_FEATURES = [
  "comments",
  "replies",
  "connection_notes",
  "messages",
  "x_replies",
  "x_messages",
  "reddit_comments",
  "reddit_messages",
] as const
export type EngageFeature = (typeof ENGAGE_FEATURES)[number]

// Each extension's own features, for views that show one at a time.
export const LINKEDIN_FEATURES: EngageFeature[] = ["comments", "replies", "connection_notes", "messages"]
export const X_FEATURES: EngageFeature[] = ["x_replies", "x_messages"]
// Reddit's comments cover both comments on a post and replies to comments.
export const REDDIT_FEATURES: EngageFeature[] = ["reddit_comments", "reddit_messages"]

// The extensions on one account, each sold separately. LinkedIn is the
// original: whatever isn't marked as another extension's (a sign-in, a
// feature, a request) is LinkedIn's, as it was before there were others.
// Per-extension facts are Records keyed by platform, never "X, otherwise
// LinkedIn", so adding an extension here makes every place that needs its own
// answer fail to compile until it has one.
export const ENGAGE_PLATFORMS = ["linkedin", "x", "reddit"] as const
export type EngagePlatform = (typeof ENGAGE_PLATFORMS)[number]
// Every extension that came after LinkedIn, the ones that mark their own.
export type NewerPlatform = Exclude<EngagePlatform, "linkedin">
export const NEWER_PLATFORMS: NewerPlatform[] = ENGAGE_PLATFORMS.filter((p): p is NewerPlatform => p !== "linkedin")
export const PLATFORM_LABELS: Record<EngagePlatform, string> = { linkedin: "LinkedIn", x: "X", reddit: "Reddit" }
// The site's name where the AI reads it (prompts).
export const PLATFORM_SITE_NAMES: Record<EngagePlatform, string> = {
  linkedin: "LinkedIn",
  x: "X (formerly Twitter)",
  reddit: "Reddit",
}
export const PLATFORM_FEATURES: Record<EngagePlatform, EngageFeature[]> = {
  linkedin: LINKEDIN_FEATURES,
  x: X_FEATURES,
  reddit: REDDIT_FEATURES,
}

// The newer extensions' features. LinkedIn's figures are everything else, so
// errors and AI calls that name no extension (insert, read, auth) stay
// LinkedIn's.
export const NEWER_FEATURES: EngageFeature[] = NEWER_PLATFORMS.flatMap((p) => PLATFORM_FEATURES[p])

export function isEngagePlatform(value: unknown): value is EngagePlatform {
  return typeof value === "string" && (ENGAGE_PLATFORMS as readonly string[]).includes(value)
}

// An extension named in a query string or request body (?platform=x); nothing,
// or anything unknown, is LinkedIn.
export function parseEngagePlatform(value: unknown): EngagePlatform {
  return isEngagePlatform(value) ? value : "linkedin"
}

// How the newer extensions' sign-ins are labelled (ExtensionToken.device, set
// by app/api/ext/auth/exchange): the only record of which extension a token
// belongs to. Anything else, including no label, is the LinkedIn extension.
export const DEVICE_PREFIXES: Record<NewerPlatform, string> = { x: "X extension", reddit: "Reddit extension" }
export const X_DEVICE_PREFIX = DEVICE_PREFIXES.x
export function tokenPlatform(device: string | null | undefined): EngagePlatform {
  return NEWER_PLATFORMS.find((p) => device?.startsWith(DEVICE_PREFIXES[p])) ?? "linkedin"
}

// A sign-in's device label without its extension's prefix ("X extension ·
// Chrome on Mac" → "Chrome on Mac").
export function deviceName(device: string | null): string | null {
  const platform = tokenPlatform(device)
  if (platform === "linkedin" || !device) return device
  const prefix = `${DEVICE_PREFIXES[platform]} · `
  return device.startsWith(prefix) ? device.slice(prefix.length) : device
}

export const FEATURE_LABELS: Record<EngageFeature, string> = {
  comments: "AI comments",
  replies: "Comment replies",
  connection_notes: "Connection notes",
  messages: "Conversation assistant",
  x_replies: "X replies",
  x_messages: "X messages",
  reddit_comments: "Reddit comments",
  reddit_messages: "Reddit messages",
}

// What a generation counts as. Shorter/Longer and the profile builder's Test
// are tools of the comment features, not features of their own: they follow
// those switches, count toward the daily cap and free generations, and are
// counted separately so usage figures stay honest.
// x_rewrites / x_tests are the same tools in CarouseLabs Engage for X, which
// follow its X replies switch; reddit_rewrites / reddit_tests Reddit's, which
// follow its Reddit comments switch.
export const TOOL_KINDS = ["rewrites", "tests", "x_rewrites", "x_tests", "reddit_rewrites", "reddit_tests"] as const
export type EngageToolKind = (typeof TOOL_KINDS)[number]
export type EngageUsageKind = EngageFeature | EngageToolKind

// The feature each tool belongs to, for per-feature settings (the AI model)
// and figures: Shorter/Longer and profile tests are comment tools on LinkedIn
// and reply tools on X.
export const TOOL_FEATURES: Record<EngageToolKind, EngageFeature> = {
  rewrites: "comments",
  tests: "comments",
  x_rewrites: "x_replies",
  x_tests: "x_replies",
  reddit_rewrites: "reddit_comments",
  reddit_tests: "reddit_comments",
}

export function isToolKind(kind: EngageUsageKind): kind is EngageToolKind {
  return (TOOL_KINDS as readonly string[]).includes(kind)
}

// What each extension's shared screens count as: its Shorter/Longer, its
// profile and agent Tests, and its Messages screen.
export const PLATFORM_KINDS: Record<
  EngagePlatform,
  { rewrites: EngageToolKind; tests: EngageToolKind; messages: EngageFeature }
> = {
  linkedin: { rewrites: "rewrites", tests: "tests", messages: "messages" },
  x: { rewrites: "x_rewrites", tests: "x_tests", messages: "x_messages" },
  reddit: { rewrites: "reddit_rewrites", tests: "reddit_tests", messages: "reddit_messages" },
}

export const USAGE_KIND_LABELS: Record<EngageUsageKind, string> = {
  ...FEATURE_LABELS,
  rewrites: "Shorter / Longer",
  tests: "Profile tests",
  x_rewrites: "X Shorter / Longer",
  x_tests: "X profile tests",
  reddit_rewrites: "Reddit Shorter / Longer",
  reddit_tests: "Reddit profile tests",
}

export const USAGE_KINDS: EngageUsageKind[] = [...ENGAGE_FEATURES, ...TOOL_KINDS]

// Which extension a usage kind belongs to: each is sold, and has its free
// generations, separately.
export function platformOfUsageKind(kind: EngageUsageKind): EngagePlatform {
  return platformOfFeature(featureOfUsageKind(kind))
}

export function platformOfFeature(feature: EngageFeature): EngagePlatform {
  return NEWER_PLATFORMS.find((p) => PLATFORM_FEATURES[p].includes(feature)) ?? "linkedin"
}

export function featureOfUsageKind(kind: EngageUsageKind): EngageFeature {
  return isToolKind(kind) ? TOOL_FEATURES[kind] : kind
}

// The same, as a plural noun inside a sentence ("your limit of 30 comments").
export const USAGE_KIND_NOUNS: Record<EngageUsageKind, string> = {
  comments: "comments",
  replies: "replies",
  connection_notes: "connection notes",
  messages: "messages",
  x_replies: "X replies",
  x_messages: "X messages",
  rewrites: "rewrites",
  tests: "profile tests",
  x_rewrites: "X rewrites",
  x_tests: "X profile tests",
  reddit_comments: "Reddit comments",
  reddit_messages: "Reddit messages",
  reddit_rewrites: "Reddit rewrites",
  reddit_tests: "Reddit profile tests",
}

// CommentHistory.kind → usage kind, for history-based figures.
export const HISTORY_KIND_TO_FEATURE: Record<string, EngageFeature> = {
  comment: "comments",
  reply: "replies",
  connection_note: "connection_notes",
  message: "messages",
  x_reply: "x_replies",
  x_message: "x_messages",
  reddit_comment: "reddit_comments",
  reddit_message: "reddit_messages",
}

export type Limit = number | "unlimited"

// Plan defaults (the one $15 plan and the free tier share them). The daily
// cap is the rolling 24-hour fair-use brake (lib/extDailyLimit.ts); per-feature
// limits are calendar day/month in UTC and are unlimited unless an admin sets
// one for a user.
export const PLAN_DAILY_CAP = 450
export const PLAN_FREE_GENERATIONS = 10

export const LIMIT_PERIODS = ["day", "month"] as const
export type LimitPeriod = (typeof LIMIT_PERIODS)[number]

export type LimitKey = "dailyCap" | `${EngageFeature}.${LimitPeriod}`

export const LIMIT_KEYS: LimitKey[] = [
  "dailyCap",
  ...ENGAGE_FEATURES.flatMap((f) => LIMIT_PERIODS.map((p) => `${f}.${p}` as LimitKey)),
]

export function planLimit(key: LimitKey): Limit {
  return key === "dailyCap" ? PLAN_DAILY_CAP : "unlimited"
}

export function formatLimit(limit: Limit): string {
  return limit === "unlimited" ? "Unlimited" : limit.toLocaleString("en-US")
}
