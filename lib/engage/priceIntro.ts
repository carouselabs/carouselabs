// lib/engage/priceIntro.ts — an intro offer (lib/engage/priceRules.ts) is for
// one purchase: once someone buys the extension while they have one, it's
// spent, and a later purchase is at the usual price.
import { db } from "@/lib/db"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import type { EngagePlatform } from "@/lib/engage/features"

// They bought this extension. Run after the purchase is saved (the Lemon
// Squeezy webhook's after-commit step), never inside it. Never throws.
export async function markIntroUsed(userId: string, platform: EngagePlatform, at: Date = new Date()): Promise<void> {
  try {
    await db.engagePrice.updateMany({
      where: { userId, platform, introMonths: { not: null }, introUsedAt: null },
      data: { introUsedAt: at },
    })
  } catch (err) {
    if (!isEngageSchemaMissing(err)) console.error("[engagePrice] couldn't mark an intro offer used:", err)
  }
}
