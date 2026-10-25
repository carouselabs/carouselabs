// lib/placement/tests.ts — where a campaign lands ("Where it landed" on the
// campaign page). The first time a campaign sends through a service (Resend
// for users, Brevo for leads), one more copy goes through it to the test
// Gmail (PLACEMENT_GMAIL_USER) at its own +address: the same email, sender,
// links, tracking and Unsubscribe line as that send's people (pointing at
// no one), so Gmail judges it like theirs. When the campaign page asks, the
// test inbox is looked at (lib/placement/gmailImap.ts) and the result kept.
// Each person's provider (lib/placement/mailbox.ts) says which test stands
// for them. Nothing here may stop a campaign from sending, and before
// scripts/email-placement.sql is run it all simply stays off.
import { randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import type { BatchSendResult } from "@/lib/emailBatchSend"
import { trackingToken } from "@/lib/emailTracking"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { leadValues } from "@/lib/leadRules"
import { unsubscribeToken, unsubscribeUrl } from "@/lib/leadUnsubscribe"
import { findCopies, type ImapConnect, type Placement } from "./gmailImap"
import type { Mailbox } from "./mailbox"
import { mailboxesOf } from "./mailboxLookup"
import type { PlacementTestView } from "./landing"

// Test addresses start with this, so CarouseLabs and Dharma Mail ("dm") can share one test inbox.
const APP_TAG = "cl"
export type PlacementVia = "resend" | "brevo"
// Gmail takes a few seconds to deliver; a copy not there after 30 minutes never arrived.
const FIRST_LOOK_MS = 15_000
const LOOK_EVERY_MS = 20_000
export const MISSING_AFTER_MS = 30 * 60_000

export const PLACEMENT_SQL_MISSING = "Where it landed needs scripts/email-placement.sql run in Supabase first."

/** The test inbox, when it's set up (both env vars). */
export function placementInbox(): { user: string; password: string } | null {
  const user = process.env.PLACEMENT_GMAIL_USER?.trim().toLowerCase()
  const password = process.env.PLACEMENT_GMAIL_APP_PASSWORD?.trim()
  return user && password && /^[^@\s+]+@[^@\s]+\.[^@\s]+$/.test(user) ? { user, password } : null
}

/** carouselabs@gmail.com → carouselabs+cl3f9a…@gmail.com: it arrives in the same inbox, and only this copy has it. */
export function testAddress(user: string): string {
  const [local, domain] = user.split("@")
  return `${local}+${APP_TAG}${randomBytes(6).toString("hex")}@${domain}`
}

/** The test copy as one more person of the send: like a lead (named "there", with an Unsubscribe link) or like a user. */
export type TestPerson = {
  userId: null
  email: string
  trackingToken?: string
  values?: Record<string, string>
  unsubscribeUrl?: string
}

// Sends the test copy the way the campaign sends its email (lib/campaigns.ts), with this idempotency prefix.
export type SendTestCopy = (person: TestPerson, idempotencyPrefix: string) => Promise<BatchSendResult>

type TestRow = {
  id: string
  via: string
  inbox: string
  status: string
  placement: string | null
  important: boolean
  error: string | null
  sentAt: Date
  checkedAt: Date | null
}

const view = (t: TestRow): PlacementTestView => ({
  id: t.id,
  via: t.via,
  inbox: t.inbox as Mailbox,
  status: t.status as PlacementTestView["status"],
  placement: (t.placement as Placement | null) ?? null,
  important: t.important,
  error: t.error,
  sentAt: t.sentAt,
  checkedAt: t.checkedAt,
})

/** Sends one test copy now; null when there's no test inbox. Like a lead's copy when `asLead`. */
export async function sendTestCopy(input: { campaignId: string; via: PlacementVia; asLead: boolean; send: SendTestCopy }): Promise<PlacementTestView | null> {
  const inbox = placementInbox()
  if (!inbox) return null
  const address = testAddress(inbox.user)
  const row = await db.emailPlacementTest.create({ data: { campaignId: input.campaignId, via: input.via, inbox: "gmail", address } })
  // Its tracking and Unsubscribe link point at no one on the list.
  const nobody = `placement-${row.id}`
  const unsubscribe = input.asLead ? unsubscribeToken(nobody) : null
  let error: string | null = null
  try {
    const result = await input.send(
      {
        userId: null,
        email: address,
        trackingToken: trackingToken({ kind: "campaign", id: nobody }) ?? undefined,
        ...(input.asLead ? { values: leadValues({ email: address, firstName: null, lastName: null, name: null, fields: {} }) } : {}),
        ...(unsubscribe ? { unsubscribeUrl: unsubscribeUrl(unsubscribe) } : {}),
      },
      nobody,
    )
    if (result.sent === 0) error = result.error ?? "The test copy wasn't sent"
  } catch (err) {
    error = err instanceof Error ? err.message : "The test copy wasn't sent"
  }
  const saved = await db.emailPlacementTest.update({ where: { id: row.id }, data: error ? { status: "failed", error: error.slice(0, 500) } : {} })
  return view(saved)
}

/** After a campaign sends through a service: its first test copy there, once. Never throws. */
export async function testOnFirstSend(input: Parameters<typeof sendTestCopy>[0]): Promise<void> {
  try {
    if (!placementInbox()) return
    if ((await db.emailPlacementTest.count({ where: { campaignId: input.campaignId, via: input.via } })) > 0) return
    await sendTestCopy(input)
  } catch (err) {
    if (!isEngageSchemaMissing(err)) console.error("[placement] the test copy failed:", err instanceof Error ? err.message : err)
  }
}

/** Looks in the test inbox for this campaign's copies that are due a look; the campaign's tests after. */
export async function checkTests(campaignId: string, opts: { now?: Date; connect?: ImapConnect } = {}): Promise<PlacementTestView[]> {
  const now = opts.now ?? new Date()
  const inbox = placementInbox()
  const waiting = await db.emailPlacementTest.findMany({ where: { campaignId, status: "waiting" } })
  const due = waiting.filter((t) => now.getTime() - t.sentAt.getTime() >= FIRST_LOOK_MS && (!t.checkedAt || now.getTime() - t.checkedAt.getTime() >= LOOK_EVERY_MS))
  if (inbox && due.length > 0) {
    // Claimed first, so two open pages don't both sign in to Gmail for the same copies.
    const { count } = await db.emailPlacementTest.updateMany({
      where: { id: { in: due.map((t) => t.id) }, status: "waiting", OR: [{ checkedAt: null }, { checkedAt: { lt: new Date(now.getTime() - LOOK_EVERY_MS) } }] },
      data: { checkedAt: now },
    })
    if (count > 0) {
      try {
        const found = await findCopies({ ...inbox, addresses: due.map((t) => t.address), connect: opts.connect })
        for (const t of due) {
          const copy = found.get(t.address)
          if (copy) await db.emailPlacementTest.update({ where: { id: t.id }, data: { status: "found", placement: copy.placement, important: copy.important, foundAt: now, error: null } })
          else if (now.getTime() - t.sentAt.getTime() >= MISSING_AFTER_MS) await db.emailPlacementTest.update({ where: { id: t.id }, data: { status: "missing", error: null } })
        }
      } catch (err) {
        const error = (err instanceof Error ? err.message : "Couldn't look in the test inbox").slice(0, 500)
        await db.emailPlacementTest.updateMany({ where: { id: { in: due.map((t) => t.id) }, status: "waiting" }, data: { error } })
      }
    }
  }
  return (await db.emailPlacementTest.findMany({ where: { campaignId }, orderBy: { sentAt: "asc" } })).map(view)
}

/** Fills in the provider of everyone sent who doesn't have one yet; everyone's after (by recipient id). */
export async function campaignMailboxes(campaignId: string, look?: (domain: string) => Promise<Mailbox | null>) {
  const rows = await db.emailCampaignRecipient.findMany({ where: { campaignId }, select: { id: true, email: true, status: true, mailbox: true, provider: true } })
  const missing = rows.filter((r) => r.status === "sent" && !r.mailbox)
  if (missing.length > 0) {
    const found = await mailboxesOf(missing.map((r) => r.email), look)
    const byMailbox = new Map<Mailbox, string[]>()
    for (const r of missing) {
      // Not known yet (DNS couldn't answer): left empty, and asked again next time.
      const mailbox = found.get(r.email.toLowerCase())
      if (!mailbox) continue
      byMailbox.set(mailbox, [...(byMailbox.get(mailbox) ?? []), r.id])
      r.mailbox = mailbox
    }
    for (const [mailbox, ids] of byMailbox) await db.emailCampaignRecipient.updateMany({ where: { id: { in: ids } }, data: { mailbox } })
  }
  return rows
}

export type PlacementReport = {
  // Whether a test inbox is set up, and which address it is.
  inbox: { connected: boolean; address: string | null }
  // scripts/email-placement.sql hasn't been run yet.
  setupMissing?: boolean
  tests: PlacementTestView[]
  // Per person (by recipient id): their provider, how they were sent, and whether the lead was stopped and why.
  people: Record<string, { mailbox: Mailbox | null; via: PlacementVia; stop: { reason: string | null; at: Date } | null }>
}

/** Everything the campaign page needs for "Where it landed". */
export async function placementReport(campaignId: string, opts: { now?: Date; connect?: ImapConnect; look?: (domain: string) => Promise<Mailbox | null> } = {}): Promise<PlacementReport> {
  const inbox = { connected: !!placementInbox(), address: placementInbox()?.user ?? null }
  try {
    const tests = await checkTests(campaignId, opts)
    const rows = await campaignMailboxes(campaignId, opts.look)
    const leads = await db.lead
      .findMany({
        where: { email: { in: rows.map((r) => r.email.toLowerCase()) }, unsubscribedAt: { not: null } },
        select: { email: true, unsubscribedAt: true, stopReason: true },
      })
      .catch((err) => {
        // Before scripts/leads.sql's Brevo part: no reasons, so no Bounced or Marked as spam.
        if (isEngageSchemaMissing(err)) return []
        throw err
      })
    const stopOf = new Map(leads.map((l) => [l.email, { reason: l.stopReason, at: l.unsubscribedAt! }]))
    return {
      inbox,
      tests,
      people: Object.fromEntries(
        rows.map((r) => [r.id, { mailbox: (r.mailbox as Mailbox | null) ?? null, via: r.provider === "brevo" ? "brevo" : "resend", stop: stopOf.get(r.email.toLowerCase()) ?? null }]),
      ),
    }
  } catch (err) {
    if (isEngageSchemaMissing(err)) return { inbox, setupMissing: true, tests: [], people: {} }
    throw err
  }
}
