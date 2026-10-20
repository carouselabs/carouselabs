// POST /api/admin/email-writer/paint — paints the art for an AI-written email
// (lib/emailArt.tsx), new each time, after the admin approved the idea.
//   { kind: "scene", scene }                       → { url }  the bare painting
//   { kind: "headline", paintingUrl, lead, accent } → { url }  painting + headline (the hero)
//   { kind: "sticker", idea }                      → { url }  a cut-out sticker
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { isOurArt, paintHeroScene, paintSticker, setHeadline } from "@/lib/emailArt"

// A painting takes the image model up to a minute or two.
export const maxDuration = 300

// Each painting costs money: a ceiling so a stuck button or a bug can't run up the bill.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  analytics: false,
})

const body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scene"), scene: z.string().trim().min(5).max(300) }),
  z.object({
    kind: z.literal("headline"),
    paintingUrl: z.string().max(500).refine(isOurArt, { message: "That painting isn't one of ours" }),
    lead: z.string().trim().min(1).max(40),
    accent: z.string().trim().min(1).max(40),
  }),
  z.object({ kind: z.literal("sticker"), idea: z.string().trim().min(2).max(120) }),
])

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })
  }
  // Setting a headline reuses a painting and costs nothing, so it isn't counted.
  if (parsed.data.kind !== "headline") {
    const { success } = await ratelimit.limit(`admin:email-art:${admin.id}`)
    if (!success) {
      return NextResponse.json({ error: "That's 60 paintings in the last hour. Give it a little while." }, { status: 429 })
    }
  }
  try {
    const job = parsed.data
    const url =
      job.kind === "scene"
        ? await paintHeroScene(job.scene)
        : job.kind === "headline"
          ? await setHeadline(job.paintingUrl, job.lead, job.accent)
          : await paintSticker(job.idea)
    return NextResponse.json({ url })
  } catch (err) {
    console.error("[email-writer] painting failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Couldn't paint that one. Try again, or describe it differently." }, { status: 502 })
  }
}
