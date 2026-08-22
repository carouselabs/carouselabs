import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { hasGenerationBalance } from "@/lib/credits"
import { chargeCreditsForAction } from "@/lib/chargeCredits"
import { refundCreditsForAction } from "@/lib/refundCredits"
import { validateReferenceImage } from "@/lib/validateImage"
import type { Prisma } from "@prisma/client"

export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Image generation costs real OpenAI money per call.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, "1 h"),
  analytics: false,
})

interface ThumbnailBlueprint {
  canvasFormat: string
  mainSubject: string
  secondarySubject: string
  subjectPositions: string
  emotion: string
  importantObjects: string
  background: string
  lighting: string
  colorPalette: string
  contrast: string
  text: string
  textPlacement: string
  visualEffects: string
  focalPoint: string
  storyBeingCommunicated: string
}

interface UploadedAsset {
  base64: string
  mediaType: string
  label: string
}

function isValidBlueprint(val: unknown): val is ThumbnailBlueprint {
  if (typeof val !== "object" || val === null) return false
  const keys: (keyof ThumbnailBlueprint)[] = [
    "canvasFormat",
    "mainSubject",
    "secondarySubject",
    "subjectPositions",
    "emotion",
    "importantObjects",
    "background",
    "lighting",
    "colorPalette",
    "contrast",
    "text",
    "textPlacement",
    "visualEffects",
    "focalPoint",
    "storyBeingCommunicated",
  ]
  return keys.every((k) => typeof (val as Record<string, unknown>)[k] === "string")
}

