import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import OpenAI from "openai"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"

export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface SlideInput {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  // Present in generation mode (the prompt to render); absent in persistOnly
  // mode, where the already-generated image URL is sent instead.
  prompt?: string
  imageUrl?: string
}

// Carousel slide roles map onto the Slide.role enum stored in the DB.
const ROLE_TO_SLIDE_ROLE = {
  hook: "COVER",
  body: "CONTENT",
  cta: "CTA",
} as const

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let slides: SlideInput[]
  let size: string
  let ideaId: string
  let persist: boolean
  let persistOnly: boolean

  try {
    const body = await req.json()
    slides = Array.isArray(body.slides) ? body.slides : []
    ideaId = body.ideaId
    // Only 4:5 and 1:1 are offered; default to 4:5 (LinkedIn feed).
    size = body.size === "1:1" ? "1:1" : "4:5"
    // Persist a Post by default; single-slide regenerations pass persist:false so
    // they don't spawn a junk Post for every regeneration.
    persist = body.persist !== false
    // persistOnly: skip all OpenAI calls — just save the already-generated images.
    persistOnly = body.persistOnly === true
    if (!ideaId) throw new Error("Missing ideaId")
    if (slides.length === 0) throw new Error("No slides provided")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  // persistOnly mode — no image generation. Create one Post + child Slides from
  // the imageUrls the client already generated (one-by-one) and return.
  if (persistOnly) {
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? ""
    const withUrls = slides.filter((s) => typeof s.imageUrl === "string" && s.imageUrl)
    if (withUrls.length === 0) {
      return NextResponse.json({ error: "No image URLs to persist" }, { status: 400 })
    }
    // Derive the R2 object key from the public URL (best-effort).
    const toKey = (url: string) => (publicUrl ? url.replace(`${publicUrl}/`, "") : url)

    try {
      const post = await db.post.create({
        data: {
          userId: user.id,
          ideaId,
          title: idea.hook,
          caption: "",
          format: "CAROUSEL",
          status: "READY",
          imageUrls: withUrls.map((s) => s.imageUrl as string),
          r2Keys: withUrls.map((s) => toKey(s.imageUrl as string)),
          slides: {
            create: withUrls.map((s) => ({
              role: ROLE_TO_SLIDE_ROLE[s.role] ?? "CONTENT",
              order: s.slideNumber,
              headline: s.headline,
              imageUrl: s.imageUrl as string,
              r2Key: toKey(s.imageUrl as string),
            })),
          },
        },
      })
      return NextResponse.json({ success: true, postId: post.id })
    } catch (err) {
      console.error("[generate/carousel-images] persistOnly failed:", err)
      return NextResponse.json({ error: "Failed to save carousel" }, { status: 502 })
    }
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
        prompt: slide.prompt ?? "",
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
