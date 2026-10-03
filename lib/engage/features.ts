// lib/engage/features.ts — the Engage features an admin can switch on or off
// and limit per user, and what each generation route counts as. No database
// or framework imports: shared by the rules, the gate, the admin API and the
// admin UI.

// Features with their own switch and their own day/month limits.
// The last two are CarouseLabs Engage for X's (a separate extension on the same
// account and plan).
export const ENGAGE_FEATURES = ["comments", "replies", "connection_notes", "messages", "x_replies", "x_messages"] as const
export type EngageFeature = (typeof ENGAGE_FEATURES)[number]

// Each extension's own features, for views that show one at a time.
export const LINKEDIN_FEATURES: EngageFeature[] = ["comments", "replies", "connection_notes", "messages"]
export const X_FEATURES: EngageFeature[] = ["x_replies", "x_messages"]

// The two extensions on one account and one plan, for the admin's split.
export const ENGAGE_PLATFORMS = ["linkedin", "x"] as const
export type EngagePlatform = (typeof ENGAGE_PLATFORMS)[number]
export const PLATFORM_LABELS: Record<EngagePlatform, string> = { linkedin: "LinkedIn", x: "X" }
export const PLATFORM_FEATURES: Record<EngagePlatform, EngageFeature[]> = { linkedin: LINKEDIN_FEATURES, x: X_FEATURES }

// How the X extension's sign-ins are labelled (ExtensionToken.device, set by
// app/api/ext/auth/exchange): the only record of which extension a token
// belongs to. Anything else, including no label, is the LinkedIn extension.
export const X_DEVICE_PREFIX = "X extension"
export function tokenPlatform(device: string | null | undefined): EngagePlatform {
  return device?.startsWith(X_DEVICE_PREFIX) ? "x" : "linkedin"
}

export const FEATURE_LABELS: Record<EngageFeature, string> = {
  comments: "AI comments",
  replies: "Comment replies",
  connection_notes: "Connection notes",
  messages: "Conversation assistant",
  x_replies: "X replies",
  x_messages: "X messages",
}

// What a generation counts as. Shorter/Longer and the profile builder's Test
// are tools of the comment features, not features of their own: they follow
// those switches, count toward the daily cap and free generations, and are
// counted separately so usage figures stay honest.
// x_rewrites / x_tests are the same tools in CarouseLabs Engage for X, which
// follow its X replies switch.
export type EngageUsageKind = EngageFeature | "rewrites" | "tests" | "x_rewrites" | "x_tests"

export const USAGE_KIND_LABELS: Record<EngageUsageKind, string> = {
  ...FEATURE_LABELS,
  rewrites: "Shorter / Longer",
  tests: "Profile tests",
  x_rewrites: "X Shorter / Longer",
  x_tests: "X profile tests",
}

export const USAGE_KINDS: EngageUsageKind[] = [...ENGAGE_FEATURES, "rewrites", "tests", "x_rewrites", "x_tests"]

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
}

// CommentHistory.kind → usage kind, for history-based figures.
export const HISTORY_KIND_TO_FEATURE: Record<string, EngageFeature> = {
  comment: "comments",
  reply: "replies",
  connection_note: "connection_notes",
  message: "messages",
  x_reply: "x_replies",
  x_message: "x_messages",
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
