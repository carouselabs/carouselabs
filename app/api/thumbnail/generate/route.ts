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
import { THUMBNAIL_SUBJECT_DESCRIPTION_SYSTEM_PROMPT } from "@/lib/ai/prompts/thumbnailPrompt"
import type {
  ThumbnailBlueprint,
  ThumbnailMainTextRegion,
  ThumbnailSecondaryTextRegion,
  ThumbnailReferenceComposition,
  ThumbnailAdaptedContent,
} from "@/lib/types/thumbnail"
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

interface UploadedAsset {
  base64: string
  mediaType: string
  label: string
}

function isNullableString(val: unknown): val is string | null {
  return val === null || typeof val === "string"
}

function isValidMainText(val: unknown): val is ThumbnailMainTextRegion {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return typeof v.position === "string" && typeof v.size === "string" && typeof v.color === "string"
}

function isValidSecondaryText(val: unknown): val is ThumbnailSecondaryTextRegion {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return isNullableString(v.position) && isNullableString(v.size) && isNullableString(v.color)
}

function isValidReferenceComposition(val: unknown): val is ThumbnailReferenceComposition {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return (
    typeof v.subjectCount === "number" &&
    typeof v.subjectPosition === "string" &&
    typeof v.subjectScale === "string" &&
    typeof v.background === "string" &&
    isValidMainText(v.mainText) &&
    (v.secondaryText === null || v.secondaryText === undefined || isValidSecondaryText(v.secondaryText)) &&
    typeof v.additionalObjects === "string" &&
    typeof v.compositionRule === "string"
  )
}

function isValidAdaptedContent(val: unknown): val is ThumbnailAdaptedContent {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return (
    typeof v.mainSubjectDescription === "string" &&
    typeof v.mainHeadlineText === "string" &&
    (v.secondaryText === undefined || isNullableString(v.secondaryText)) &&
    typeof v.emotion === "string"
  )
}

function isValidBlueprint(val: unknown): val is ThumbnailBlueprint {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return (
    isValidReferenceComposition(v.referenceComposition) &&
    isValidAdaptedContent(v.adaptedContent) &&
    (v.additionalGuidance === undefined || isNullableString(v.additionalGuidance))
  )
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

function parseDescribedSubject(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.mainSubjectDescription === "string" && parsed.mainSubjectDescription.trim()) {
      return parsed.mainSubjectDescription
    }
  } catch {}

  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1))
      if (typeof parsed.mainSubjectDescription === "string" && parsed.mainSubjectDescription.trim()) {
        return parsed.mainSubjectDescription
      }
    }
  } catch {}

  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.mainSubjectDescription === "string" && parsed.mainSubjectDescription.trim()) {
        return parsed.mainSubjectDescription
      }
    }
  } catch {}

  const manual = raw.match(new RegExp(`"mainSubjectDescription"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"`, "s"))
  if (manual) {
    try {
      return JSON.parse(`"${manual[1]}"`)
    } catch {
      return manual[1]
    }
  }

  return null
}

// Rewrites blueprint.adaptedContent.mainSubjectDescription to describe the
// uploaded replacement photo(s)' REAL appearance instead of the reference's
// original subject. GPT-4o primary, Claude Sonnet 4.5 fallback — same pattern
// as the chat route. The final image still comes from images.edit() with the
// reference attached (buildThumbnailPrompt below), so this step only needs to
// fix the described identity, not write a whole new prompt.
async function describeReplacementSubjects(
  currentDescription: string,
  uploadedAssets: UploadedAsset[],
): Promise<string> {
  const instructionText = `Current mainSubjectDescription (describes the reference's original subject — to be replaced): ${currentDescription}

Rewrite it now, following the system instructions.`

  let raw = ""
  let usedFallback = false

  try {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
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
      max_tokens: 1024,
      messages: [
        { role: "system" as const, content: THUMBNAIL_SUBJECT_DESCRIPTION_SYSTEM_PROMPT },
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
      max_tokens: 1024,
      system: THUMBNAIL_SUBJECT_DESCRIPTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: claudeContent }],
    })

    raw = claudeResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
  }

  const parsed = parseDescribedSubject(raw)
  if (!parsed) throw new Error("Failed to describe replacement subjects")
  return parsed
}

