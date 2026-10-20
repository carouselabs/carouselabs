// lib/campaignRules.ts
// The rules for email campaigns (Admin → Broadcasts → Campaigns) that need no
// database: the daily allowance, "select the next 10 not yet sent", and
// progress. Shared by the API (lib/campaigns.ts) and the admin page.

// Resend's free plan sends 100 emails a day for the WHOLE account, the app's
// automatic emails (welcome, credits, posts) included. Campaigns stop at 80
// in any 24 hours so those 20 stay free. Raise this on a paid Resend plan.
export const CAMPAIGN_DAILY_LIMIT = 80

export const CAMPAIGN_MAX_RECIPIENTS = 10_000

// "Select next 10" picks this many people who haven't been sent it yet.
export const NEXT_BATCH_SIZE = 10

// A person still "sending" after this long was cut off mid-send (the server
// stopped): shown as failed, so the admin decides whether to send again.
export const STUCK_SENDING_MS = 10 * 60 * 1000

export type CampaignRecipientStatus = "pending" | "sending" | "sent" | "failed"

/** Whether this person can be picked for a send: not yet sent, or it failed. */
export function canSend(status: string): boolean {
  return status === "pending" || status === "failed"
}

/**
 * The next people who haven't been sent the email, in list order, skipping
 * anyone already picked. Failed ones aren't included: retrying is a choice.
 */
export function nextUnsent(
  rows: readonly { id: string; status: string }[],
  alreadyPicked: ReadonlySet<string> = new Set(),
  count: number = NEXT_BATCH_SIZE,
): string[] {
  const picked: string[] = []
  for (const row of rows) {
    if (picked.length >= count) break
    if (row.status === "pending" && !alreadyPicked.has(row.id)) picked.push(row.id)
  }
  return picked
}

/** How many more campaign emails can go out now without passing the daily limit. */
export function allowanceLeft(sentInLast24h: number, sendingNow: number, limit: number = CAMPAIGN_DAILY_LIMIT): number {
  return Math.max(0, limit - sentInLast24h - sendingNow)
}

export interface CampaignProgress {
  total: number
  sent: number
  failed: number
  pending: number
  sending: number
  complete: boolean
}

export function campaignProgress(counts: Partial<Record<CampaignRecipientStatus, number>>): CampaignProgress {
  const sent = counts.sent ?? 0
  const failed = counts.failed ?? 0
  const pending = counts.pending ?? 0
  const sending = counts.sending ?? 0
  const total = sent + failed + pending + sending
  return { total, sent, failed, pending, sending, complete: total > 0 && sent === total }
}
