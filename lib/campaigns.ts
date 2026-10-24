// lib/campaigns.ts
// Email campaigns (Admin → Broadcasts → Campaigns): one email sent to a fixed
// list of people in batches the admin picks. The list is taken once, when the
// campaign is created; each Send claims the ticked people (so two clicks can
// never both email someone), sends through Resend's batch endpoint like a
// broadcast (leads through Brevo's, lib/brevo.ts, or whichever the campaign
// was set to, from the sender it was set to: lib/sendingRules.ts), then marks
// each person sent or failed with the reason it gave.
// Pure rules (daily allowance, next 10, progress) live in lib/campaignRules.ts.
import { randomUUID } from "node:crypto"
import type { BatchMailer, BatchSendResult } from "@/lib/emailBatchSend"
import { BREVO_DAILY_LIMIT, BREVO_MISSING } from "@/lib/brevo"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/auditLog"
import { resolveRecipients, sendUserBroadcast, type BroadcastRecipients } from "@/lib/broadcast"
import { emailDesignSchema, type EmailDesign } from "@/lib/emailDesign"
import { artProblem } from "@/lib/emailArtCheck"
import { sendDesignedEmails } from "@/lib/emailDesignRender"
import {
  CAMPAIGN_DAILY_LIMIT,
  CAMPAIGN_MAX_RECIPIENTS,
  STUCK_SENDING_MS,
  allowanceLeft,
  campaignDayStart,
  DAY_RESETS_AT,
  campaignProgress,
  type CampaignRecipientStatus,
} from "@/lib/campaignRules"
import { trackingToken } from "@/lib/emailTracking"
import { isLeadAudience, mergeFieldProblem, parseLeadAudience } from "@/lib/leadRules"
import { LEADS_SQL_MISSING, leadFieldKeys, leadListName, leadSendInfo, markLeadsEmailed } from "@/lib/leads"
import { unsubscribeToken, unsubscribeUrl } from "@/lib/leadUnsubscribe"
import { DEFAULT_SENDING, VIA_CHOICES, usesBrevo, type Sending, type SendingChoice, type Via } from "@/lib/sendingRules"
import { resolveSending } from "@/lib/senders"

// Beside a lead who clicked Unsubscribe: they're never sent to again.
export const UNSUBSCRIBED_NOTE = "Unsubscribed, so not sent"

export class CampaignError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
  }
}

/** Who a campaign would go to, without creating it (the composer's count). */
export async function countCampaignAudience(recipients: BroadcastRecipients, audienceValue: string | null) {
  return (await resolveRecipients(recipients, audienceValue)).length
}

// The email's text with every merge field it uses: an AI-written one's whole
// design (its button links too), or the subject and body written by hand.
const emailText = (email: { subject: string; body: string; design?: unknown }) =>
  email.design ? JSON.stringify(email.design) : `${email.subject}\n${email.body}`

/**
 * Refuses an email whose merge fields these people don't have: a lead's
 * column (say {{company}}) for users, or an account field like {{plan}} for
 * leads, who'd otherwise get a gap where it was.
 */
export async function checkMergeFields(text: string, recipients: BroadcastRecipients) {
  const forLeads = isLeadAudience(recipients)
  const audience = forLeads ? parseLeadAudience(recipients) : null
  const keys = forLeads ? (await leadFieldKeys(audience?.kind === "list" ? audience.listId : null)).map((c) => c.key) : []
  const problem = mergeFieldProblem(text, forLeads, keys)
  if (problem) throw new CampaignError(problem)
}

// What the campaign keeps to show who it went to: a segment's value, or a
// leads list's name.
async function audienceShown(recipients: BroadcastRecipients, audienceValue: string | null) {
  const audience = isLeadAudience(recipients) ? parseLeadAudience(recipients) : null
  return audience?.kind === "list" ? await leadListName(audience.listId) : audienceValue
}

export const SENDING_SQL_MISSING = "Run scripts/email-sending.sql in Supabase first: choosing the service or sender needs it."

// A campaign's stored choice; empty columns are the defaults.
function sendingOf(row: { sendVia: string | null; sendFrom: string | null; replyTo: string | null } | null): Sending {
  return {
    via: VIA_CHOICES.find((v) => v === row?.sendVia) ?? DEFAULT_SENDING.via,
    from: row?.sendFrom || DEFAULT_SENDING.from,
    replyTo: row?.replyTo || null,
  }
}

