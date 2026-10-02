// lib/engage/features.ts — the Engage features an admin can switch on or off
// and limit per user, and what each generation route counts as. No database
// or framework imports: shared by the rules, the gate, the admin API and the
// admin UI.

// Features with their own switch and their own day/month limits.
export const ENGAGE_FEATURES = ["comments", "replies", "connection_notes", "messages"] as const
export type EngageFeature = (typeof ENGAGE_FEATURES)[number]

export const FEATURE_LABELS: Record<EngageFeature, string> = {
  comments: "AI comments",
  replies: "Comment replies",
  connection_notes: "Connection notes",
  messages: "Conversation assistant",
}

// What a generation counts as. Shorter/Longer and the profile builder's Test
// are tools of the comment features, not features of their own: they follow
// those switches, count toward the daily cap and free generations, and are
// counted separately so usage figures stay honest.
export type EngageUsageKind = EngageFeature | "rewrites" | "tests"

export const USAGE_KIND_LABELS: Record<EngageUsageKind, string> = {
  ...FEATURE_LABELS,
  rewrites: "Shorter / Longer",
  tests: "Profile tests",
}

export const USAGE_KINDS: EngageUsageKind[] = [...ENGAGE_FEATURES, "rewrites", "tests"]

// The same, as a plural noun inside a sentence ("your limit of 30 comments").
export const USAGE_KIND_NOUNS: Record<EngageUsageKind, string> = {
  comments: "comments",
  replies: "replies",
  connection_notes: "connection notes",
  messages: "messages",
  rewrites: "rewrites",
  tests: "profile tests",
}

// CommentHistory.kind → usage kind, for history-based figures.
export const HISTORY_KIND_TO_FEATURE: Record<string, EngageFeature> = {
  comment: "comments",
  reply: "replies",
  connection_note: "connection_notes",
  message: "messages",
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
