// lib/broadcastRender.ts
// Pure string rendering — no server-only imports, so this is safe to use
// from both the broadcasts API route and the client-side preview modal.
// Minimal, dependency-free markdown subset (bold/italic/links/paragraphs) —
// not a full CommonMark parser, just enough for a quick announcement email.

// ── Dynamic variables ───────────────────────────────────────────────
// The catalog lives here (not lib/broadcastVariables.ts) specifically so
// this stays importable from "use client" components — lib/broadcastVariables.ts
// resolves these against the database (imports @/lib/db) and would break a
// client bundle if imported there directly. That file re-exports both of
// these for server-side callers, so admin routes/cron only need one import.
export const AVAILABLE_VARIABLES = [
  { key: "firstName", label: "First Name", example: "Alex" },
  { key: "email", label: "Email", example: "alex@example.com" },
  { key: "plan", label: "Plan", example: "PRO" },
  { key: "referralCode", label: "Referral Code", example: "AB3XQ9K" },
  { key: "referralLink", label: "Referral Link", example: "https://carouselabs.com/?ref=AB3XQ9K" },
  { key: "creditsRemaining", label: "Credits Remaining", example: "850" },
  { key: "daysSinceSignup", label: "Days Since Signup", example: "42" },
] as const

export type VariableKey = (typeof AVAILABLE_VARIABLES)[number]["key"]
export type VariableValues = Record<VariableKey, string>

// Substitutes {{key}} (whitespace-tolerant) with a resolved value. Unknown
// keys and recipients with no resolvable values (e.g. a custom-list email
// with no matching User row) are left as literal {{key}} text rather than
// silently blanked — an admin who sees a stray {{firstName}} in a sent email
// knows exactly what happened, instead of a confusing empty gap.
export function applyVariables(template: string, values: Partial<VariableValues>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? (values[key as VariableKey] as string) : match,
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Renders a small markdown subset to HTML. Input is escaped first, so every
// tag below is one we inject — user content can never introduce raw HTML.
export function renderBroadcastBodyHtml(markdown: string): string {
  const escaped = escapeHtml(markdown.trim())

  const withInline = escaped
    // [text](https://url) — only http(s) links are linkified; anything else
    // (javascript:, data:, etc.) is left as plain escaped text.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#7C3AED">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")

  return withInline
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px">${para.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export function renderBroadcastEmailHtml(subject: string, markdown: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="font-size:15px;font-weight:700;color:#7C3AED;margin-bottom:24px">CarouseLabs</div>
      <h1 style="font-size:20px;margin:0 0 16px;color:#0A0A0A">${escapeHtml(subject)}</h1>
      <div style="font-size:14px;line-height:1.6;color:#333">${renderBroadcastBodyHtml(markdown)}</div>
    </div>
  `
}
