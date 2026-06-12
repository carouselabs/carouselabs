import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import OpenAI from "openai"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface SlideInput {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  prompt: string
}

// Carousel slide roles map onto the Slide.role enum stored in the DB.
const ROLE_TO_SLIDE_ROLE = {
  hook: "COVER",
  body: "CONTENT",
  cta: "CTA",
} as const

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let slides: SlideInput[]
  let size: string
  let ideaId: string
  let persist: boolean

  try {
    const body = await req.json()
    slides = Array.isArray(body.slides) ? body.slides : []
    ideaId = body.ideaId
    // Only 4:5 and 1:1 are offered; default to 4:5 (LinkedIn feed).
    size = body.size === "1:1" ? "1:1" : "4:5"
    // Persist a Post by default; single-slide regenerations pass persist:false so
    // they don't spawn a junk Post for every regeneration.
    persist = body.persist !== false
    if (!ideaId) throw new Error("Missing ideaId")
    if (slides.length === 0) throw new Error("No slides provided")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  const openaiSize: "1024x1024" | "1024x1280" =
    size === "4:5" ? "1024x1280" : "1024x1024"

  // Generate sequentially (NOT in parallel) so we don't trip OpenAI image rate
  // limits. gpt-image-2 returns base64 (b64_json), never a URL, so each slide is
  // uploaded to R2 individually before its URL is returned.
  const result: {
    slideNumber: number
    imageUrl: string
    filename: string
    headline: string
    role: "hook" | "body" | "cta"
  }[] = []

  try {
    for (const slide of slides) {
      const imageResponse = await openai.images.generate({
        model: "gpt-image-2",
        prompt: slide.prompt,
        n: 1,
        size: openaiSize,
        quality: "medium", // medium quality keeps carousel generation cheaper/faster
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (imageResponse as any).data as Array<{ b64_json?: string }> | undefined
      const b64 = data?.[0]?.b64_json
      if (!b64) throw new Error(`No image data for slide ${slide.slideNumber}`)

      const filename = `carousel/${user.id}/${ideaId}/${Date.now()}-slide-${slide.slideNumber}.png`
      const imageUrl = await uploadToR2(b64, filename)

      result.push({
        slideNumber: slide.slideNumber,
        imageUrl,
        filename,
        headline: slide.headline,
        role: slide.role,
      })
    }
  } catch (err) {
    console.error("[generate/carousel-images] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate slide images" },
      { status: 502 },
    )
  }

  // Persist the full carousel as one Post with a child Slide per image.
  // Best-effort: if the DB write fails we still return the generated images so the
  // user doesn't lose what they paid to generate.
  let postId: string | null = null
  if (persist) {
    try {
      const post = await db.post.create({
        data: {
          userId: user.id,
          ideaId,
          title: idea.hook,
          caption: "",
          format: "CAROUSEL",
          status: "READY",
          imageUrls: result.map((s) => s.imageUrl),
          r2Keys: result.map((s) => s.filename),
          slides: {
            create: result.map((s) => ({
              role: ROLE_TO_SLIDE_ROLE[s.role] ?? "CONTENT",
              order: s.slideNumber,
              headline: s.headline,
              imageUrl: s.imageUrl,
              r2Key: s.filename,
            })),
          },
        },
      })
      postId = post.id
    } catch (err) {
      console.error("[generate/carousel-images] Post persist failed:", err)
    }
  }

  return NextResponse.json({ slides: result, postId })
}
