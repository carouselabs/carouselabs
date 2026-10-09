// lib/emailBatchSend.ts
// Sends many emails through Resend's batch endpoint: up to 100 emails per
// request, requests spaced to stay under Resend's rate limit, and a request
// Resend turns away for going too fast tried again. Every broadcast (users
// and interns, sent now or scheduled) goes through here.
//
// Sending each email as its own request, all at once, is what capped
// broadcasts at around ten: Resend answers "rate_limit_exceeded" to every
// request past its few-per-second limit, so the rest failed.
import type { Resend } from "resend"

// Resend's maximum emails per batch request.
export const BATCH_SIZE = 100
// Resend's default limit is 2 requests a second (per team).
const MIN_GAP_MS = 600
const MAX_TRIES = 4
const RETRY_BASE_MS = 1_000

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
}

export interface BatchSendResult {
  sent: number
  failed: number
  // The addresses that weren't sent (when they were known: an item whose
  // email couldn't even be prepared is only counted).
  failedTo: string[]
  // Resend's reason when something failed (the first one seen), so the
  // admin sees it instead of a bare count: e.g. a daily or monthly quota.
  error?: string
}

// Resend refusals that will not go away by trying again in a second: the
// account's sending quota. Nothing after one of these can be sent either.
const QUOTA_ERRORS = new Set(["daily_quota_exceeded", "monthly_quota_exceeded"])
// Worth another try: too fast, or Resend's own trouble.
const RETRY_ERRORS = new Set(["rate_limit_exceeded", "internal_server_error", "application_error", "concurrent_idempotent_requests"])

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function chunk<T>(items: readonly T[], size: number = BATCH_SIZE): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

// Sends one email per item, BATCH_SIZE items per request, in order.
// `prepare` turns one batch of items into its emails just before that batch
// is sent, so a large broadcast is never personalized all at once.
export async function sendInBatches<T>(
  resend: Resend,
  from: string,
  items: readonly T[],
  prepare: (batch: T[]) => Promise<OutgoingEmail[]>,
  options: { idempotencyPrefix?: string; sleepFn?: (ms: number) => Promise<void> } = {},
): Promise<BatchSendResult> {
  const wait = options.sleepFn ?? sleep
  const result: BatchSendResult = { sent: 0, failed: 0, failedTo: [] }
  const fail = (emails: OutgoingEmail[]) => {
    result.failed += emails.length
    result.failedTo.push(...emails.map((e) => e.to))
  }
  const batches = chunk(items)
  let lastRequestAt = 0
  let stopped = false

  for (const [index, batch] of batches.entries()) {
    if (stopped) {
      result.failed += batch.length
      continue
    }

    let emails: OutgoingEmail[]
    try {
      emails = await prepare(batch)
    } catch (err) {
      console.error("[emailBatchSend] preparing a batch failed:", err)
      result.failed += batch.length
      result.error ??= "Couldn't personalize some emails"
      continue
    }
    if (emails.length === 0) continue

    for (let attempt = 1; ; attempt += 1) {
      const gap = MIN_GAP_MS - (Date.now() - lastRequestAt)
      if (gap > 0) await wait(gap)
      lastRequestAt = Date.now()

      const { data, error } = await resend.batch.send(
        emails.map((e) => ({ from, to: e.to, subject: e.subject, html: e.html })),
        {
          // One bad address must not hold back the other 99.
          batchValidation: "permissive",
          // A retried batch is never sent twice.
          ...(options.idempotencyPrefix ? { idempotencyKey: `${options.idempotencyPrefix}-${index}` } : {}),
        },
      )

      if (!error) {
        const rejected = data?.errors ?? []
        result.sent += emails.length - rejected.length
        result.failed += rejected.length
        result.failedTo.push(...rejected.flatMap((r) => (emails[r.index] ? [emails[r.index].to] : [])))
        if (rejected.length > 0) result.error ??= rejected[0].message
        break
      }

      if (QUOTA_ERRORS.has(error.name)) {
        fail(emails)
        result.error = `Resend: ${error.message}`
        stopped = true
        break
      }
      if (RETRY_ERRORS.has(error.name) && attempt < MAX_TRIES) {
        await wait(RETRY_BASE_MS * 2 ** (attempt - 1))
        continue
      }
      console.error("[emailBatchSend] batch failed:", error)
      fail(emails)
      result.error ??= `Resend: ${error.message}`
      break
    }
  }

  return result
}
