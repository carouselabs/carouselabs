import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import OpenAI, { toFile } from "openai"
import Anthropic from "@anthropic-ai/sdk"
import sharp from "sharp"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { hasGenerationBalance } from "@/lib/credits"
import { chargeCreditsForAction } from "@/lib/chargeCredits"
import { refundCreditsForAction } from "@/lib/refundCredits"
import { validateReferenceImage } from "@/lib/validateImage"
import { THUMBNAIL_ASSET_DESCRIPTION_SYSTEM_PROMPT } from "@/lib/ai/prompts/thumbnailPrompt"
import type { Prisma } from "@prisma/client"

export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

function blueprintBlock(blueprint: ThumbnailBlueprint): string {
  return `CANVAS FORMAT: ${blueprint.canvasFormat}
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
STORY BEING COMMUNICATED: ${blueprint.storyBeingCommunicated}`
}

// No-replacement-assets path: gpt-image-2 edits the reference image directly,
// so the reference's own style AND subjects are both visible to the model —
// safe only when nothing needs to be swapped out.
function buildEditPrompt(blueprint: ThumbnailBlueprint): string {
  return `Create a YouTube thumbnail image (${blueprint.canvasFormat}).

${blueprintBlock(blueprint)}

The attached image is a style reference only — a YouTube thumbnail whose composition, subject placement, visual hierarchy, emotional intensity, lighting, color relationships, contrast, and typography treatment you should match. Do NOT copy its literal subjects, text content, logos, or specific scene — build an entirely new thumbnail using the fields above, adapted to fit the reference's visual structure and design language. Reproduce the reference's headline text styling (weight, casing, emphasis technique, color) for the new text specified above. High click-through-rate design, mobile-readable at small size, bold and clear.

Keep the same background tone as the reference — a light reference background stays light, a dark one stays dark. Keep the same headline text color, font style (weight, width, casing), and accent color proportions as the reference. Reproduce the reference's headline emphasis technique (highlighter swipe, color block, underline, or colored word) in the same color the reference uses. Sample the background tone, text colors, and accent colors directly from the reference image. Match its illustration and rendering style. Create a completely new composition; do not copy its literal content, layout, or text. Wherever the reference shows a logo, wordmark, or watermark, render clean empty background instead — zero logos and zero brand names on the finished image; the only text is the text specified in this prompt.`
}

// GPT-4o/Claude sometimes refuse the task outright instead of erroring. A real
// generation is JSON starting with "{" — refusal prose shows up at the very
// start of the response, so only the opening chunk is checked.
function isRefusal(text: string): boolean {
  const refusalPhrases = [
    "i'm sorry",
    "i cannot",
    "i can't assist",
    "i'm not able",
    "i won't",
    "i am unable",
    "i apologize",
    "not able to help",
    "can't help with",
  ]
  const opening = text.toLowerCase().trim().slice(0, 300)
  return refusalPhrases.some(
    (phrase) => opening.startsWith(phrase) || opening.includes(phrase),
  )
}

function parseDescribedPrompt(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()) return parsed.imagePrompt
  } catch {}

  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1))
      if (typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()) return parsed.imagePrompt
    }
  } catch {}

  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()) return parsed.imagePrompt
    }
  } catch {}

  const manual = raw.match(new RegExp(`"imagePrompt"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"`, "s"))
  if (manual) {
    try {
      return JSON.parse(`"${manual[1]}"`)
    } catch {
      return manual[1]
    }
  }

  return null
}

