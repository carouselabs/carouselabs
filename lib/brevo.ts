// lib/brevo.ts — leads' campaign emails go through Brevo (brevo.com) instead
// of Resend; users' emails stay on Resend. Brevo's transactional API
// (POST /v3/smtp/email) takes many versions of an email in one request, so
// brevoMailer() stands in for Resend's batch.send and every batch still goes
// through lib/emailBatchSend.ts. Also: the Leads page's setup checks, and the
// webhook that tells us when Brevo stops someone (they unsubscribed with
// Brevo's own button, bounced or marked it spam; app/api/webhooks/brevo).
// BREVO_API_KEY is the account's API key (Brevo → SMTP & API → API keys).
import crypto from "node:crypto"
import { APP_URL } from "@/emails/theme"
import type { BatchMailer } from "@/lib/emailBatchSend"

const API = "https://api.brevo.com/v3"

// Brevo's free plan sends 300 emails a day; lead campaigns stop at 280 so a
// few stay free for tests and anything sent from Brevo itself.
export const BREVO_DAILY_LIMIT = 280

export const BREVO_MISSING = "Leads' emails go through Brevo, and it isn't set up yet: add BREVO_API_KEY in Vercel (and .env.local)."

export const brevoKey = () => process.env.BREVO_API_KEY?.trim() || null

/** "CarouseLabs <support@carouselabs.com>" → { name, email } */
export function parseFrom(from: string): { name?: string; email: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from)
  return match ? { ...(match[1] ? { name: match[1] } : {}), email: match[2].trim() } : { email: from.trim() }
}

// Brevo's idempotency key must be a UUID: the same batch key always makes the same one.
export function idempotencyUuid(key: string): string {
  const h = crypto.createHash("sha256").update(key).digest("hex")
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

type BrevoAnswer = { code?: string; message?: string }

// Brevo's refusal, named like Resend's so lib/emailBatchSend.ts knows what to
// do: stop for the day, try again, or give up on this batch.
function asResendError(status: number, answer: BrevoAnswer): { name: string; message: string } {
  const message = answer.message || `error ${status}`
  if (status === 402 || /credit/i.test(`${answer.code} ${answer.message}`)) return { name: "daily_quota_exceeded", message }
  if (status === 429) return { name: "rate_limit_exceeded", message }
  if (status >= 500) return { name: "internal_server_error", message }
  return { name: answer.code || "brevo_error", message }
}

/**
 * Brevo, answering like Resend's batch.send (null without a key). Each email
 * is one message version. Brevo adds its own List-Unsubscribe header and
 * won't take ours, so a lead's own headers are left off; the Unsubscribe
 * link in the email stays, and Brevo's button reaches us by the webhook.
 */
export function brevoMailer(fetchFn: typeof fetch = fetch): BatchMailer | null {
  const key = brevoKey()
  if (!key) return null
  return {
    label: "Brevo",
    batch: {
      async send(emails, options) {
        if (emails.length === 0) return { data: { errors: [] }, error: null }
        const idempotencyKey = options?.idempotencyKey ? idempotencyUuid(options.idempotencyKey) : null
        const body = {
          sender: parseFrom(emails[0].from),
          subject: emails[0].subject,
          htmlContent: emails[0].html,
          messageVersions: emails.map((e) => ({ to: [{ email: e.to }], subject: e.subject, htmlContent: e.html })),
          ...(emails[0].replyTo ? { replyTo: { email: emails[0].replyTo } } : {}),
          ...(idempotencyKey ? { headers: { idempotencyKey } } : {}),
        }
        let res: Response
        try {
          res = await fetchFn(`${API}/smtp/email`, {
            method: "POST",
            headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify(body),
          })
        } catch {
          return { data: null, error: { name: "application_error", message: "Brevo couldn't be reached" } }
        }
        if (res.ok) return { data: { errors: [] }, error: null }
        const answer = ((await res.json().catch(() => ({}))) ?? {}) as BrevoAnswer
        // The same batch again (a retry after a lost answer): Brevo already sent it.
        if (idempotencyKey && answer.code === "duplicate_parameter") return { data: { errors: [] }, error: null }
        return { data: null, error: asResendError(res.status, answer) }
      },
    },
  }
}

// ── The webhook (app/api/webhooks/brevo) ────────────────────────────────

// Its own token, derived from a server secret every deployment has (like the
// tracking tokens), so nobody else can tell us to stop emailing someone.
export function brevoWebhookToken(): string | null {
  const secret = process.env.EMAIL_TRACKING_SECRET || process.env.CLERK_SECRET_KEY
  return secret ? crypto.createHmac("sha256", secret).update("brevo-webhook-v1").digest("base64url").slice(0, 32) : null
}

export function isBrevoWebhookToken(given: string | null | undefined): boolean {
  const token = brevoWebhookToken()
  if (!token || !given || given.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))
}

