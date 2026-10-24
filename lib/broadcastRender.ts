// lib/broadcastRender.ts
// Pure string rendering — no server-only imports, so this is safe to use
// from both the broadcasts API route and the client-side preview modal.
// Minimal, dependency-free markdown subset (bold/italic/links/paragraphs) —
// not a full CommonMark parser, just enough for a quick announcement email.
// The wrapper matches emails/EmailLayout.tsx (logo, painted hero, serif
// heading, footer), written as plain table HTML so it renders the same here.
import { APP_URL, EMAIL_COLORS as C, EMAIL_IMAGES, SANS, SERIF } from "@/emails/theme"
import { heroAlt } from "@/emails/art"

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
export function applyVariables(
  template: string,
  values: Partial<VariableValues> | Record<string, string>,
  // A lead (lib/leads.ts): a field they don't have becomes nothing, so a
  // stranger never sees braces. Everyone else's stays as written.
  { blankMissing = false } = {},
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? (values as Record<string, string>)[key] : blankMissing ? "" : match,
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
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" style="color:${C.violet}">$1</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")

  return withInline
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px">${para.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export function renderBroadcastEmailHtml(subject: string, markdown: string): string {
  const footer = `font-size:12px;line-height:1.6;color:${C.muted};margin:0 0 8px`
  const footerLink = `color:${C.muted};text-decoration:underline`
  return `
<div style="margin:0;padding:32px 12px;background-color:${C.page};font-family:${SANS}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;background-color:${C.card};border:1px solid ${C.line};border-radius:18px">
    <tr><td style="padding:24px 32px 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle"><a href="${APP_URL}" style="text-decoration:none"><img src="${EMAIL_IMAGES}/logo.png" width="168" height="30" alt="CarouseLabs" style="display:block;border:0"></a></td>
        <td align="right" style="vertical-align:middle"><a href="${APP_URL}/sign-in" style="border:1px solid ${C.ink};border-radius:999px;padding:7px 15px;font-size:13px;font-weight:600;color:${C.ink};text-decoration:none;white-space:nowrap">Sign in</a></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 32px"><img src="${EMAIL_IMAGES}/hero-broadcast.jpg" width="576" alt="${heroAlt("broadcast")}" style="display:block;width:100%;max-width:576px;height:auto;border-radius:14px;border:0"></td></tr>
    <tr><td style="padding:32px 40px 30px">
      <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;font-weight:400;line-height:1.2;letter-spacing:-0.01em;color:${C.ink}">${escapeHtml(subject)}</h1>
      <div style="font-size:16px;line-height:1.65;color:${C.body}">${renderBroadcastBodyHtml(markdown)}</div>
    </td></tr>
  </table>
  <div style="max-width:640px;margin:0 auto;padding:24px 32px 8px;text-align:center">
    <p style="${footer}">CarouseLabs — your AI social media content studio.</p>
    <p style="${footer}"><a href="${APP_URL}" style="${footerLink}">${APP_URL.replace(/^https?:\/\//, "")}</a> &middot; <a href="${APP_URL}/privacy" style="${footerLink}">Privacy</a> &middot; <a href="${APP_URL}/terms" style="${footerLink}">Terms</a></p>
    <p style="${footer};margin:0">&copy; ${new Date().getFullYear()} CarouseLabs</p>
  </div>
</div>`
}
