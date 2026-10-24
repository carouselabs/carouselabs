// lib/emailTracking.ts — whether people opened ("seen") and clicked the emails
// the admin sends them: campaigns (EmailCampaignRecipient) and personal emails
// (PersonalEmailTrack). Each tracked email carries a tiny invisible image, and
// its links pass through this site on the way, both naming the email by a
// signed token (app/api/email-track/*), so nobody can mark someone else's
// email as seen.
//
// "Seen" is a good guess, not a fact: Apple Mail loads images as the email
// arrives (seen without being read), and apps that block images never load it.
// Company email systems' security scanners open it and visit every link
// before the person gets it: each open and click is judged
// (lib/emailScanners.ts) and kept in a log (EmailTrackEvent), and only a
// person's count. A click counts once a real browser ran the click page's
// script, and counts as seen too.
import crypto from "node:crypto"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { APP_URL } from "@/emails/theme"
import { isAllowedLink } from "@/lib/emailDesign"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { FIRST_MINUTE_MS, SAME_SOURCE_MS, judge, looksLikeRobot, rollUp, sweep, type TrackEventType } from "@/lib/emailScanners"

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
// The hidden link only robots follow (people can't see or reach it).
export const trapUrl = (token: string) => `${APP_URL}${TRACK_PATH}/check/${token}`
// Where the click page's script reports that a real browser ran it.
export const humanPath = (token: string, to: string) => `${TRACK_PATH}/human/${token}?to=${encodeURIComponent(to)}`

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
  const withPixel = end === -1 ? linked + pixel : linked.slice(0, end) + pixel + linked.slice(end)
  // First thing in the email, so a scanner reaches it among the first links.
  const trap = `<a href="${trapUrl(token)}" aria-hidden="true" tabindex="-1" style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">&#8203;</a>`
  const body = /<body[^>]*>/i.exec(withPixel)
  return body ? withPixel.slice(0, body.index + body[0].length) + trap + withPixel.slice(body.index + body[0].length) : trap + withPixel
}

// What a visit says about who made it: kept to judge it (lib/emailScanners.ts).
export type VisitInfo = { method?: string; userAgent?: string | null; ip?: string | null }

export function visitInfo(req: Request): VisitInfo {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return { method: req.method, userAgent: req.headers.get("user-agent"), ip: forwarded || req.headers.get("x-real-ip") }
}

// The same network address gives the same value; the address itself is never kept.
function sourceOf(ip: string | null | undefined): string | null {
  const k = key()
  return ip && k ? crypto.createHmac("sha256", k).update(`source:${ip}`).digest("base64url").slice(0, 16) : null
}

// When the email was sent (a personal email: when it was made, just before
// sending); undefined when it isn't there.
async function sentTimeOf(email: TrackedEmail): Promise<Date | null | undefined> {
  if (email.kind === "campaign") {
    const row = await db.emailCampaignRecipient.findUnique({ where: { id: email.id }, select: { sentAt: true } })
    return row ? row.sentAt : undefined
  }
  const row = await db.personalEmailTrack.findUnique({ where: { emailId: email.id }, select: { createdAt: true } })
  return row ? row.createdAt : undefined
}

const EVENT_FIELDS = { id: true, type: true, at: true, link: true, source: true, userAgent: true, verdict: true, reason: true } as const

