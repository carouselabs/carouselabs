// lib/engage/pageData.ts — what the Engage pages (app/(app)/extension/*)
// read about the signed-in person, deduplicated per request with React's
// cache(): the section's layout (its menu shows every extension's plan) and
// the page under it (Home, Plan & setup) ask for the same things, and should
// hit the database once.
import * as React from "react"
import { db } from "@/lib/db"
import { extAccessSummary } from "@/lib/extAccess"
import { tokenPlatform, type EngagePlatform } from "@/lib/engage/features"

// React's per-request cache on the server. The extension's unit tests render
// these pages with React 18, which has none: there each call just runs.
const cache: <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A) => R =
  typeof (React as { cache?: unknown }).cache === "function" ? (React as unknown as { cache: typeof cache }).cache : (fn) => fn

export const engageAccess = cache((userId: string, platform: EngagePlatform) => extAccessSummary(userId, platform))

// How many browsers each extension is signed in on (the same sign-ins
// Plan & setup lists, app/api/ext/devices).
export const engageSignIns = cache(async (userId: string): Promise<Record<EngagePlatform, number>> => {
  const tokens = await db.extensionToken.findMany({ where: { userId, revokedAt: null }, select: { device: true } })
  const counts: Record<EngagePlatform, number> = { linkedin: 0, x: 0, reddit: 0 }
  for (const t of tokens) counts[tokenPlatform(t.device)] += 1
  return counts
})
