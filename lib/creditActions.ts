// lib/creditActions.ts
// Weighted credit costs, shared by the /api/credits/consume endpoint, the
// generation clients, and UI cost badges. First generations are charged at the
// post level (the whole flow is included); regenerations are charged on top.

// Post-level totals (caption_only / image_caption / carousel) are what the UI
// displays. The pricier flows are SPLIT server-side so forging regen flags at
// the caption route can never dodge the bulk of a post's cost:
//   image_caption (15) = caption_only (5) at the caption route
//                      + image_first (10) at the image route
//   carousel (40)      = caption_only (5) at the caption route
//                      + carousel_prompts (35) at the carousel-prompt route
export const CREDIT_COSTS = {
  caption_only: 5,
  image_caption: 15,
  image_first: 10,
  carousel: 40,
  carousel_prompts: 35,
  image_regen: 8,
  slide_regen: 8,
  text_regen: 1,
  thumbnail: 15,
  // browser-extension-comment/'s Generate flow (app/api/ext/generate). Charged
  // per successful comment; a generation that fails after its automatic retry
  // is never charged.
  comment_generate: 1,
  // Shorter / Longer rewrites (app/api/ext/rewrite). TODO: bill at 0.5 once the
  // credit columns can hold a fraction — Subscription.creditsUsed/creditsTotal/
  // extraCredits are Int, so 0.5 would be rounded on deduction rather than
  // charged. Free rather than silently wrong; the route rate-limits instead.
  comment_rewrite: 0,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

// Post-level actions (first generations). Everything else is a regeneration.
export function isPostAction(action: CreditAction): boolean {
  return action === "caption_only" || action === "image_caption" || action === "carousel"
}

export interface CreditBalance {
  ok: boolean
  remainingCredits: number
  requiresUpgrade: boolean
}

// Client-side helper — READ-ONLY balance lookup for UI display. Deduction
// happens server-side inside the generation routes; clients never trigger a
// charge directly.
export async function fetchCreditBalance(): Promise<CreditBalance> {
  try {
    const res = await fetch("/api/credits/consume", { method: "POST" })
    const data = (await res.json().catch(() => ({}))) as Partial<CreditBalance>
    return {
      ok: data.ok === true,
      remainingCredits: typeof data.remainingCredits === "number" ? data.remainingCredits : 0,
      requiresUpgrade: data.requiresUpgrade === true,
    }
  } catch {
    return { ok: false, remainingCredits: 0, requiresUpgrade: false }
  }
}
