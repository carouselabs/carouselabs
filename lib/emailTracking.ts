// lib/emailTracking.ts — whether people opened ("seen") and clicked the emails
// the admin sends them: campaigns (EmailCampaignRecipient) and personal emails
// (PersonalEmailTrack). Each tracked email carries a tiny invisible image, and
// its links pass through this site on the way, both naming the email by a
// signed token (app/api/email-track/*), so nobody can mark someone else's
// email as seen.
//
// "Seen" is a good guess, not a fact: Apple Mail loads images as the email
// arrives (seen without being read), and apps that block images never load it.
// A click is certain, and counts as seen too.
import crypto from "node:crypto"
import { db } from "@/lib/db"
import { APP_URL } from "@/emails/theme"
import { isAllowedLink } from "@/lib/emailDesign"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"

export type TrackedEmail = { kind: "campaign" | "personal"; id: string }

const KIND_CODE = { campaign: "c", personal: "p" } as const
export const TRACK_PATH = "/api/email-track"

// Its own key, derived from a server secret every deployment has (or
// EMAIL_TRACKING_SECRET when set), so a token can't be made elsewhere.
function key(): Buffer | null {
  const secret = process.env.EMAIL_TRACKING_SECRET || process.env.CLERK_SECRET_KEY
  return secret ? crypto.createHmac("sha256", secret).update("email-tracking-v1").digest() : null
}

const sign = (k: Buffer, payload: string) => crypto.createHmac("sha256", k).update(payload).digest("base64url").slice(0, 22)

// null when there's no key: the email then simply goes out untracked.
export function trackingToken(email: TrackedEmail): string | null {
  const k = key()
  if (!k || !/^[\w-]{1,64}$/.test(email.id)) return null
  const payload = KIND_CODE[email.kind] + email.id
  return `${payload}.${sign(k, payload)}`
}

export function readTrackingToken(token: string): TrackedEmail | null {
  const k = key()
  const match = /^([cp])([\w-]{1,64})\.([\w-]{22})$/.exec(token)
  if (!k || !match) return null
  const expected = Buffer.from(sign(k, match[1] + match[2]))
  if (!crypto.timingSafeEqual(expected, Buffer.from(match[3]))) return null
  return { kind: match[1] === "c" ? "campaign" : "personal", id: match[2] }
}

export const openUrl = (token: string) => `${APP_URL}${TRACK_PATH}/open/${token}`
export const clickUrl = (token: string, to: string) => `${APP_URL}${TRACK_PATH}/click/${token}?to=${encodeURIComponent(to)}`

// Where a click may go on to: only where our emails may link (the site, the
// Chrome Web Store listings, LinkedIn, X), so it can't be used to send people
// anywhere else.
export function clickDestination(to: string | null): string | null {
  return to && to.startsWith("https://") && isAllowedLink(to) ? to : null
}

/**
 * The email's HTML with its invisible image added and every allowed link
 * passing through this site first. Called per person, on their own copy.
 */
export function withTracking(html: string, token: string): string {
  const linked = html.replace(/href="(https:\/\/[^"]+)"/g, (whole, href: string) => {
    const url = href.replace(/&amp;/g, "&")
    if (url.startsWith(`${APP_URL}${TRACK_PATH}/`) || !clickDestination(url)) return whole
    return `href="${clickUrl(token, url)}"`
  })
  const pixel = `<img src="${openUrl(token)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />`
  const end = linked.lastIndexOf("</body>")
  return end === -1 ? linked + pixel : linked.slice(0, end) + pixel + linked.slice(end)
}

/** Records one open or click. Never throws: a count must never break a page load. */
export async function recordEmailEvent(email: TrackedEmail, event: "open" | "click", at: Date = new Date()): Promise<void> {
  // First seen (a click counts), first click, then the running counts.
  const seen = { openedAt: at }
  const counts = event === "open" ? { openCount: { increment: 1 }, lastOpenedAt: at } : { clickCount: { increment: 1 } }
  try {
    if (email.kind === "campaign") {
      const id = email.id
      await db.emailCampaignRecipient.updateMany({ where: { id, openedAt: null }, data: seen })
      if (event === "click") await db.emailCampaignRecipient.updateMany({ where: { id, clickedAt: null }, data: { clickedAt: at } })
      await db.emailCampaignRecipient.updateMany({ where: { id }, data: counts })
    } else {
      const emailId = email.id
      await db.personalEmailTrack.updateMany({ where: { emailId, openedAt: null }, data: seen })
      if (event === "click") await db.personalEmailTrack.updateMany({ where: { emailId, clickedAt: null }, data: { clickedAt: at } })
      await db.personalEmailTrack.updateMany({ where: { emailId }, data: counts })
    }
  } catch (err) {
    if (!isEngageSchemaMissing(err)) console.error("[emailTracking] couldn't record:", err instanceof Error ? err.message : err)
  }
}
