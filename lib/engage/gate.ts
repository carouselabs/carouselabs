// lib/engage/gate.ts — the one check every model-backed extension route makes
// (generate, rewrite, connection-note, message, profiles/test), in two steps:
//
//   engagePreflight     right after sign-in: the extension's version (when an
//                       admin set a minimum), suspension, the feature switch
//                       (paused for everyone, or off for this user), and the
//                       rolling daily cap (counts the request).
//   reserveEngageGeneration
//                       immediately before the model call: the feature
//                       switch again (the route may only now know which kind
//                       it is), per-feature day/month limits, then a free
//                       generation unless the user is unlimited. Returns
//                       release() to give everything back if generation fails.
//
// Everything is decided server-side from the database; nothing the extension
// sends or stores can unlock a feature or lift a limit.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { extDailyLimitResponse } from "@/lib/extDailyLimit"
import { onlyOnce, reserveExtGeneration, reserveFreeGeneration, type ExtGenerationGate } from "@/lib/extAccess"
import { isEngageSchemaMissing, loadEngageAccess } from "@/lib/engage/access"
import { blockedReason, featureLimitsFor, type EngageAccess } from "@/lib/engage/accessRules"
import { platformOfUsageKind, USAGE_KIND_NOUNS, type EngageUsageKind } from "@/lib/engage/features"
import { reserveUsage } from "@/lib/engage/usage"
import { outdatedExtensionResponse } from "@/lib/engage/settings"

// null access: the Engage admin tables aren't there yet (the code was deployed
// before scripts/engage-admin-schema.sql ran). Then only the plan rules apply,
// exactly as before the admin existed, rather than failing every request.
type LoadedAccess = { access: EngageAccess | null }

async function load(userId: string): Promise<LoadedAccess | NextResponse> {
  try {
    const access = await loadEngageAccess(userId)
    if (!access) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
    return { access }
  } catch (err) {
    if (!isEngageSchemaMissing(err)) throw err
    console.error("[engage/gate] Engage admin tables missing — run scripts/engage-admin-schema.sql. Using plan rules only.")
    return { access: null }
  }
}

export interface Preflight {
  response: NextResponse | null
  loaded: LoadedAccess | null
}

// kind null: the route doesn't know yet which feature this is (generate,
// before reading whether it's a comment or a reply); the switch is then
// checked in reserveEngageGeneration. req: the extension's request, for its
// version (admin → Engage → Controls → minimum version).
export async function engagePreflight(userId: string, kind: EngageUsageKind | null, req: Request): Promise<Preflight> {
  const outdated = await outdatedExtensionResponse(req)
  if (outdated) return { response: outdated, loaded: null }

  const loaded = await load(userId)
  if (loaded instanceof NextResponse) return { response: loaded, loaded: null }

  if (loaded.access) {
    const blocked = blockedReason(loaded.access, kind)
    if (blocked) {
      return { response: NextResponse.json({ error: blocked.error, code: blocked.code }, { status: blocked.status }), loaded }
    }
  }

  const cap = loaded.access?.limits.dailyCap.effective
  return { response: await extDailyLimitResponse(userId, cap), loaded }
}

export async function reserveEngageGeneration(
  userId: string,
  kind: EngageUsageKind,
  preflight?: Preflight,
): Promise<ExtGenerationGate> {
  const loaded = preflight?.loaded ?? (await load(userId))
  if (loaded instanceof NextResponse) return { ok: false, response: loaded }

  const access = loaded.access
  // LinkedIn and X are sold separately: each has its own subscription and
  // its own free generations.
  const platform = platformOfUsageKind(kind)
  if (!access) return reserveExtGeneration(userId, platform)

  const blocked = blockedReason(access, kind)
  if (blocked) {
    return { ok: false, response: NextResponse.json({ error: blocked.error, code: blocked.code }, { status: blocked.status }) }
  }

  const usage = await reserveUsage(userId, kind, featureLimitsFor(access, kind))
  if (!usage.ok) {
    const when = usage.period === "day" ? "today" : "this month"
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `You've reached your limit of ${usage.limit} ${USAGE_KIND_NOUNS[kind]} ${when}.`,
          code: "limit_reached",
          period: usage.period,
        },
        { status: 429 },
      ),
    }
  }

  if (access.platforms[platform].access !== "free") {
    return { ok: true, freeRemaining: null, release: usage.release }
  }

  const free = await reserveFreeGeneration(userId, access.freeGenerations.effective, platform)
  if (!free.ok) {
    await usage.release()
    return free
  }
  return {
    ok: true,
    freeRemaining: free.freeRemaining,
    // At most once, like each part (a cancellation can be reported twice).
    release: onlyOnce(async () => {
      await Promise.all([free.release(), usage.release()])
    }),
  }
}

// Watching a post's video (app/api/ext/video) isn't a generation and uses
// none up, but it pays for a transcription. So: the same blocks as a comment
// (version, suspension, Comments off), nothing for an account with no
// comments left to write, and a daily cap of its own.
export const VIDEO_DAILY_CAP = 60
let videoLimiter: Ratelimit | null = null

// count false: a video this person already had watched (lib/engage/
// videoCache.ts): the same blocks apply, but it costs nothing and isn't
// counted toward the day's videos.
export async function engageVideoCheck(
  userId: string,
  req: Request,
  { count = true }: { count?: boolean } = {},
): Promise<NextResponse | null> {
  const outdated = await outdatedExtensionResponse(req)
  if (outdated) return outdated

  const loaded = await load(userId)
  if (loaded instanceof NextResponse) return loaded
  const access = loaded.access
  if (access) {
    const blocked = blockedReason(access, "comments")
    if (blocked) return NextResponse.json({ error: blocked.error, code: blocked.code }, { status: blocked.status })
    const paywall = access.platforms.linkedin
    if (paywall.access === "free" && (paywall.freeRemaining ?? 0) <= 0) {
      return NextResponse.json({ error: "No free comments left.", code: "no_free_left" }, { status: 403 })
    }
  }

  if (!count) return null
  videoLimiter ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(VIDEO_DAILY_CAP, "1 d"),
    prefix: "ext-video",
    analytics: false,
  })
  const { success } = await videoLimiter.limit(`user:${userId}`)
  return success
    ? null
    : NextResponse.json({ error: "That's a lot of videos today. Comments use their text and cover for now.", code: "video_limit" }, { status: 429 })
}
