// app/api/content-hub/custom-post/route.ts
// POST — save the user's own content (written or designed outside
// CarouseLabs) as a real Post record. No AI generation step and no credit
// charge — this is just persisting content the user already made elsewhere so
// it can flow through the same scheduling/drafts/calendar/history systems as
// generated content. Scheduling itself happens afterward, one call per
// selected platform to POST /api/content-hub/scheduled (see
// app/(app)/content-hub/_client.tsx's handleSchedule).
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isValidPlatform } from "@/lib/platforms"
import type { Prisma } from "@prisma/client"

const MAX_IMAGES = 6

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let caption: string
  let platformCaptions: Record<string, string> | undefined
  let imageUrls: string[]
  let platforms: string[]

  try {
    const body = await req.json()

    caption = typeof body.caption === "string" ? body.caption.trim() : ""

    imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((u: unknown): u is string => typeof u === "string")
      : []
    if (imageUrls.length > MAX_IMAGES) throw new Error(`Attach at most ${MAX_IMAGES} images`)
    // Every image must be one WE uploaded (see custom-post/upload/route.ts) —
    // never accept an arbitrary client-supplied URL that would then be
    // embedded in the user's own scheduled/published post.
    const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_URL
    if (publicBase && imageUrls.some((u) => !u.startsWith(publicBase))) {
      throw new Error("Invalid image URL")
    }

    if (!caption && imageUrls.length === 0) throw new Error("Add a caption or at least one image")

    if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
      throw new Error("Pick at least one platform")
    }
    if (!body.platforms.every(isValidPlatform)) throw new Error("Unsupported platform")
    platforms = body.platforms

    if (body.platformCaptions && typeof body.platformCaptions === "object") {
      const cleaned: Record<string, string> = {}
      for (const [key, value] of Object.entries(body.platformCaptions as Record<string, unknown>)) {
        if (isValidPlatform(key) && typeof value === "string" && value.trim()) {
          cleaned[key] = value.trim()
        }
      }
      if (Object.keys(cleaned).length > 0) platformCaptions = cleaned
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const post = await db.post.create({
    data: {
      userId: user.id,
      title: caption ? caption.slice(0, 80) : "Custom post",
      caption: caption || null,
      format: "CUSTOM",
      status: "READY",
      imageUrls,
      r2Keys: [],
      // Per-platform caption overrides live here rather than as a dedicated
      // column — same pattern as the image route's imagePrompt/size metadata.
      // `platforms` is stored too so the picker/history views can show which
      // platforms this post was authored for even before it's scheduled.
      metadata: { platforms, ...(platformCaptions ? { platformCaptions } : {}) } as unknown as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({ postId: post.id })
}
