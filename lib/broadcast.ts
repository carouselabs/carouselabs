// lib/broadcast.ts
// Server-only recipient resolution (touches Prisma) for admin email
// broadcasts. Rendering lives in lib/broadcastRender.ts, which has no
// server-only imports so the client-side preview modal can use it too.
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"

// segmentValue is only meaningful for "inactive" (days) and "low_credits"
// (credit threshold) — see lib/segments.ts for the shared catalog the UI
// dropdowns render from. A plain string[] is still a custom email list.
export type BroadcastRecipients = "all" | "pro" | "growth" | "free" | "inactive" | "zero_referrals" | "no_content" | "low_credits" | string[]

// userId is null only for a custom-list email with no matching User row
// (e.g. an external address entered by hand) — resolveVariables has nothing
// to look up for those, so callers skip personalization and send the raw
// template (see lib/broadcastRender.ts's applyVariables: unresolved {{key}}
// placeholders are left as literal text, never silently blanked).
export interface BroadcastRecipient {
  userId: string | null
  email: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_INACTIVE_DAYS = 30
const DEFAULT_CREDIT_THRESHOLD = 100

export async function resolveRecipients(
  recipients: BroadcastRecipients,
  segmentValue?: string | null,
): Promise<BroadcastRecipient[]> {
  if (Array.isArray(recipients)) {
    const cleaned = [
      ...new Set(recipients.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL_RE.test(e))),
    ]
    if (cleaned.length === 0) return []
    const matched = await db.user.findMany({
      where: { email: { in: cleaned } },
      select: { id: true, email: true },
    })
    const byEmail = new Map(matched.map((u) => [u.email.toLowerCase(), u.id]))
    return cleaned.map((email) => ({ userId: byEmail.get(email) ?? null, email }))
  }

  if (recipients === "all") {
    const users = await db.user.findMany({ where: { deletedAt: null }, select: { id: true, email: true } })
    return users.map((u) => ({ userId: u.id, email: u.email }))
  }

  if (recipients === "pro" || recipients === "growth" || recipients === "free") {
    const plan = recipients === "pro" ? "PRO" : recipients === "growth" ? "GROWTH" : "FREE"
    const users = await db.user.findMany({
      where: { deletedAt: null, subscription: { plan } },
      select: { id: true, email: true },
    })
    return users.map((u) => ({ userId: u.id, email: u.email }))
  }

  // "Inactive" reuses the same updatedAt-as-last-activity convention the
  // admin user detail page already displays ("last active {updatedAt}") —
  // there's no dedicated last-activity timestamp elsewhere to prefer.
  if (recipients === "inactive") {
    const days = Number(segmentValue) > 0 ? Number(segmentValue) : DEFAULT_INACTIVE_DAYS
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const users = await db.user.findMany({
      where: { deletedAt: null, updatedAt: { lt: cutoff } },
      select: { id: true, email: true },
    })
    return users.map((u) => ({ userId: u.id, email: u.email }))
  }

  if (recipients === "zero_referrals") {
    const users = await db.user.findMany({
      where: { deletedAt: null, referralsMade: { none: {} } },
      select: { id: true, email: true },
    })
    return users.map((u) => ({ userId: u.id, email: u.email }))
  }

  if (recipients === "no_content") {
    const users = await db.user.findMany({
      where: { deletedAt: null, posts: { none: {} } },
      select: { id: true, email: true },
    })
    return users.map((u) => ({ userId: u.id, email: u.email }))
  }

  if (recipients === "low_credits") {
    const threshold = Number(segmentValue) > 0 ? Number(segmentValue) : DEFAULT_CREDIT_THRESHOLD
    // availableCredits() depends on plan-specific fields — computed per-user
    // in JS rather than in SQL, same tradeoff lib/credits.ts's other callers
    // already make (no query-level equivalent of the FREE-vs-paid branch).
    const users = await db.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, subscription: true },
    })
    return users
      .filter((u) =>
        availableCredits({
          plan: u.subscription?.plan ?? "FREE",
          creditsUsed: u.subscription?.creditsUsed ?? 0,
          creditsTotal: u.subscription?.creditsTotal ?? 0,
          extraCredits: u.subscription?.extraCredits ?? 0,
          extraCreditsExpiry: u.subscription?.extraCreditsExpiry ?? null,
        }) < threshold,
      )
      .map((u) => ({ userId: u.id, email: u.email }))
  }

  return []
}

export { renderBroadcastBodyHtml, renderBroadcastEmailHtml } from "@/lib/broadcastRender"
