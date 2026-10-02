// lib/extDailyLimit.ts — one daily cap on AI generations requested by the
// browser extension, shared by every route that calls a model for it
// (generate, rewrite, connection-note, message, profiles/test). Replaces the
// old per-route hourly limits: a user can generate in bursts, but not more
// than this many in any 24 hours, across all features combined.
//
// This is the fair-use brake behind the "unlimited" $15/month plan
// (lib/extAccess.ts), so it applies to subscribers too. It is worded to the
// user as a cooldown rather than a quota, and is independent of
// COMMENT_CREDITS_ENFORCED, so it stays active while the paywall is off for
// testing.
//
// An admin can give one user a different cap, or none (lib/engage/access.ts).
// Every cap counts in the same Redis window, so changing a user's cap takes
// effect on their next request with nothing reset.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { PLAN_DAILY_CAP, type Limit } from "@/lib/engage/features"

export const EXT_DAILY_GENERATION_LIMIT = PLAN_DAILY_CAP

const redis = Redis.fromEnv()
const limiters = new Map<number, Ratelimit>()

function limiterFor(limit: number): Ratelimit {
  let limiter = limiters.get(limit)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "1 d"),
      prefix: "ext-daily",
      analytics: false,
    })
    limiters.set(limit, limiter)
  }
  return limiter
}

const identifier = (userId: string) => `user:${userId}`

// null when the request may go ahead; otherwise the 429 to return. Counts the
// request, so call it once per model-backed request, before the model call.
export async function extDailyLimitResponse(
  userId: string,
  limit: Limit = EXT_DAILY_GENERATION_LIMIT,
): Promise<NextResponse | null> {
  if (limit === "unlimited") return null
  const { success } = limit > 0 ? await limiterFor(limit).limit(identifier(userId)) : { success: false }
  if (success) return null
  return NextResponse.json(
    {
      error:
        "You've been generating a lot today, so we've paused things for a bit to keep your LinkedIn account safe. You can generate again later — it comes back gradually over the next 24 hours.",
      cooldown: true,
    },
    { status: 429 },
  )
}

// Clears a user's rolling 24-hour count (an admin "reset usage").
export async function resetExtDailyLimit(userId: string): Promise<void> {
  await limiterFor(EXT_DAILY_GENERATION_LIMIT).resetUsedTokens(identifier(userId))
}
