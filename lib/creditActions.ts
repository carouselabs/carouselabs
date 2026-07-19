// lib/creditActions.ts
// Weighted credit costs, shared by the /api/credits/consume endpoint, the
// generation clients, and UI cost badges. First generations are charged at the
// post level (the whole flow is included); regenerations are charged on top.

export const CREDIT_COSTS = {
  caption_only: 5,
  image_caption: 15,
  carousel: 40,
  image_regen: 8,
  slide_regen: 8,
  text_regen: 1,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

// Post-level actions (first generations). Everything else is a regeneration.
export function isPostAction(action: CreditAction): boolean {
  return action === "caption_only" || action === "image_caption" || action === "carousel"
}

export interface ConsumeResult {
  ok: boolean
  remainingCredits: number
  requiresUpgrade: boolean
}

// Client-side helper — call before starting a chargeable generation and block
// the flow when `ok` is false. Fails closed on network errors so a flaky
// connection can't produce uncharged generations.
export async function consumeCreditsClient(action: CreditAction): Promise<ConsumeResult> {
  try {
    const res = await fetch("/api/credits/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    const data = (await res.json().catch(() => ({}))) as Partial<ConsumeResult>
    return {
      ok: data.ok === true,
      remainingCredits: typeof data.remainingCredits === "number" ? data.remainingCredits : 0,
      requiresUpgrade: data.requiresUpgrade === true,
    }
  } catch {
    return { ok: false, remainingCredits: 0, requiresUpgrade: false }
  }
}
