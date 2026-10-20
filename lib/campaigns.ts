// lib/campaigns.ts
// Email campaigns (Admin → Broadcasts → Campaigns): one email sent to a fixed
// list of people in batches the admin picks. The list is taken once, when the
// campaign is created; each Send claims the ticked people (so two clicks can
// never both email someone), sends through Resend's batch endpoint like a
// broadcast, then marks each person sent or failed with Resend's reason.
// Pure rules (daily allowance, next 10, progress) live in lib/campaignRules.ts.
import { randomUUID } from "node:crypto"
import type { Resend } from "resend"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/auditLog"
import { resolveRecipients, sendUserBroadcast, type BroadcastRecipients } from "@/lib/broadcast"
import {
  CAMPAIGN_DAILY_LIMIT,
  CAMPAIGN_MAX_RECIPIENTS,
  STUCK_SENDING_MS,
  allowanceLeft,
  campaignProgress,
  type CampaignRecipientStatus,
} from "@/lib/campaignRules"

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

export async function createCampaign(input: {
  adminEmail: string
  subject: string
  body: string
  recipients: BroadcastRecipients
  audienceValue: string | null
}) {
  const people = await resolveRecipients(input.recipients, input.audienceValue)
  if (people.length === 0) throw new CampaignError("No one matches that selection")
  if (people.length > CAMPAIGN_MAX_RECIPIENTS) {
    throw new CampaignError(`A campaign can have up to ${CAMPAIGN_MAX_RECIPIENTS.toLocaleString("en-US")} people (${people.length.toLocaleString("en-US")} matched)`)
  }

  // Names make the list readable; the email stays the key.
  const userIds = people.flatMap((p) => (p.userId ? [p.userId] : []))
  const named = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, profile: { select: { name: true } } } })
    : []
  const nameById = new Map(named.map((u) => [u.id, u.profile?.name?.trim() || null]))

  const seen = new Set<string>()
  const rows = people.flatMap((p) => {
    const email = p.email.trim().toLowerCase()
    if (seen.has(email)) return []
    seen.add(email)
    return [{ userId: p.userId, email, name: p.userId ? (nameById.get(p.userId) ?? null) : null }]
  })

  const campaign = await db.emailCampaign.create({
    data: {
      subject: input.subject,
      body: input.body,
      audience: Array.isArray(input.recipients) ? "custom" : input.recipients,
      audienceValue: input.audienceValue,
      createdBy: input.adminEmail,
      recipients: { createMany: { data: rows } },
    },
    select: { id: true },
  })

  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "CREATE_CAMPAIGN",
    details: `"${input.subject}" → ${rows.length} people (${Array.isArray(input.recipients) ? "custom list" : input.recipients})`,
  })
  return { id: campaign.id, total: rows.length }
}

async function statusCounts(where: { campaignId?: string }) {
  const groups = await db.emailCampaignRecipient.groupBy({ by: ["status"], where, _count: { _all: true } })
  return Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Partial<Record<CampaignRecipientStatus, number>>
}

/** Campaign emails sent in the last 24 hours plus any sending right now, and what's left of the daily limit. */
export async function campaignAllowance(now: Date = new Date()) {
  const [sentInLast24h, sendingNow] = await Promise.all([
    db.emailCampaignRecipient.count({ where: { status: "sent", sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
    db.emailCampaignRecipient.count({ where: { status: "sending" } }),
  ])
  return { limit: CAMPAIGN_DAILY_LIMIT, sentInLast24h, left: allowanceLeft(sentInLast24h, sendingNow) }
}

// A send cut off mid-way leaves people "sending" forever; after a while they
// show as failed with a note, so the admin decides whether to send again.
async function releaseStuckSends(campaignId: string, now: Date) {
  await db.emailCampaignRecipient.updateMany({
    where: { campaignId, status: "sending", updatedAt: { lt: new Date(now.getTime() - STUCK_SENDING_MS) } },
    data: { status: "failed", error: "Sending was cut off, so it may or may not have arrived. Check before sending again." },
  })
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
  const campaign = await db.emailCampaign.findUnique({
    where: { id },
    include: {
      recipients: {
        orderBy: [{ createdAt: "asc" }, { email: "asc" }],
        select: { id: true, email: true, name: true, userId: true, status: true, sentAt: true, error: true },
      },
    },
  })
  if (!campaign) return null
  const [counts, allowance] = await Promise.all([statusCounts({ campaignId: id }), campaignAllowance(now)])
  return { ...campaign, progress: campaignProgress(counts), allowance }
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
  resend: Resend
  from: string
  ipAddress?: string | null
}) {
  const now = new Date()
  const ids = [...new Set(input.recipientIds)]
  if (ids.length === 0) throw new CampaignError("Pick at least one person")

  const campaign = await db.emailCampaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, subject: true, body: true, status: true },
  })
  if (!campaign) throw new CampaignError("Campaign not found", 404)
  if (campaign.status === "archived") throw new CampaignError("This campaign is archived. Restore it to send.")

  await releaseStuckSends(campaign.id, now)
  const { left } = await campaignAllowance(now)
  if (ids.length > left) {
    throw new CampaignError(
      left === 0
        ? `Today's limit is used up (${CAMPAIGN_DAILY_LIMIT} campaign emails a day on Resend's free plan). Try again later.`
        : `You can send ${left} more today (${CAMPAIGN_DAILY_LIMIT} a day on Resend's free plan). Pick ${left} or fewer.`,
      429,
    )
  }

  // Claim: only people not sent yet (or failed) and not taken by another click.
  const batchId = randomUUID()
  await db.emailCampaignRecipient.updateMany({
    where: { id: { in: ids }, campaignId: campaign.id, status: { in: ["pending", "failed"] } },
    data: { status: "sending", batchId, error: null },
  })
  const claimed = await db.emailCampaignRecipient.findMany({
    where: { campaignId: campaign.id, batchId, status: "sending" },
    select: { id: true, userId: true, email: true },
  })
  const skipped = ids.length - claimed.length
  if (claimed.length === 0) {
    return { sent: 0, failed: 0, skipped, error: undefined, left }
  }

  const result = await sendUserBroadcast(
    input.resend,
    input.from,
    claimed.map((r) => ({ userId: r.userId, email: r.email })),
    campaign.subject,
    campaign.body,
    `campaign-${campaign.id}-${batchId}`,
  )

  const failedTo = new Set(result.failedTo.map((e) => e.toLowerCase()))
  const failedIds = claimed.filter((r) => failedTo.has(r.email.toLowerCase())).map((r) => r.id)
  const sentIds = claimed.filter((r) => !failedTo.has(r.email.toLowerCase())).map((r) => r.id)
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

  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "SEND_CAMPAIGN_BATCH",
    details: `"${campaign.subject}" → ${claimed.length} people (${sentIds.length} sent, ${failedIds.length} failed)${result.error ? ` — ${result.error}` : ""}`,
    ipAddress: input.ipAddress ?? undefined,
  })

  return { sent: sentIds.length, failed: failedIds.length, skipped, error: result.error, left: Math.max(0, left - sentIds.length) }
}