// Describes the reference's style + each uploaded replacement photo's REAL
// appearance in text, for a text-only images.generate() call downstream.
// GPT-4o primary, Claude Sonnet 4.5 fallback — same pattern as the chat route.
async function describeReplacementPrompt(
  blueprint: ThumbnailBlueprint,
  referenceImageBase64: string,
  referenceImageMediaType: string,
  uploadedAssets: UploadedAsset[],
): Promise<string> {
  const instructionText = `Thumbnail Blueprint (finalized):
${blueprintBlock(blueprint)}

Write the final image-generation prompt now, following the system instructions.`

  let raw = ""
  let usedFallback = false

  try {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text" as const, text: "REFERENCE THUMBNAIL (style reference only — do not copy its subjects):" },
      {
        type: "image_url" as const,
        image_url: {
          url: `data:${referenceImageMediaType};base64,${referenceImageBase64}`,
          detail: "high" as const,
        },
      },
      ...uploadedAssets.flatMap((asset) => [
        { type: "text" as const, text: `REPLACEMENT PHOTO for: ${asset.label}` },
        {
          type: "image_url" as const,
          image_url: {
            url: `data:${asset.mediaType};base64,${asset.base64}`,
            detail: "high" as const,
          },
        },
      ]),
      { type: "text" as const, text: instructionText },
    ]

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        { role: "system" as const, content: THUMBNAIL_ASSET_DESCRIPTION_SYSTEM_PROMPT },
        { role: "user" as const, content },
      ],
    })

    const gptRaw = response.choices[0]?.message?.content ?? ""
    if (isRefusal(gptRaw)) {
      console.warn("[thumbnail/generate] GPT-4o refused the describe step, falling back to Claude")
      usedFallback = true
    } else {
      raw = gptRaw
    }
  } catch (err) {
    const e = err as { message?: string }
    console.warn("[thumbnail/generate] GPT-4o describe-step error, falling back to Claude:", e?.message ?? err)
    usedFallback = true
  }

  if (usedFallback) {
    const claudeContent: Anthropic.MessageParam["content"] = [
      { type: "text" as const, text: "REFERENCE THUMBNAIL (style reference only — do not copy its subjects):" },
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: referenceImageMediaType as "image/jpeg" | "image/png" | "image/webp",
          data: referenceImageBase64,
        },
      },
      ...uploadedAssets.flatMap((asset) => [
        { type: "text" as const, text: `REPLACEMENT PHOTO for: ${asset.label}` },
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: asset.mediaType as "image/jpeg" | "image/png" | "image/webp",
            data: asset.base64,
          },
        },
      ]),
      { type: "text" as const, text: instructionText },
    ]

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: THUMBNAIL_ASSET_DESCRIPTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: claudeContent }],
    })

    raw = claudeResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
  }

  const parsed = parseDescribedPrompt(raw)
  if (!parsed) throw new Error("Failed to describe replacement assets")
  return parsed
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

  // Every uploaded asset is about to be sent to vision APIs (and potentially
  // gpt-image-2) — validate + clean each one, the same way the reference
  // image and the chat route's mid-conversation uploads are validated. This
  // request is independent of any earlier /api/thumbnail/chat calls, so the
  // client's bytes can't be trusted just because they were "already checked"
  // there.
  for (const asset of uploadedAssets) {
    const check = validateReferenceImage(asset.base64, asset.mediaType)
    if (!check.ok) {
      return NextResponse.json({ error: `${asset.label}: ${check.error}` }, { status: 400 })
    }
    asset.base64 = check.data
    asset.mediaType = check.mediaType
  }

  // ── Server-side credit charge (charged FIRST, before any generation spend) ──
  const charge = await chargeCreditsForAction(user, "thumbnail")
  if (!charge.ok) {
    return NextResponse.json(
      { error: "Insufficient credits", requiresUpgrade: charge.requiresUpgrade },
      { status: 402 },
    )
  }

  // 1280x720 (16:9) isn't a supported gpt-image-2 size — 1536x1024 is the
  // closest supported size that keeps a landscape (wide) aspect ratio.
  const openaiSize = "1536x1024" as const
  const hasReplacementAssets = uploadedAssets.length > 0

  let finalPrompt: string
  let imageB64: string
  try {
    if (hasReplacementAssets) {
      // gpt-image-2's images.edit() only accepts ONE base image. Editing the
      // ORIGINAL reference here would keep the reference's own person, since
      // the uploaded replacement photo would never actually reach the model —
      // this is the bug being fixed. Instead: describe the reference's style
      // AND the replacement photos' real appearance in text (a vision call
      // that DOES see all the images), then generate fresh from that text
      // alone via images.generate() — no reference attached, no risk of the
      // model falling back to what it's "editing".
      finalPrompt = await describeReplacementPrompt(
        blueprint,
        referenceImageBase64,
        referenceImageMediaType,
        uploadedAssets,
      )

      const imageResponse = await openai.images.generate({
        model: "gpt-image-2",
        prompt: finalPrompt,
        n: 1,
        size: openaiSize,
        quality: "medium",
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (imageResponse as any).data as Array<{ b64_json?: string }> | undefined
      const b64 = data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned")
      imageB64 = b64
    } else {
      // No replacement assets — the reference has nothing conflicting to
      // guard against, so editing it directly (previous behavior) is safe
      // and gives the strongest style fidelity.
      finalPrompt = buildEditPrompt(blueprint)

      const imageResponse = await openai.images.edit({
        model: "gpt-image-2",
        image: await toFile(
          Buffer.from(referenceImageBase64, "base64"),
          referenceImageMediaType === "image/png" ? "reference.png" : "reference.jpg",
          { type: referenceImageMediaType || "image/jpeg" },
        ),
        prompt: finalPrompt,
        n: 1,
        size: openaiSize,
        quality: "medium",
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (imageResponse as any).data as Array<{ b64_json?: string }> | undefined
      const b64 = data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned")
      imageB64 = b64
    }
  } catch (err) {
    console.error("[thumbnail/generate] generation error:", err)
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
      metadata: {
        blueprint,
        prompt: finalPrompt,
        generationMode: hasReplacementAssets ? "generate-with-described-assets" : "edit-reference",
      } as unknown as Prisma.InputJsonValue,
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
