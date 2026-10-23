// lib/engage/subscriptions.ts — where each extension's plan is stored. They're
// sold separately: each has its own $15/month subscription table and its own
// count of free generations used on "User".
import type { ExtensionSubscription, User } from "@prisma/client"
import { db } from "@/lib/db"
import type { EngagePlatform } from "@/lib/engage/features"

export const SUBSCRIPTION_TABLES = {
  linkedin: "ExtensionSubscription",
  x: "XSubscription",
} as const satisfies Record<EngagePlatform, string>

export const FREE_USED_COLUMNS = {
  linkedin: "extensionTrialUsed",
  x: "xTrialUsed",
} as const satisfies Record<EngagePlatform, keyof User>
export type FreeUsedColumn = (typeof FREE_USED_COLUMNS)[EngagePlatform]

// Every extension's free-use count, for a Prisma select.
export const FREE_USED_SELECT = Object.fromEntries(Object.values(FREE_USED_COLUMNS).map((c) => [c, true])) as Record<
  FreeUsedColumn,
  true
>

const FIND: Record<EngagePlatform, (userId: string) => Promise<ExtensionSubscription | null>> = {
  linkedin: (userId) => db.extensionSubscription.findUnique({ where: { userId } }),
  x: (userId) => db.xSubscription.findUnique({ where: { userId } }),
}

// One extension's stored subscription (all have the same fields).
export function findEngageSubscription(userId: string, platform: EngagePlatform): Promise<ExtensionSubscription | null> {
  return FIND[platform](userId)
}