/** What sends a campaign and who it's from: the defaults until scripts/email-sending.sql is run. */
export async function campaignSending(id: string): Promise<Sending> {
  try {
    return sendingOf(await db.emailCampaign.findUnique({ where: { id }, select: { sendVia: true, sendFrom: true, replyTo: true } }))
  } catch (err) {
    if (isEngageSchemaMissing(err)) return DEFAULT_SENDING
    throw err
  }
}

const isDefaultSending = (s: Sending) => s.via === DEFAULT_SENDING.via && s.from === DEFAULT_SENDING.from && !s.replyTo
const describeSending = (s: Sending) => `through ${s.via === "auto" ? "Brevo for leads, Resend for others" : s.via === "brevo" ? "Brevo" : "Resend"}, from ${s.from}${s.replyTo ? `, replies to ${s.replyTo}` : ""}`

export async function createCampaign(input: {
  adminEmail: string
  subject: string
  body: string
  recipients: BroadcastRecipients
  audienceValue: string | null
  // An AI-written email (subject and body are then its subject and plain text).
  design?: EmailDesign
  // What sends it and who it's from, already checked (lib/senders.ts resolveSending).
  sending?: Sending
}) {
  const sending = input.sending ?? DEFAULT_SENDING
  await checkMergeFields(emailText(input), input.recipients)
  const rows = await audienceRows(input.recipients, input.audienceValue)
  if (rows.length === 0) throw new CampaignError("No one matches that selection")
  if (rows.length > CAMPAIGN_MAX_RECIPIENTS) {
    throw new CampaignError(`A campaign can have up to ${CAMPAIGN_MAX_RECIPIENTS.toLocaleString("en-US")} people (${rows.length.toLocaleString("en-US")} matched)`)
  }

  const data = {
    subject: input.subject,
    body: input.body,
    audience: Array.isArray(input.recipients) ? "custom" : input.recipients,
    audienceValue: await audienceShown(input.recipients, input.audienceValue),
    design: input.design ?? undefined,
    createdBy: input.adminEmail,
    recipients: { createMany: { data: rows } },
    // Nothing for the defaults, so a campaign can be made before the SQL is run.
    ...(isDefaultSending(sending) ? {} : { sendVia: sending.via, sendFrom: sending.from, replyTo: sending.replyTo }),
  }
  let campaign: { id: string }
  try {
    campaign = await db.emailCampaign.create({ data, select: { id: true } })
  } catch (err) {
    if (isEngageSchemaMissing(err)) throw new CampaignError(SENDING_SQL_MISSING, 503)
    throw err
  }

  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "CREATE_CAMPAIGN",
    details: `"${input.subject}" → ${rows.length} people (${Array.isArray(input.recipients) ? "custom list" : input.recipients})${input.design ? " · written with AI" : ""}${isDefaultSending(sending) ? "" : ` · ${describeSending(sending)}`}`,
  })
  return { id: campaign.id, total: rows.length }
}

// The people an audience means, one row each by email, with names to make
// the list readable (the email stays the key): a user's from their profile,
// a lead's from their file.
async function audienceRows(recipients: BroadcastRecipients, audienceValue: string | null) {
  const people = await resolveRecipients(recipients, audienceValue)
  const userIds = people.flatMap((p) => (p.userId ? [p.userId] : []))
  const named = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, profile: { select: { name: true } } } })
    : []
  const nameById = new Map(named.map((u) => [u.id, u.profile?.name?.trim() || null]))

  const seen = new Set<string>()
  return people.flatMap((p) => {
    const email = p.email.trim().toLowerCase()
    if (seen.has(email)) return []
    seen.add(email)
    return [{ userId: p.userId, email, name: p.userId ? (nameById.get(p.userId) ?? null) : (p.name ?? null) }]
  })
}

/**
 * Adds more people to a campaign (Use again → Add people). Anyone already on
 * its list is skipped, so nobody can get it twice. dryRun: only counts them.
 */