// REFERENCE COMPOSITION IS THE PRIMARY VISUAL CONSTRAINT — this prompt is fed
// to images.edit() alongside the reference image, so the model's job is to
// swap in adaptedContent while preserving referenceComposition's exact
// structure, not invent a new thumbnail concept.
function buildThumbnailPrompt(blueprint: ThumbnailBlueprint, videoContent: string): string {
  const rc = blueprint.referenceComposition
  const ac = blueprint.adaptedContent

  const secondaryTextBlock = rc.secondaryText
    ? `

SECONDARY TEXT AREA:
Position: ${rc.secondaryText.position}
Size: ${rc.secondaryText.size}
Color: ${rc.secondaryText.color}
Text to display: "${ac.secondaryText ?? ""}"`
    : ""

  const noExtraObjectsLine =
    rc.additionalObjects.trim().toLowerCase() === "none"
      ? "\nDo NOT add any extra objects, scenery, signs, or additional elements not present in this list."
      : ""

  const additionalGuidanceBlock = blueprint.additionalGuidance?.trim()
    ? `\n\nADDITIONAL USER GUIDANCE: ${blueprint.additionalGuidance.trim()}`
    : ""

  return `REFERENCE COMPOSITION IS THE PRIMARY VISUAL CONSTRAINT.

Create a new YouTube thumbnail using the uploaded reference image as the layout and composition guide.

IMPORTANT: Do not invent a completely new thumbnail concept or change the composition.

Preserve the reference's visual structure as closely as possible:
- Keep the same overall composition and layout.
- Keep the same number and approximate placement of major subjects: ${rc.subjectCount} subject(s), positioned at ${rc.subjectPosition}.
- Preserve the same visual hierarchy.
- Preserve the approximate subject scale and cropping: ${rc.subjectScale}.
- Preserve the same text regions and approximate text hierarchy.
- Preserve the background simplicity or complexity level: ${rc.background}.
- Preserve the same spacing and negative space.
- Preserve the same overall mood, contrast, and thumbnail readability.
- Composition rule to maintain: ${rc.compositionRule}

Only replace the CONTENT inside the composition to match the user's video topic.

For this reference specifically, the structure is:

MAIN SUBJECT AREA:
Position: ${rc.subjectPosition}
Scale: ${rc.subjectScale}
Replace with: ${ac.mainSubjectDescription}

MAIN TEXT AREA:
Position: ${rc.mainText.position}
Size: ${rc.mainText.size}
Color: ${rc.mainText.color}
Text to display: "${ac.mainHeadlineText}"${secondaryTextBlock}

BACKGROUND:
${rc.background}

ADDITIONAL OBJECTS IN REFERENCE: ${rc.additionalObjects}${noExtraObjectsLine}

Do NOT add:
- Houses, outdoor scenery, or backgrounds different from what's specified above
- Wooden signs or unrelated props
- Extra people beyond the specified subject count
- Random objects not listed in "additional objects"
- Additional paragraphs of text beyond the specified text areas
- New layouts not present in the reference structure above

The output should immediately feel like the SAME thumbnail composition and visual format as the reference, but adapted with new relevant content.

USER VIDEO CONTENT:
${videoContent}${additionalGuidanceBlock}

If the user's content does not naturally fit the reference structure exactly, adapt the content to fit the existing structure instead of redesigning the thumbnail from scratch.`
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
  let videoContent: string

  try {
    const body = await req.json()
    if (!isValidBlueprint(body.blueprint)) throw new Error("Missing or invalid blueprint")
    blueprint = body.blueprint
    referenceImageBase64 = typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : ""
    referenceImageMediaType =
      typeof body.referenceImageMediaType === "string" ? body.referenceImageMediaType : "image/jpeg"
    if (!referenceImageBase64) throw new Error("Missing referenceImageBase64")
    videoContent = typeof body.videoContent === "string" ? body.videoContent.trim() : ""
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

  // Every uploaded asset is about to be sent to vision APIs — validate + clean
  // each one, the same way the reference image and the chat route's
  // mid-conversation uploads are validated. This request is independent of any
  // earlier /api/thumbnail/chat calls, so the client's bytes can't be trusted
  // just because they were "already checked" there.
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

  // True 16:9, requested natively — gpt-image-2 accepts custom WIDTHxHEIGHT
  // beyond the 3 "standard" sizes as long as both edges are divisible by 16,
  // the longer edge is ≤3840px, the aspect ratio is between 1:3 and 3:1, and
  // total pixels fall between 655,360 and 8,294,400. 1280x720 satisfies all
  // of those (1280/16=80, 720/16=45, ratio 1.78:1, 921,600px), so no
  // post-generation crop is needed.
  const openaiSize = "1280x720" as const

  let finalPrompt: string
  let imageB64: string
  try {
    // If the user uploaded replacement photos, rewrite the described subject
    // to their REAL appearance before building the prompt — everything else
    // about the blueprint (composition, text, background) is unaffected.
    if (uploadedAssets.length > 0) {
      const describedSubject = await describeReplacementSubjects(
        blueprint.adaptedContent.mainSubjectDescription,
        uploadedAssets,
      )
      blueprint = {
        ...blueprint,
        adaptedContent: { ...blueprint.adaptedContent, mainSubjectDescription: describedSubject },
      }
    }

    finalPrompt = buildThumbnailPrompt(blueprint, videoContent)

    // Always edit the reference image directly — the structural prompt above
    // explicitly locks composition/scale/background/text-region constraints
    // pulled from the reference's own analysis, so it's strong enough to
    // override just the subject identity without losing the reference layout.
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
      title: blueprint.adaptedContent.mainHeadlineText || "Thumbnail",
      format: "THUMBNAIL",
      status: "READY",
      imageUrls: [imageUrl],
      r2Keys: [filename],
      metadata: { blueprint, prompt: finalPrompt } as unknown as Prisma.InputJsonValue,
      slides: {
        create: {
          role: "COVER",
          order: 0,
          headline: blueprint.adaptedContent.mainHeadlineText,
          imageUrl,
          r2Key: filename,
        },
      },
    },
  })

  return NextResponse.json({ imageUrl, postId: post.id })
}
