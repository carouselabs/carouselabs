// lib/extensionHistory.ts — the kinds of row in CommentHistory, which since
// the website's Extension section holds every generation the LinkedIn
// extension makes, not only comments. Shared by the routes that write and
// read it (app/api/ext/*) so they agree on the names.
//
// CarouseLabs Engage for X (a separate extension on the same account) writes
// its own kinds into the same table. Each extension sees only its own: the
// LinkedIn kinds are what every caller gets unless it asks for X, so LinkedIn
// copies already installed never see X rows.
export const HISTORY_KINDS = ["comment", "reply", "connection_note", "message"] as const
export type HistoryKind = (typeof HISTORY_KINDS)[number]

export const X_HISTORY_KINDS = ["x_reply", "x_message"] as const
export type XHistoryKind = (typeof X_HISTORY_KINDS)[number]

export type HistoryPlatform = "linkedin" | "x"

export function isHistoryKind(value: unknown): value is HistoryKind {
  return typeof value === "string" && (HISTORY_KINDS as readonly string[]).includes(value)
}

export function kindsFor(platform: HistoryPlatform): readonly string[] {
  return platform === "x" ? X_HISTORY_KINDS : HISTORY_KINDS
}

// What LinkedIn sees as comment activity: the kinds the panel's pacing nudge
// ("you've commented a lot today") counts. Notes and messages aren't comments.
export const COMMENT_KINDS: HistoryKind[] = ["comment", "reply"]

// Longest text a history row stores for the thing that was answered.
export const HISTORY_SNIPPET_CHARS = 280

// A LinkedIn link for a history row, or "" for anything else: the History
// screens render it as a link, so only LinkedIn pages may get through.
export function linkedInUrl(value: unknown): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim().slice(0, 500)
  try {
    const url = new URL(trimmed)
    return url.protocol === "https:" && url.hostname === "www.linkedin.com" ? url.toString() : ""
  } catch {
    return ""
  }
}
