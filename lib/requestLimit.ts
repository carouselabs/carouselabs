import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

const limits = new Map<string, Ratelimit>()
/** Shared Redis limits across server instances; unavailable storage fails closed. */
export async function requestLimit(scope: "winner" | "suggestions", userId: string): Promise<NextResponse | null> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error("Rate limit unavailable")
    let limiter = limits.get(scope)
    if (!limiter) {
      limiter = new Ratelimit({ redis: Redis.fromEnv(), prefix: "website:" + scope,
        limiter: scope === "winner" ? Ratelimit.slidingWindow(1, "1 d") : Ratelimit.slidingWindow(10, "1 m"),
        analytics: false, timeout: 3000 })
      limits.set(scope, limiter)
    }
    const result = await limiter.limit(userId)
    if (result.reason === "timeout") throw new Error("Rate limit timeout")
    if (!result.success) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) } })
    return null
  } catch {
    return NextResponse.json({ error: "This service is temporarily unavailable. Please try again." }, { status: 503 })
  }
}
