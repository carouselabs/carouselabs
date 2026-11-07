// /api/cta/photo — the creator's photo for every CTA ("this is me").
//   POST (form: file)                         → { photoUrl } an uploaded photo
//   POST { source: "linkedin" | "startPage" } → { photoUrl } copied from there
//   DELETE                                    → { ok }
// Saved square, upright and small (lib/creatorCtaStore.ts) under R2 cta/<user>/.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import { CtaError, PHOTO_MAX_BYTES, importCtaPhoto, removeCtaPhoto, setCtaPhoto } from "@/lib/creatorCtaStore"

export const maxDuration = 60

const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(30, "1 h"), analytics: false })

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { success } = await ratelimit.limit(`cta:photo:${user.id}`)
  if (!success) return NextResponse.json({ error: "Too many photo changes. Try again in a while." }, { status: 429 })
  try {
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      const body = (await req.json().catch(() => null)) as { source?: unknown } | null
      if (body?.source !== "linkedin" && body?.source !== "startPage") return NextResponse.json({ error: "Say where the photo comes from" }, { status: 400 })
      return NextResponse.json({ photoUrl: await importCtaPhoto(user.id, body.source) })
    }
    const form = await req.formData().catch(() => null)
    const file = form?.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo" }, { status: 400 })
    if (file.size > PHOTO_MAX_BYTES) return NextResponse.json({ error: "That photo is over 8 MB. Use a smaller one." }, { status: 413 })
    return NextResponse.json({ photoUrl: await setCtaPhoto(user.id, Buffer.from(await file.arrayBuffer())) })
  } catch (err) {
    if (err instanceof CtaError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    await removeCtaPhoto(user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof CtaError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