export async function addCampaignRecipients(input: {
  campaignId: string
  adminEmail: string
  recipients: BroadcastRecipients
  audienceValue: string | null
  dryRun?: boolean
}): Promise<{ added: number; already: number }> {
  const campaign = await db.emailCampaign.findUnique({
    where: { id: input.campaignId },
    select: { subject: true, body: true, design: true, status: true },
  })
  if (!campaign) throw new CampaignError("Campaign not found", 404)
  if (campaign.status === "archived") throw new CampaignError("This campaign is archived. Restore it to add people.")
  await checkMergeFields(emailText(campaign), input.recipients)

  const rows = await audienceRows(input.recipients, input.audienceValue)
  if (rows.length === 0) throw new CampaignError("No one matches that selection")
  const onList = await db.emailCampaignRecipient.findMany({ where: { campaignId: input.campaignId }, select: { email: true } })
  const existing = new Set(onList.map((r) => r.email.toLowerCase()))
  const fresh = rows.filter((r) => !existing.has(r.email))
  if (onList.length + fresh.length > CAMPAIGN_MAX_RECIPIENTS) {
    throw new CampaignError(`A campaign can have up to ${CAMPAIGN_MAX_RECIPIENTS.toLocaleString("en-US")} people (it would have ${(onList.length + fresh.length).toLocaleString("en-US")})`)
  }
  if (input.dryRun || fresh.length === 0) return { added: input.dryRun ? fresh.length : 0, already: rows.length - fresh.length }

  // skipDuplicates: someone added by another click meanwhile still gets it once.
  const { count } = await db.emailCampaignRecipient.createMany({
    data: fresh.map((r) => ({ ...r, campaignId: input.campaignId })),
    skipDuplicates: true,
  })
  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "ADD_CAMPAIGN_RECIPIENTS",
    details: `"${campaign.subject}" + ${count} people (${Array.isArray(input.recipients) ? "custom list" : input.recipients}); ${rows.length - fresh.length} already on it`,
  })
  return { added: count, already: rows.length - count }
}

async function statusCounts(where: { campaignId?: string }) {
  const groups = await db.emailCampaignRecipient.groupBy({ by: ["status"], where, _count: { _all: true } })
  return Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Partial<Record<CampaignRecipientStatus, number>>
}

export type Allowance = { via: "resend" | "brevo"; limit: number; sentToday: number; left: number }

/**
 * Each sender's campaign emails today (the UTC day, as Resend counts) plus
 * any sending right now, and what's left of its daily limit: Resend's for
 * users and typed-in addresses, Brevo's for leads. split is false until
 * scripts/leads.sql's Brevo part has been run: every email is Resend's then,
 * as before, and leads can't be sent.
 */
export async function campaignAllowances(now: Date = new Date()): Promise<{ split: boolean; resend: Allowance; brevo: Allowance }> {
  const day = campaignDayStart(now)
  const count = (where: Record<string, unknown>) => db.emailCampaignRecipient.count({ where })
  const pool = (via: Allowance["via"], limit: number, sentToday: number, sendingNow: number): Allowance => ({
    via,
    limit,
    sentToday,
    left: allowanceLeft(sentToday, sendingNow, limit),
  })
  try {
    const resendSent = await count({ status: "sent", sentAt: { gte: day }, provider: null })
    const resendSending = await count({ status: "sending", provider: null })
    const brevoSent = await count({ status: "sent", sentAt: { gte: day }, provider: "brevo" })
    const brevoSending = await count({ status: "sending", provider: "brevo" })
    return {
      split: true,
      resend: pool("resend", CAMPAIGN_DAILY_LIMIT, resendSent, resendSending),
      brevo: pool("brevo", BREVO_DAILY_LIMIT, brevoSent, brevoSending),
    }
  } catch (err) {
    if (!isEngageSchemaMissing(err)) throw err
    const sent = await count({ status: "sent", sentAt: { gte: day } })
    const sending = await count({ status: "sending" })
    return {
      split: false,
      resend: pool("resend", CAMPAIGN_DAILY_LIMIT, sent, sending),
      brevo: { via: "brevo", limit: BREVO_DAILY_LIMIT, sentToday: 0, left: 0 },
    }
  }
}

/** The allowance a campaign's page shows: Brevo's when Brevo sends it (lib/sendingRules.ts usesBrevo), Resend's otherwise. */
export async function campaignAllowance(of: { audience?: string | null; via?: Via }, now: Date = new Date()): Promise<Allowance> {
  const all = await campaignAllowances(now)
  return usesBrevo(of.via ?? "auto", !!of.audience && isLeadAudience(of.audience)) ? all.brevo : all.resend
}

