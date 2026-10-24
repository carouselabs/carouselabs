// lib/readyEmailSend.ts — sends a campaign's ready-made email
// (lib/readyEmails.ts) the way an AI-written one goes (lib/emailDesignRender.ts):
// each person's {{variables}} filled in, tracked when they carry a
// trackingToken, a lead's copy with its Unsubscribe link, in batches of 100.
// It comes from the email's own name at the campaign's address, and its
// button opens a reply to where replies go.
import { parseFrom } from "@/lib/brevo"
import { resolveVariablesMany } from "@/lib/broadcastVariables"
import { sendInBatches, type BatchMailer, type BatchSendResult } from "@/lib/emailBatchSend"
import { personalizeDesignedEmail } from "@/lib/emailDesignRender"
import { withTracking } from "@/lib/emailTracking"
import { finishCopy } from "@/lib/leadUnsubscribe"
import { withReplyLink, type ReadyDesign } from "@/lib/readyEmails"
import { fromHeader } from "@/lib/sendingRules"
import type { BroadcastRecipient } from "@/lib/broadcast"

/** "Dharma Ramasamy <support@carouselabs.com>": the email's name at the campaign's address. */
export function readyFrom(ready: ReadyDesign, from: string): string {
  return fromHeader({ name: ready.fromName, email: parseFrom(from).email })
}

/** The email as it's sent, before each person's name: its button replying to replyTo, or the sender. */
export function readyHtml(ready: ReadyDesign, from: string, replyTo: string | null): string {
  return withReplyLink(ready.html, replyTo ?? parseFrom(from).email, ready.subject)
}

export async function sendReadyEmails(
  mailer: BatchMailer,
  from: string,
  recipients: BroadcastRecipient[],
  ready: ReadyDesign,
  idempotencyPrefix: string,
  { replyTo = null }: { replyTo?: string | null } = {},
): Promise<BatchSendResult> {
  const html = readyHtml(ready, from, replyTo)
  return sendInBatches(
    mailer,
    readyFrom(ready, from),
    recipients,
    async (batch) => {
      const variables = await resolveVariablesMany(batch.flatMap((r) => (r.userId ? [r.userId] : [])))
      return batch.map((r) => {
        const values = r.userId ? variables.get(r.userId) : r.values
        const copy = personalizeDesignedEmail(html, ready.subject, values, { blankMissing: !r.userId && !!r.values })
        return finishCopy(r, copy.subject, r.trackingToken ? withTracking(copy.html, r.trackingToken) : copy.html)
      })
    },
    { idempotencyPrefix, replyTo },
  )
}