// Turns the finalized blueprint into descriptive prompt language for
// gpt-image-2. Mirrors the STYLE REFERENCE fidelity contract used by the
// other image-generation routes so typography/color match the reference.
function buildThumbnailImagePrompt(blueprint: ThumbnailBlueprint, uploadedAssets: UploadedAsset[]): string {
  const assetLines = uploadedAssets.length
    ? `\n\nADDITIONAL UPLOADED ASSETS (described, not directly attached — represent their described content faithfully in the appropriate position):\n${uploadedAssets
        .map((a) => `- ${a.label}`)
        .join("\n")}`
    : ""

  return `Create a YouTube thumbnail image (${blueprint.canvasFormat}).

MAIN SUBJECT: ${blueprint.mainSubject}
SECONDARY SUBJECT: ${blueprint.secondarySubject}
SUBJECT POSITIONS: ${blueprint.subjectPositions}
EMOTION / FACIAL EXPRESSION: ${blueprint.emotion}
IMPORTANT OBJECTS: ${blueprint.importantObjects}
BACKGROUND: ${blueprint.background}
LIGHTING: ${blueprint.lighting}
COLOR PALETTE: ${blueprint.colorPalette}
CONTRAST: ${blueprint.contrast}
TEXT ON THUMBNAIL: ${blueprint.text}
TEXT PLACEMENT: ${blueprint.textPlacement}
VISUAL EFFECTS: ${blueprint.visualEffects}
FOCAL POINT: ${blueprint.focalPoint}
STORY BEING COMMUNICATED: ${blueprint.storyBeingCommunicated}${assetLines}

The attached image is a style reference only — a YouTube thumbnail whose composition, subject placement, visual hierarchy, emotional intensity, lighting, color relationships, contrast, and typography treatment you should match. Do NOT copy its literal subjects, text content, logos, or specific scene — build an entirely new thumbnail using the fields above, adapted to fit the reference's visual structure and design language. Reproduce the reference's headline text styling (weight, casing, emphasis technique, color) for the new text specified above. High click-through-rate design, mobile-readable at small size, bold and clear.`
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`thumbnail:generate:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  if (!(await hasGenerationBalance(user.id))) {
    return NextResponse.json({ error: "You're out of credits." }, { status: 402 })
  }

  let blueprint: ThumbnailBlueprint
  let referenceImageBase64: string
  let referenceImageMediaType: string
  let uploadedAssets: UploadedAsset[]

  try {
    const body = await req.json()
    if (!isValidBlueprint(body.blueprint)) throw new Error("Missing or invalid blueprint")
    blueprint = body.blueprint
    referenceImageBase64 = typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : ""
    referenceImageMediaType =
      typeof body.referenceImageMediaType === "string" ? body.referenceImageMediaType : "image/jpeg"
    if (!referenceImageBase64) throw new Error("Missing referenceImageBase64")
    uploadedAssets = Array.isArray(body.uploadedAssets)
      ? body.uploadedAssets.filter(
          (a: unknown): a is UploadedAsset =>
            typeof a === "object" &&
            a !== null &&
            typeof (a as UploadedAsset).base64 === "string" &&
            typeof (a as UploadedAsset).label === "string",
        )
      : []
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const refCheck = validateReferenceImage(referenceImageBase64, referenceImageMediaType)
  if (!refCheck.ok) {
    return NextResponse.json({ error: refCheck.error }, { status: 400 })
  }
  referenceImageBase64 = refCheck.data
  referenceImageMediaType = refCheck.mediaType

  // ── Server-side credit charge (charged FIRST, before any generation spend) ──
  const charge = await chargeCreditsForAction(user, "thumbnail")
  if (!charge.ok) {
    return NextResponse.json(
      { error: "Insufficient credits", requiresUpgrade: charge.requiresUpgrade },
      { status: 402 },
    )
  }

  const prompt = buildThumbnailImagePrompt(blueprint, uploadedAssets)

  // 1280x720 (16:9) isn't a supported gpt-image-2 size — 1536x1024 is the
  // closest supported size that keeps a landscape (wide) aspect ratio.
  const openaiSize = "1536x1024" as const

  let imageB64: string
  try {
    const editPrompt = `${prompt}\n\nKeep the same background tone as the reference — a light reference background stays light, a dark one stays dark. Keep the same headline text color, font style (weight, width, casing), and accent color proportions as the reference. Reproduce the reference's headline emphasis technique (highlighter swipe, color block, underline, or colored word) in the same color the reference uses. Sample the background tone, text colors, and accent colors directly from the reference image. Match its illustration and rendering style. Create a completely new composition; do not copy its literal content, layout, or text. Wherever the reference shows a logo, wordmark, or watermark, render clean empty background instead — zero logos and zero brand names on the finished image; the only text is the text specified in this prompt.`

    const imageResponse = await openai.images.edit({
      model: "gpt-image-2",
      image: await toFile(
        Buffer.from(referenceImageBase64, "base64"),
        referenceImageMediaType === "image/png" ? "reference.png" : "reference.jpg",
        { type: referenceImageMediaType || "image/jpeg" },
      ),
      prompt: editPrompt,
      n: 1,
      size: openaiSize,
      quality: "medium",
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (imageResponse as any).data as Array<{ b64_json?: string }> | undefined
    const b64 = data?.[0]?.b64_json
    if (!b64) throw new Error("No image data returned")
    imageB64 = b64
  } catch (err) {
    console.error("[thumbnail/generate] OpenAI error:", err)
    await refundCreditsForAction(user.id, "thumbnail")
    return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 502 })
  }

  // Re-encode with sharp to strip C2PA/content-credentials metadata (and any
  // EXIF/XMP/ICC) — same treatment as the other image-generation routes.
  let cleanedB64: string
  try {
    const cleanedBuffer = await sharp(Buffer.from(imageB64, "base64")).png().toBuffer()
    cleanedB64 = cleanedBuffer.toString("base64")
  } catch (err) {
    console.error("[thumbnail/generate] sharp re-encode error:", err)
    await refundCreditsForAction(user.id, "thumbnail")
    return NextResponse.json({ error: "Failed to process image" }, { status: 502 })
  }

  const filename = `thumbnails/${user.id}/${Date.now()}.png`
  let imageUrl: string
  try {
    imageUrl = await uploadToR2(cleanedB64, filename)
  } catch (err) {
    console.error("[thumbnail/generate] R2 upload error:", err)
    await refundCreditsForAction(user.id, "thumbnail")
    return NextResponse.json({ error: "Failed to store image" }, { status: 502 })
  }

  const post = await db.post.create({
    data: {
      userId: user.id,
      title: blueprint.storyBeingCommunicated || "Thumbnail",
      format: "THUMBNAIL",
      status: "READY",
      imageUrls: [imageUrl],
      r2Keys: [filename],
      metadata: { blueprint, prompt } as unknown as Prisma.InputJsonValue,
      slides: {
        create: {
          role: "COVER",
          order: 0,
          headline: blueprint.text,
          imageUrl,
          r2Key: filename,
        },
      },
    },
  })

  return NextResponse.json({ imageUrl, postId: post.id })
}