// "You can send 5 more today", or that the day's limit is used up.
function overLimitMessage(pool: Allowance): string {
  const what = pool.via === "brevo" ? `${BREVO_DAILY_LIMIT} emails a day through Brevo's free plan` : `${CAMPAIGN_DAILY_LIMIT} campaign emails a day on Resend's free plan`
  return pool.left === 0
    ? `Today's ${pool.via === "brevo" ? "Brevo " : ""}limit is used up (${what}). It resets at ${DAY_RESETS_AT}.`
    : `You can send ${pool.left} more${pool.via === "brevo" ? " through Brevo" : ""} today (${what}). Pick ${pool.left} or fewer.`
}

// A send cut off mid-way leaves people "sending" forever; after a while they
// show as failed with a note, so the admin decides whether to send again.
async function releaseStuckSends(campaignId: string, now: Date) {
  await db.emailCampaignRecipient.updateMany({
    where: { campaignId, status: "sending", updatedAt: { lt: new Date(now.getTime() - STUCK_SENDING_MS) } },
    data: { status: "failed", error: "Sending was cut off, so it may or may not have arrived. Check before sending again." },
  })
}

/**
 * A campaign's AI-written design, checked: null for an email written by hand.
 * A design that's broken or points at art that isn't ours or isn't painted
 * is refused rather than sent.
 */
export function campaignDesign(stored: unknown): EmailDesign | null {
  if (stored === null || stored === undefined) return null
  const parsed = emailDesignSchema.safeParse(stored)
  if (!parsed.success) throw new CampaignError("This campaign's email can't be read. Make it again from the writer.")
  const problem = artProblem(parsed.data, { painted: true })
  if (problem) throw new CampaignError(problem)
  return parsed.data
}

export async function listCampaigns() {
  const campaigns = await db.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, subject: true, audience: true, audienceValue: true, status: true, createdBy: true, createdAt: true },
  })
  const groups = campaigns.length
    ? await db.emailCampaignRecipient.groupBy({
        by: ["campaignId", "status"],
        where: { campaignId: { in: campaigns.map((c) => c.id) } },
        _count: { _all: true },
      })
    : []
  return campaigns.map((c) => {
    const counts = Object.fromEntries(groups.filter((g) => g.campaignId === c.id).map((g) => [g.status, g._count._all]))
    return { ...c, progress: campaignProgress(counts) }
  })
}

export async function getCampaign(id: string) {
  const now = new Date()
  await releaseStuckSends(id, now)
  // Each column by name: what sends it is read apart (campaignSending), so
  // the page still opens before scripts/email-sending.sql is run.
  const campaign = await db.emailCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      body: true,
      audience: true,
      audienceValue: true,
      design: true,
      status: true,
      createdBy: true,
      createdAt: true,
      recipients: {
        orderBy: [{ createdAt: "asc" }, { email: "asc" }],
        select: {
          id: true,
          email: true,
          name: true,
          userId: true,
          status: true,
          sentAt: true,
          error: true,
          // Seen and clicked (lib/emailTracking.ts).
          openedAt: true,
          lastOpenedAt: true,
          openCount: true,
          clickedAt: true,
          clickCount: true,
        },
      },
    },
  })
  if (!campaign) return null
  const sending = await campaignSending(id)
  const [counts, allowance] = await Promise.all([statusCounts({ campaignId: id }), campaignAllowance({ audience: campaign.audience, via: sending.via }, now)])
  return { ...campaign, sending, progress: campaignProgress(counts), allowance }
}

/** Checks a choice of service and sender for these people (lib/senders.ts), or says what's wrong. */
export async function checkSending(choice: SendingChoice, recipients: BroadcastRecipients | string): Promise<Sending> {
  const checked = await resolveSending(choice, usesBrevo(choice.via, isLeadAudience(recipients)))
  if ("problem" in checked) throw new CampaignError(checked.problem)
  return checked.sending
}

/** Changes what sends the rest of a campaign and who it's from. */
export async function setCampaignSending(id: string, choice: SendingChoice, adminEmail: string) {
  const campaign = await db.emailCampaign.findUnique({ where: { id }, select: { subject: true, audience: true } })
  if (!campaign) throw new CampaignError("Campaign not found", 404)
  const sending = await checkSending(choice, campaign.audience)
  const columns = isDefaultSending(sending)
    ? { sendVia: null, sendFrom: null, replyTo: null }
    : { sendVia: sending.via, sendFrom: sending.from, replyTo: sending.replyTo }
  try {
    await db.emailCampaign.update({ where: { id }, data: columns, select: { id: true } })
  } catch (err) {
    if (isEngageSchemaMissing(err)) throw new CampaignError(SENDING_SQL_MISSING, 503)
    throw err
  }
  await logAdminAction({ adminEmail, action: "SET_CAMPAIGN_SENDING", details: `"${campaign.subject}" now goes ${describeSending(sending)}` })
}

