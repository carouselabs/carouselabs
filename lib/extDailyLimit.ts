// lib/extDailyLimit.ts — one daily cap on AI generations requested by the
// browser extension, shared by every route that calls a model for it
// (generate, rewrite, connection-note, message, profiles/test). Replaces the
// old per-route hourly limits: a user can generate in bursts, but not more
// than this many in any 24 hours, across all features combined.
//
// Independent of COMMENT_CREDITS_ENFORCED, so while credits are off for
// testing this is still the brake on model spend (~450 × ~$0.002 per user
// per day at current prices).
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export const EXT_DAILY_GENERATION_LIMIT = 450

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(EXT_DAILY_GENERATION_LIMIT, "1 d"),
  prefix: "ext-daily",
  analytics: false,
})

// null when the request may go ahead; otherwise the 429 to return. Counts the
// request, so call it once per model-backed request, before the model call.
export async function extDailyLimitResponse(userId: string): Promise<NextResponse | null> {
  const { success } = await limiter.limit(`user:${userId}`)
  if (success) return null
  return NextResponse.json(
    {
      error: `You've reached today's limit of ${EXT_DAILY_GENERATION_LIMIT} generations. It frees up gradually over the next 24 hours.`,
    },
    { status: 429 },
  )
}
