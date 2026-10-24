// lib/leadUnsubscribe.ts — the Unsubscribe link at the bottom of every email
// a lead gets (lib/leads.ts), and the List-Unsubscribe headers that let
// Gmail and others show their own Unsubscribe button. The link names the
// lead by a signed token (app/api/unsubscribe/[token]), so nobody can
// unsubscribe someone else by guessing.
import crypto from "node:crypto"
import { APP_URL, EMAIL_COLORS, SANS } from "@/emails/theme"
import type { OutgoingEmail } from "@/lib/emailBatchSend"

export const UNSUBSCRIBE_PATH = "/api/unsubscribe"

// Its own key, derived from a server secret every deployment has (or
// EMAIL_TRACKING_SECRET when set), like the tracking tokens.
function key(): Buffer | null {
  const secret = process.env.EMAIL_TRACKING_SECRET || process.env.CLERK_SECRET_KEY
  return secret ? crypto.createHmac("sha256", secret).update("lead-unsubscribe-v1").digest() : null
}

const sign = (k: Buffer, leadId: string) => crypto.createHmac("sha256", k).update(leadId).digest("base64url").slice(0, 22)

// null when there's no key: lib/campaigns.ts then doesn't send to the lead
// at all, since a lead's email must always carry a way out.
export function unsubscribeToken(leadId: string): string | null {
  const k = key()
  if (!k || !/^[\w-]{1,64}$/.test(leadId)) return null
  return `${leadId}.${sign(k, leadId)}`
}

/** The lead's id, or null for a token that isn't ours. */
export function readUnsubscribeToken(token: string): string | null {
  const k = key()
  const match = /^([\w-]{1,64})\.([\w-]{22})$/.exec(token)
  if (!k || !match) return null
  const expected = Buffer.from(sign(k, match[1]))
  return crypto.timingSafeEqual(expected, Buffer.from(match[2])) ? match[1] : null
}

export const unsubscribeUrl = (token: string) => `${APP_URL}${UNSUBSCRIBE_PATH}/${token}`

/**
 * The email's HTML with the Unsubscribe line under its footer. Added after
 * tracking (lib/emailTracking.ts withTracking), so the link isn't counted as
 * a click.
 */
export function withUnsubscribe(html: string, url: string): string {
  const c = EMAIL_COLORS
  const line = `<div style="max-width:640px;margin:0 auto;padding:4px 32px 16px;text-align:center;font-family:${SANS}"><p style="margin:0;font-size:12px;line-height:1.6;color:${c.muted}">Not for you? <a href="${url}" style="color:${c.muted};text-decoration:underline">Unsubscribe</a> and we won't email you again.</p></div>`
  // Inside the page's background: before </body> (an AI-written email), or
  // before the wrapper's closing </div> (one written by hand,
  // lib/broadcastRender.ts; the tracking image may come after it).
  const body = html.lastIndexOf("</body>")
  const end = body !== -1 ? body : html.lastIndexOf("</div>")
  return end === -1 ? html + line : html.slice(0, end) + line + html.slice(end)
}

/** One-click unsubscribe (RFC 8058): the inbox posts to the same link. */
export function unsubscribeHeaders(url: string): Record<string, string> {
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
}

/** One person's email as it goes out: a lead's carries its Unsubscribe link and headers. */
export function finishCopy(r: { email: string; unsubscribeUrl?: string | null }, subject: string, html: string): OutgoingEmail {
  if (!r.unsubscribeUrl) return { to: r.email, subject, html }
  return { to: r.email, subject, html: withUnsubscribe(html, r.unsubscribeUrl), headers: unsubscribeHeaders(r.unsubscribeUrl) }
}