export async function setCampaignStatus(id: string, status: "active" | "archived", adminEmail: string) {
  const campaign = await db.emailCampaign.update({ where: { id }, data: { status }, select: { subject: true } }).catch(() => null)
  if (!campaign) throw new CampaignError("Campaign not found", 404)
  await logAdminAction({
    adminEmail,
    action: status === "archived" ? "ARCHIVE_CAMPAIGN" : "RESTORE_CAMPAIGN",
    details: `"${campaign.subject}"`,
  })
}

/**
 * Sends the campaign's email to the ticked people who haven't had it yet.
 * Anyone already sent (or being sent by another click) is skipped, so a
 * double click or two open tabs can't email anyone twice.
 */
export async function sendCampaignBatch(input: {
  campaignId: string
  recipientIds: string[]
  adminEmail: string
  resend: BatchMailer
  // Brevo (lib/brevo.ts brevoMailer): leads, or everyone when the campaign is
  // set to Brevo; null when it isn't set up.
  brevo?: BatchMailer | null
  // Who it's from unless the campaign has its own sender.
  from: string
  ipAddress?: string | null
}) {
  const now = new Date()
  const ids = [...new Set(input.recipientIds)]
  if (ids.length === 0) throw new CampaignError("Pick at least one person")

  const campaign = await db.emailCampaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, subject: true, body: true, status: true, design: true },
  })
  if (!campaign) throw new CampaignError("Campaign not found", 404)
  if (campaign.status === "archived") throw new CampaignError("This campaign is archived. Restore it to send.")
  const design = campaignDesign(campaign.design)

  await releaseStuckSends(campaign.id, now)
  const choice = await campaignSending(campaign.id)
  const from = choice.from === DEFAULT_SENDING.from ? input.from : choice.from

  // Who's going out, and through what: Brevo or Resend as the campaign says
  // (automatic: leads, lib/leads.ts, through Brevo and everyone else through
  // Resend), each within its own daily limit.
  const open = { campaignId: campaign.id, status: { in: ["pending", "failed"] } }
  const candidates = await db.emailCampaignRecipient.findMany({ where: { id: { in: ids }, ...open }, select: { id: true, userId: true, email: true } })
  const leads = await leadSendInfo(candidates.flatMap((r) => (r.userId ? [] : [r.email])))
  const leadOf = (r: { userId: string | null; email: string }) => (r.userId ? undefined : leads.get(r.email.toLowerCase()))
  const byBrevo = (r: { userId: string | null; email: string }) => usesBrevo(choice.via, !!leadOf(r))
  const toBrevo = candidates.filter(byBrevo).map((r) => r.id)
  const toResend = candidates.filter((r) => !byBrevo(r)).map((r) => r.id)
  const allowance = await campaignAllowances(now)
  if (toBrevo.length > 0 && !allowance.split) throw new CampaignError(LEADS_SQL_MISSING, 503)
  if (toBrevo.length > 0 && !input.brevo) throw new CampaignError(BREVO_MISSING, 503)
  for (const [wanted, pool] of [[toResend.length, allowance.resend], [toBrevo.length, allowance.brevo]] as const) {
    if (wanted > pool.left) throw new CampaignError(overLimitMessage(pool), 429)
  }

  // Claim: only people not sent yet (or failed) and not taken by another click.
  const batchId = randomUUID()
  for (const [group, provider] of [[toResend, null], [toBrevo, "brevo"]] as const) {
    if (group.length === 0) continue
    await db.emailCampaignRecipient.updateMany({
      where: { id: { in: group }, ...open },
      data: { status: "sending", batchId, error: null, ...(allowance.split ? { provider } : {}) },
    })
  }
  const claimed = await db.emailCampaignRecipient.findMany({
    where: { campaignId: campaign.id, batchId, status: "sending" },
    select: { id: true, userId: true, email: true },
  })
  const skipped = ids.length - claimed.length
  const left = toBrevo.length > 0 && toResend.length === 0 ? allowance.brevo.left : allowance.resend.left
  if (claimed.length === 0) {
    return { sent: 0, failed: 0, skipped, error: undefined, left }
  }

  // Leads get their own merge fields and an Unsubscribe link; one who
  // unsubscribed isn't sent to, and neither is one whose link couldn't be made.
  const blocked = new Map<string, string>()
  for (const r of claimed) {
    const lead = leadOf(r)
    if (lead?.unsubscribed) blocked.set(r.id, UNSUBSCRIBED_NOTE)
    else if (lead && !unsubscribeToken(lead.id)) blocked.set(r.id, "Not sent: the Unsubscribe link couldn't be made (the server's secret is missing)")
  }
  for (const error of new Set(blocked.values())) {
    await db.emailCampaignRecipient.updateMany({
      where: { id: { in: [...blocked].flatMap(([id, e]) => (e === error ? [id] : [])) }, batchId },
      data: { status: "failed", error },
    })
  }
  const sending = claimed.filter((r) => !blocked.has(r.id))

  // Each copy is tracked: seen and clicked land on this recipient's row.
  const people = sending.map((r) => {
    const lead = leadOf(r)
    return {
      byBrevo: byBrevo(r),
      userId: r.userId,
      email: r.email,
      trackingToken: trackingToken({ kind: "campaign", id: r.id }),
      ...(lead ? { values: lead.values, unsubscribeUrl: unsubscribeUrl(unsubscribeToken(lead.id)!) } : {}),
    }
  })
  const idempotencyPrefix = `campaign-${campaign.id}-${batchId}`
  const sendThrough = async (mailer: BatchMailer, group: typeof people, prefix: string): Promise<BatchSendResult> =>
    group.length === 0
      ? { sent: 0, failed: 0, failedTo: [] }
      : design
        ? sendDesignedEmails(mailer, from, group, design, prefix, { replyTo: choice.replyTo })
        : sendUserBroadcast(mailer, from, group, campaign.subject, campaign.body, prefix, { replyTo: choice.replyTo })
  const viaResend = await sendThrough(input.resend, people.filter((p) => !p.byBrevo), idempotencyPrefix)
  const viaBrevo = input.brevo ? await sendThrough(input.brevo, people.filter((p) => p.byBrevo), `${idempotencyPrefix}-brevo`) : null
  const result = {
    failedTo: [...viaResend.failedTo, ...(viaBrevo?.failedTo ?? [])],
    error: viaResend.error ?? viaBrevo?.error,
  }

  const failedTo = new Set(result.failedTo.map((e) => e.toLowerCase()))
  const failedIds = sending.filter((r) => failedTo.has(r.email.toLowerCase())).map((r) => r.id)
  const sentIds = sending.filter((r) => !failedTo.has(r.email.toLowerCase())).map((r) => r.id)
  const sentAt = new Date()
  await Promise.all([
    sentIds.length
      ? db.emailCampaignRecipient.updateMany({ where: { id: { in: sentIds }, batchId }, data: { status: "sent", sentAt, error: null } })
      : null,
    failedIds.length
      ? db.emailCampaignRecipient.updateMany({
          where: { id: { in: failedIds }, batchId },
          data: { status: "failed", error: result.error ?? "Resend didn't accept this email" },
        })
      : null,
  ])

  // Shown on the Leads page; a failure here mustn't undo what was sent.
  const sentIdSet = new Set(sentIds)
  const sentLeads = sending.flatMap((r) => (sentIdSet.has(r.id) ? (leadOf(r)?.id ?? []) : []))
  await markLeadsEmailed(sentLeads, sentAt).catch((err) => console.error("[campaigns] marking leads emailed failed:", err))

  const unsubscribed = [...blocked.values()].filter((e) => e === UNSUBSCRIBED_NOTE).length
  const error =
    result.error ??
    (blocked.size === 0 ? undefined : unsubscribed === blocked.size ? `${unsubscribed} unsubscribed, so not sent` : [...blocked.values()].find((e) => e !== UNSUBSCRIBED_NOTE))
  const failed = failedIds.length + blocked.size
  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "SEND_CAMPAIGN_BATCH",
    details: `"${campaign.subject}" → ${claimed.length} people (${sentIds.length} sent, ${failed} failed)${error ? ` — ${error}` : ""}`,
    ipAddress: input.ipAddress ?? undefined,
  })

  return { sent: sentIds.length, failed, skipped, error, left: Math.max(0, left - sentIds.length) }
}
