// POST /api/cta/suggest { about? } → { lines } — "Write with AI" in My CTA:
// three CTA lines written from the creator's profile (lib/ai/ctaWriter.ts).
// Free, with a generous hourly cap.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import { CtaWriterError, suggestCtaLines } from "@/lib/ai/ctaWriter"

export const maxDuration = 60

const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, "1 h"), analytics: false })

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { success } = await ratelimit.limit(`cta:suggest:${user.id}`)
  if (!success) return NextResponse.json({ error: "That's a lot of suggestions for one hour. Try again a little later." }, { status: 429 })
  const body = (await req.json().catch(() => null)) as { about?: unknown; name?: unknown } | null
  const about = typeof body?.about === "string" ? body.about.slice(0, 400) : ""
  // The name typed on the form wins over the profile's (it's the one drawn).
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : (user.profile?.name ?? "")
  try {
    const lines = await suggestCtaLines(
      {
        name,
        headline: user.profile?.headline,
        industry: user.profile?.industry,
        targetAudience: user.profile?.targetAudience,
        contentPillars: user.profile?.contentPillars ?? [],
        writingStyle: user.profile?.writingStyle,
      },
      about,
    )
    return NextResponse.json({ lines })
  } catch (err) {
    if (err instanceof CtaWriterError) return NextResponse.json({ error: err.message }, { status: 422 })
    console.error("[cta/suggest] failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "The AI couldn't write just now. Try again in a minute." }, { status: 502 })
  }
}
