import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import OpenAI, { toFile } from "openai"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { notifyFirstPostIfFirst } from "@/lib/email"
import { hasGenerationBalance } from "@/lib/credits"
import { validateReferenceImage } from "@/lib/validateImage"

export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Carousel image generation doesn't consume a credit but costs real OpenAI
// money per slide, so cap regenerations at 20/hour per user.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: false,
})

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

// Appended to EVERY slide prompt when a reference image is attached. Each slide
// is a separate gpt-image-2 call, so cross-slide consistency (especially
// typography) depends on every call carrying this exact same style contract.
const REFERENCE_STYLE_BLOCK = `Use the uploaded reference image ONLY as a style reference.

Extract ONLY:
- Premium editorial SaaS aesthetic
- Typography treatment: match the reference's exact font style, weight, letter spacing, and casing — every slide in this carousel must use the same typography as the reference (if the reference uses bold condensed uppercase headlines, so does every slide)
- Text colors exactly as in the reference: if headlines are near-black with one accent-colored word, reproduce that exact treatment — never recolor all text with the accent color
- Headline emphasis technique exactly as in the reference: highlighter swipe, color block, underline, or colored word — same technique, same color as the reference
- Background treatment exactly as in the reference: if it is white or light with colored accents, keep it white or light — never flood the slide with the accent color; accents stay accents
- If any color value written in this brief differs from the reference image's actual palette, follow the reference image — sample background tone, text colors, and accent colors directly from it
- Visual hierarchy
- Spacious layout
- White-space usage
- Premium editorial illustration style
- Soft lighting
- Rounded corners
- Subtle shadows
- Premium product marketing quality
- Color relationships exactly as seen in the reference, including lighter and darker shades of the same color family

DO NOT copy:
- Layout
- Composition
- Illustrations
- Icons
- Graphics
- Text
- Workflow
- Marketing message
- Positioning
- Any identifiable visual element

Everything must be completely original while maintaining the same premium editorial design language. Wherever the reference shows a logo, wordmark, watermark, or app name (typically in a corner), render clean empty background in that area instead — the finished slide contains zero logos and zero brand names. The only text on the slide is the text specified in this brief.`

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`generate:carousel-images:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  // Carousels are Pro-only. Defense-in-depth: the carousel page and FormatPicker
  // already gate this, but block it at the API too.
  if ((user.subscription?.plan ?? "FREE") === "FREE") {
    return NextResponse.json(
      { error: "Carousel generation requires Pro plan", requiresUpgrade: true },
      { status: 403 },
    )
  }

  // Defense-in-depth: credits are consumed via /api/credits/consume before the
  // client calls this route — but a drained PRO balance is still blocked here.
  if (!(await hasGenerationBalance(user.id))) {
    return NextResponse.json({ error: "You're out of credits." }, { status: 402 })
  }

  let slides: SlideInput[]
  let size: string
  let ideaId: string
  let persist: boolean
  let persistOnly: boolean
  let userInstruction: string | undefined
  let referenceImageBase64: string | undefined
  let referenceMediaType: string

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
    // Optional per-slide custom instruction, applied on top of the slide prompt
    // when regenerating a single slide's image.
    userInstruction =
      typeof body.userInstruction === "string" && body.userInstruction.trim()
        ? body.userInstruction.trim()
        : undefined
    // Optional style reference — when present, slides are generated with
    // images.edit so gpt-image-2 sees the reference alongside the prompt.
    referenceImageBase64 =
      typeof body.referenceImage === "string" ? body.referenceImage : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"
    if (!ideaId) throw new Error("Missing ideaId")
    if (slides.length === 0) throw new Error("No slides provided")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // Validate the reference image (size / type / magic bytes) before it reaches
  // OpenAI. Replaces the client-supplied values with the cleaned, verified ones.
  if (referenceImageBase64) {
    const check = validateReferenceImage(referenceImageBase64, referenceMediaType)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }
    referenceImageBase64 = check.data
    referenceMediaType = check.mediaType
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
      try {
        await notifyFirstPostIfFirst(user.id, user.email, user.profile?.name ?? "")
      } catch (err) {
        console.error("[generate/carousel-images] first-post email failed:", err)
      }
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
    // Build the reference file ONCE (not per slide) — every slide's edit call
    // reuses the same uploaded style reference.
    const referenceFile = referenceImageBase64
      ? await toFile(
          Buffer.from(
            referenceImageBase64.replace(/^data:image\/\w+;base64,/, ""),
            "base64",
          ),
          referenceMediaType === "image/png" ? "reference.png" : "reference.jpg",
          { type: referenceMediaType || "image/jpeg" },
        )
      : null

    for (const slide of slides) {
      // Safety net: strip authoring scaffolding so gpt-image-2 receives clean
      // prose. Handles both the newer markdown-structured prompts (## section
      // headers, ━━━ separator lines, **bold**) and the legacy " || "-separated
      // labeled segments (STYLE: || ... CANVAS: || ...).
      const cleanPrompt = (slide.prompt ?? "")
        .replace(/^#+\s+.*$/gm, "") // remove ## Section headers
        .replace(/^━+\s*$/gm, "") // remove separator lines
        .replace(/\*\*/g, "") // remove bold markdown markers
        .replace(/•\s*/g, "") // remove bullet points
        .replace(/\b[A-Z][A-Z\s]*:\s*\|\|\s*/g, "")
        .replace(/\s*\|\|\s*/g, " ")
        .replace(/\n{3,}/g, "\n\n") // collapse excessive newlines
        .trim()

      // Layer the user's custom instruction on top of the slide prompt so a
      // single-slide regeneration applies the requested change (e.g. "make the
      // background darker") while keeping the rest of the slide intact.
      const withInstruction = userInstruction
        ? `${cleanPrompt}\n\nADDITIONAL INSTRUCTION: ${userInstruction}`
        : cleanPrompt

      // images.edit transforms the reference too literally by default: it will
      // copy text/logos it sees and drift on typography between slides. The
      // shared style block pins down exactly how the reference may be used.
      // Without a reference there is no shared visual anchor at all, so a
      // consistency reminder rides along with every slide instead.
      const finalPrompt = referenceFile
        ? `${withInstruction}\n\n${REFERENCE_STYLE_BLOCK}`
        : `${withInstruction}\n\nThis slide belongs to a multi-slide carousel that must read as one designed set. Follow the typography, color palette, illustration style, lighting, and layout treatment specified in this brief exactly — same fonts, same colors, same rendering style as every other slide in the set. Premium, modern, editorial design quality throughout. No logos, watermarks, or brand names; the only text on the slide is the text specified in this brief.`

      // With a style reference, use images.edit so gpt-image-2 receives the
      // reference image itself alongside the prompt; otherwise plain generate.
      const imageResponse = referenceFile
        ? await openai.images.edit({
            model: "gpt-image-2",
            image: referenceFile,
            prompt: finalPrompt,
            n: 1,
            size: openaiSize,
            quality: "medium",
          })
        : await openai.images.generate({
            model: "gpt-image-2",
            prompt: finalPrompt,
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
      try {
        await notifyFirstPostIfFirst(user.id, user.email, user.profile?.name ?? "")
      } catch (emailErr) {
        console.error("[generate/carousel-images] first-post email failed:", emailErr)
      }
    } catch (err) {
      console.error("[generate/carousel-images] Post persist failed:", err)
    }
  }

  return NextResponse.json({ slides: result, postId })
}