// Judges the event, logs it, relabels what it shows were robots, and works out seen and clicked again.
async function recordJudged(email: TrackedEmail, type: TrackEventType, at: Date, link: string | null, visit: VisitInfo, sentAt: Date | null) {
  const where = { kind: email.kind, refId: email.id }
  const since = (ms: number) => ({ ...where, at: { gte: new Date(at.getTime() - ms) } })
  const prior = await db.emailTrackEvent.findMany({ where: since(SAME_SOURCE_MS), select: EVENT_FIELDS })
  const source = sourceOf(visit.ip)
  const { verdict, reason } = judge({ type, at, method: visit.method, link, userAgent: visit.userAgent ?? null, ip: visit.ip ?? null, source }, { sentAt, prior })
  await db.emailTrackEvent.create({
    data: { ...where, type, at, link, source, userAgent: visit.userAgent?.slice(0, 300) ?? null, verdict, reason: reason || null },
  })
  const recent = await db.emailTrackEvent.findMany({ where: since(SAME_SOURCE_MS), select: EVENT_FIELDS })
  for (const [why, ids] of sweep(recent)) {
    await db.emailTrackEvent.updateMany({ where: { id: { in: ids } }, data: { verdict: "scanner", reason: why } })
  }
  const summary = rollUp(await db.emailTrackEvent.findMany({ where, select: EVENT_FIELDS }))
  if (email.kind === "campaign") await db.emailCampaignRecipient.update({ where: { id: email.id }, data: summary })
  else await db.personalEmailTrack.update({ where: { emailId: email.id }, data: summary })
}

// Before scripts/email-scanners.sql: counted as before, leaving out what's
// plainly a robot (its signature, a peek, the first minute) and what only
// the new emails have (the hidden link, the browser check).
async function recordPlain(email: TrackedEmail, type: TrackEventType, at: Date, visit: VisitInfo, sentAt: Date | null) {
  if (type === "trap" || type === "human" || visit.method === "HEAD" || looksLikeRobot(visit.userAgent)) return
  if (sentAt && at.getTime() - sentAt.getTime() < FIRST_MINUTE_MS) return
  const seen = { openedAt: at }
  const counts = type === "open" ? { openCount: { increment: 1 }, lastOpenedAt: at } : { clickCount: { increment: 1 } }
  if (email.kind === "campaign") {
    const id = email.id
    await db.emailCampaignRecipient.updateMany({ where: { id, openedAt: null }, data: seen })
    if (type === "click") await db.emailCampaignRecipient.updateMany({ where: { id, clickedAt: null }, data: { clickedAt: at } })
    await db.emailCampaignRecipient.updateMany({ where: { id }, data: counts })
  } else {
    const emailId = email.id
    await db.personalEmailTrack.updateMany({ where: { emailId, openedAt: null }, data: seen })
    if (type === "click") await db.personalEmailTrack.updateMany({ where: { emailId, clickedAt: null }, data: { clickedAt: at } })
    await db.personalEmailTrack.updateMany({ where: { emailId }, data: counts })
  }
}

/** Records one open or click (judged: lib/emailScanners.ts). Never throws: a count must never break a page load. */
export async function recordEmailEvent(
  email: TrackedEmail,
  event: { type: TrackEventType; at?: Date; link?: string | null; visit?: VisitInfo },
): Promise<void> {
  const at = event.at ?? new Date()
  const visit = event.visit ?? {}
  try {
    const sentAt = await sentTimeOf(email)
    if (sentAt === undefined) return
    try {
      await recordJudged(email, event.type, at, event.link ?? null, visit, sentAt)
    } catch (err) {
      if (!isEngageSchemaMissing(err)) throw err
      await recordPlain(email, event.type, at, visit, sentAt)
    }
  } catch (err) {
    if (!isEngageSchemaMissing(err)) console.error("[emailTracking] couldn't record:", err instanceof Error ? err.message : err)
  }
}

// The tracking a personal email's row has, without the scanner columns
// before scripts/email-scanners.sql is run.
const PLAIN_TRACK = {
  emailId: true,
  userId: true,
  subject: true,
  design: true,
  openedAt: true,
  lastOpenedAt: true,
  openCount: true,
  clickedAt: true,
  clickCount: true,
  createdAt: true,
} as const

/** Personal emails' tracking rows, with the scanner columns once they're there. */
export async function findPersonalTracks(args: Omit<Prisma.PersonalEmailTrackFindManyArgs, "select" | "include">) {
  try {
    return await db.personalEmailTrack.findMany(args)
  } catch (err) {
    if (!isEngageSchemaMissing(err)) throw err
    const rows = await db.personalEmailTrack.findMany({ ...args, select: PLAIN_TRACK })
    return rows.map((r) => ({ ...r, lastClickedAt: null, scannedAt: null, scanReason: null, autoOpenedAt: null }))
  }
}