export const BREVO_WEBHOOK_PATH = "/api/webhooks/brevo"
const webhookUrl = (token: string) => `${APP_URL}${BREVO_WEBHOOK_PATH}?token=${token}`

// What makes us stop emailing a lead, and why (Lead.stopReason).
export const BREVO_STOP_EVENTS: Record<string, "unsubscribed" | "spam" | "bounced" | "blocked"> = {
  unsubscribed: "unsubscribed",
  spam: "spam",
  hard_bounce: "bounced",
  invalid_email: "bounced",
  blocked: "blocked",
}
// The same events, as Brevo names them when the webhook is made.
const WEBHOOK_EVENTS = ["unsubscribed", "spam", "hardBounce", "invalid", "blocked"]

// ── Setup checks for the Leads page ─────────────────────────────────────

export type BrevoStatus =
  | { key: false }
  | {
      key: true
      // Brevo's answer when the key didn't work.
      error?: string
      sender: { email: string; active: boolean } | null
      domain: { name: string; authenticated: boolean } | null
      webhook: boolean
    }

async function brevoGet<T>(path: string, key: string, fetchFn: typeof fetch): Promise<T> {
  const res = await fetchFn(`${API}${path}`, { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as BrevoAnswer).message || `Brevo answered ${res.status}`)
  return body as T
}

// The account's transactional webhooks. Brevo answers "Webhook record does
// not exist" (an error) when there are none yet, which just means none.
async function listWebhooks(key: string, fetchFn: typeof fetch): Promise<{ url?: string }[]> {
  try {
    return (await brevoGet<{ webhooks?: { url?: string }[] }>("/webhooks?type=transactional", key, fetchFn)).webhooks ?? []
  } catch (err) {
    if (err instanceof Error && /does not exist/i.test(err.message)) return []
    throw err
  }
}

/** The account's senders (Brevo → Senders), or null without a key or when Brevo didn't answer. */
export async function brevoSenders(fetchFn: typeof fetch = fetch): Promise<{ email: string; name: string; active: boolean }[] | null> {
  const key = brevoKey()
  if (!key) return null
  try {
    const answer = await brevoGet<{ senders?: { email?: string; name?: string; active?: boolean }[] }>("/senders", key, fetchFn)
    return (answer.senders ?? []).flatMap((s) => (s.email ? [{ email: s.email.toLowerCase(), name: s.name ?? "", active: !!s.active }] : []))
  } catch {
    return null
  }
}

/** Whether Brevo is ready to send leads' emails from `fromEmail`. */
export async function brevoStatus(fromEmail: string, fetchFn: typeof fetch = fetch): Promise<BrevoStatus> {
  const key = brevoKey()
  if (!key) return { key: false }
  const domainName = fromEmail.split("@")[1]?.toLowerCase() ?? ""
  try {
    const [senders, domains, webhooks] = await Promise.all([
      brevoGet<{ senders?: { email?: string; active?: boolean }[] }>("/senders", key, fetchFn),
      brevoGet<{ domains?: { domain_name?: string; authenticated?: boolean }[] }>("/senders/domains", key, fetchFn).catch(() => ({ domains: undefined })),
      listWebhooks(key, fetchFn),
    ])
    const sender = senders.senders?.find((s) => s.email?.toLowerCase() === fromEmail.toLowerCase())
    const domain = domains.domains?.find((d) => d.domain_name?.toLowerCase() === domainName)
    return {
      key: true,
      sender: sender ? { email: fromEmail, active: !!sender.active } : null,
      domain: domain ? { name: domainName, authenticated: !!domain.authenticated } : null,
      webhook: webhooks.some((w) => w.url?.startsWith(`${APP_URL}${BREVO_WEBHOOK_PATH}`)),
    }
  } catch (err) {
    return { key: true, error: err instanceof Error ? err.message : "Brevo didn't answer", sender: null, domain: null, webhook: false }
  }
}

/** Tells Brevo to let us know when it stops someone (does nothing if it already does). */
export async function connectBrevoWebhook(fetchFn: typeof fetch = fetch): Promise<void> {
  const key = brevoKey()
  if (!key) throw new Error(BREVO_MISSING)
  const token = brevoWebhookToken()
  if (!token) throw new Error("The server's secret is missing, so the webhook can't be protected.")
  if ((await listWebhooks(key, fetchFn)).some((w) => w.url === webhookUrl(token))) return
  const res = await fetchFn(`${API}/webhooks`, {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      type: "transactional",
      description: "CarouseLabs: stop emailing leads who unsubscribe, bounce or mark spam",
      url: webhookUrl(token),
      events: WEBHOOK_EVENTS,
    }),
  })
  if (!res.ok) {
    const answer = ((await res.json().catch(() => ({}))) ?? {}) as BrevoAnswer
    throw new Error(`Brevo: ${answer.message || `error ${res.status}`}`)
  }
}
