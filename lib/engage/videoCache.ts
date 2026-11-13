// lib/engage/videoCache.ts — a watched video, remembered for VIDEO_CACHE_DAYS
// (app/api/ext/video): the same person asking for the same video again (a
// regenerate after reopening the panel, the post opened again, a reply on it)
// gets what was watched before, at once, with no download, no ffmpeg and no
// speech-to-text to pay for, and without counting toward the day's videos.
//
// Kept per person: the stills and what's said come from a video that person
// could open. Keyed by the video itself, not by its address: LinkedIn's
// addresses carry a signature that changes, and one video comes in several
// sizes (mp4-360p, mp4-720p), all under one media id.
//
// Upstash Redis, like the request limits. Best effort both ways: a cache
// that can't be read or written means the video is watched as before.
import { Redis } from "@upstash/redis"

export const VIDEO_CACHE_DAYS = 30

export interface CachedVideo {
  frames: string[]
  transcript: string
  seconds: number | null
}

let redis: Redis | null = null
function client(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  redis ??= Redis.fromEnv()
  return redis
}

// The video's media id (".../playlist/vid/v2/<id>/mp4-360p-.../..."), else
// its address without the signature.
export function videoId(url: string): string {
  const parsed = new URL(url)
  const media = /\/vid\/(?:v2\/)?([A-Za-z0-9_-]{10,})\//.exec(parsed.pathname)
  return media ? media[1] : `${parsed.hostname}${parsed.pathname}`
}

export function videoCacheKey(userId: string, url: string): string {
  return `ext-video:v1:${userId}:${videoId(url)}`
}

function isCachedVideo(value: unknown): value is CachedVideo {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.frames) &&
    v.frames.every((f) => typeof f === "string") &&
    typeof v.transcript === "string" &&
    (v.seconds === null || typeof v.seconds === "number")
  )
}

export async function cachedVideo(key: string): Promise<CachedVideo | null> {
  try {
    const value = await client()?.get<unknown>(key)
    return isCachedVideo(value) ? value : null
  } catch (err) {
    console.warn(`[engage/videoCache] couldn't read: ${err instanceof Error ? err.message : "failed"}`)
    return null
  }
}

export async function rememberVideo(key: string, video: CachedVideo): Promise<void> {
  try {
    await client()?.set(key, video, { ex: VIDEO_CACHE_DAYS * 24 * 60 * 60 })
  } catch (err) {
    console.warn(`[engage/videoCache] couldn't keep: ${err instanceof Error ? err.message : "failed"}`)
  }
}
