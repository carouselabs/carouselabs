import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { db } from "@/lib/db"
import { buildImagePrompt } from "@/lib/ai/prompts/imagePrompt"
import { hasGenerationBalance } from "@/lib/credits"
import { validateReferenceImage } from "@/lib/validateImage"
import type { BreakdownOutline } from "@/lib/types/breakdown"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Reference-image vision + a long image prompt can run past the platform's
// shorter default function timeout; allow up to 300s (matches the other routes).
export const maxDuration = 300

// Appended to the prompt only when a reference image is attached. Stops the
// model from lifting text/headlines visible in the reference (it should treat
// the reference as a pure visual-style cue, not a content source).
const REFERENCE_IMAGE_INSTRUCTION = `

CRITICAL — REFERENCE IMAGE USAGE:
If a reference image is provided, use it ONLY for visual style — colors, typography style, layout structure, illustration style, mood, and composition. NEVER copy or reuse any text, words, or headlines visible in the reference image. All text content in the generated image must come EXCLUSIVELY from the breakdown's refinedHook and the user's actual content provided below. The reference image's text content should be completely ignored.

GROUND THE STYLE IN CONCRETE OBSERVED ATTRIBUTES:
Look carefully at the reference image and write its actual visual attributes into the image prompt — the image model follows whatever scene you describe, so the description itself must match the reference:
- Background: state whether it is light or dark and name its tone in plain words (e.g. cream paper, off-white, deep navy), then describe the generated image's background to match it. A light reference background means you describe a light background — never invert it into a dark or color-flooded design.
- Headline text color: name the color you actually see (near-black, white, navy, etc.) and specify that same color for the generated headline.
- Headline emphasis technique: identify HOW the reference emphasizes key words — a highlighter swipe behind the text, a solid color block, an underline, a differently colored word, italics — and specify that exact same technique for the generated headline, in the same color the reference uses. Do not substitute a different technique or color.
- Accent color: name it in plain words, and describe it used in the same proportion as the reference — highlights on a few key words, icons, or details, never the dominant color of the design.
- Typography: describe the font character you actually see (weight, width, casing, serif or sans-serif) and require the same treatment.
- Art style: match the reference's actual illustration and rendering style — do not default to dramatic 3D characters, cinematic lighting, or poster-style compositions the reference does not contain.
IMPORTANT — do not invent precise hex codes. Estimated hex values are usually wrong and then override the real reference. Describe every color by name and role only (e.g. "cream paper background", "near-black serif headline", "bright yellow marker highlight"), and state in the prompt that all final colors must be sampled directly from the attached reference image. Every color, mood, and lighting choice you write must stay consistent with these observed attributes.`

const CAPTION_GHOSTWRITER_INSTRUCTION = `Act as a top 0.1% LinkedIn ghostwriter for AI founders. Read the deep dive and identify every unique insight, strategic implication, supporting argument, and founder perspective. Rewrite it into a LinkedIn post that preserves all high-value information while removing fluff, repetition, and unnecessary exposition. Optimize for readability, engagement, and authority—not virality or clickbait. The writing should feel human, opinionated, and experience-driven, with natural transitions and varied sentence lengths. The first three lines should create curiosity without hiding the value, and the rest should progressively reveal deeper insights. Prioritize clarity over hype, include practical takeaways, and end with a question that invites thoughtful discussion rather than generic comments. If any important idea from the original is omitted, explicitly add it back so that no meaningful strategic insight is lost. The final post should sound like an experienced founder or investor sharing hard-earned lessons, not an AI summarizing an article.`

// GPT-4o sometimes refuses the task outright instead of erroring. A real
// generation is JSON starting with "{" — refusal prose shows up at the very
// start of the response, so only the opening chunk is checked (a phrase like
// "I can't" inside generated copy must not trigger a false positive).
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

// Fixed style contract prepended to the generated image prompt when a reference
// image was uploaded — the model writes style notes inconsistently, so the
// contract is standardized server-side (mirrors the carousel flow).
const STYLE_REFERENCE_BLOCK = `## STYLE REFERENCE
Use the uploaded reference image ONLY as a style reference.
Before generating the image, thoroughly analyze and reverse-engineer the reference image's visual design system.
Extract ONLY:
- Overall visual aesthetic and design philosophy
- Typography style and treatment
- Visual hierarchy
- Layout philosophy
- White-space usage
- Composition principles
- Illustration style and rendering technique
- Color palette and color relationships
- Lighting and shadow treatment
- Texture and material finish
- Shape language and geometric style
- Card, container, and UI element styling (if present)
- Decorative elements and graphic motifs
- Line weight and stroke style
- Iconography style (without copying specific icons)
- Depth, perspective, and visual balance
- Brand personality conveyed through the design
- Overall creative direction and artistic language
TYPOGRAPHY AND COLOR FIDELITY (critical):
- Use the same font style as the reference: match its font family character (condensed or wide, geometric or humanist, serif or sans-serif), font weight, casing, and letter spacing as closely as possible — if the reference uses bold condensed uppercase headlines, the generated image uses bold condensed uppercase headlines
- Use the same text colors as the reference: if headlines are near-black with a single accent-colored word or phrase, reproduce exactly that treatment — never recolor all of the text with the accent color
- Use the same background treatment as the reference: if the background is white or light with colored accents, keep it white or light — never flood the whole design with the accent color
- Use accent colors in the same proportion as the reference: as highlights on key words, icons, and details, not as the dominant color of the design
DO NOT copy:
- Layout or arrangement
- Composition
- Illustrations or characters
- Icons
- Graphics
- Text or typography content
- Logos or branding
- Any identifiable visual element
Your goal is to extract the underlying design language, not the content.
The generated image should feel like it was designed by the same creative team that produced the reference image while remaining 100% original in concept, layout, illustrations, text, and composition.`

// Targeted edit mode — apply ONLY the user's instruction to the existing image
// prompt, changing as little as possible. Returns the same JSON shape the
// parser expects (caption is unused by the client in this flow).
function buildImageEditPrompt(currentImagePrompt: string, userInstruction: string): string {
  return `You are editing an existing AI image prompt for a LinkedIn post. Do NOT rewrite it from scratch.

Apply ONLY this instruction to the current image prompt: ${userInstruction}

Current prompt:
${currentImagePrompt}

Make MINIMUM changes. Preserve everything else — keep all composition, colors (exact hex codes), typography, lighting, mood, and detail that the instruction does not require changing. Change only what the instruction explicitly asks for.

Return ONLY valid JSON, no markdown:
{
  "caption": "",
  "imagePrompt": string (the minimally-edited image prompt)
}`
}

function extractStringValue(raw: string, key: string): string | null {
  // Matches "key": "value" handling escaped quotes and multiline values
  const pattern = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"`, "s")
  const match = raw.match(pattern)
  if (!match) return null
  // Unescape JSON string escapes
  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return match[1]
  }
}

function parseJsonResponse(raw: string): { caption: string; imagePrompt: string } {
  // 1. Direct JSON.parse
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
      console.log("[generate/image-prompt] Parsed via: direct JSON.parse")
      return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
    }
  } catch {}

  // 2. Extract outermost { ... } block and parse
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      const extracted = raw.slice(start, end + 1)
      const parsed = JSON.parse(extracted)
      if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
        console.log("[generate/image-prompt] Parsed via: brace extraction")
        return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
      }
    }
  } catch {}

  // 3. Extract from ```json ... ``` block
  try {
    const match = raw.match(/```json\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
        console.log("[generate/image-prompt] Parsed via: ```json block")
        return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
      }
    }
  } catch {}

  // 4. Extract from ``` ... ``` block (no language tag)
  try {
    const match = raw.match(/```\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
        console.log("[generate/image-prompt] Parsed via: ``` block")
        return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
      }
    }
  } catch {}

  // 5. Manual key extraction as last resort
  const caption = extractStringValue(raw, "caption")
  const imagePrompt = extractStringValue(raw, "imagePrompt")
  if (imagePrompt) {
    console.log("[generate/image-prompt] Parsed via: manual key extraction")
    return { caption: caption ?? "", imagePrompt }
  }

  throw new Error("All parsing strategies exhausted")
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Defense-in-depth: credits are consumed via /api/credits/consume before the
  // client calls this route — but a drained PRO balance is still blocked here.
  if (!(await hasGenerationBalance(user.id))) {
    return NextResponse.json({ error: "You're out of credits." }, { status: 402 })
  }

  let ideaId: string
  let caption: string
  let size: string
  let referenceImage: string | undefined
  let referenceMediaType: string
  let userInstruction: string | undefined
  let currentImagePrompt: string | undefined

  try {
    const body = await req.json()
    ideaId = body.ideaId
    caption = typeof body.caption === "string" ? body.caption : ""
    size = typeof body.size === "string" ? body.size : "4:5"
    referenceImage = typeof body.referenceImage === "string" ? body.referenceImage : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"
    userInstruction =
      typeof body.userInstruction === "string" && body.userInstruction.trim()
        ? body.userInstruction.trim()
        : undefined
    currentImagePrompt =
      typeof body.currentImagePrompt === "string" && body.currentImagePrompt.trim()
        ? body.currentImagePrompt
        : undefined
    if (!ideaId) throw new Error("Missing ideaId")
    // TEMP diagnostic — confirm in Vercel logs exactly what the client sent.
    console.log("[ref-image] Reference image present:", !!referenceImage, "length:", referenceImage?.length ?? 0)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // Validate the reference image (size / type / magic bytes) before it ever
  // reaches Claude vision. Replaces the client-supplied values with the cleaned,
  // verified ones.
  if (referenceImage) {
    const check = validateReferenceImage(referenceImage, referenceMediaType)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }
    referenceImage = check.data
    referenceMediaType = check.mediaType
  }

  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }
  if (!idea.breakdowns[0]) {
    return NextResponse.json(
      { error: "No breakdown found. Generate a breakdown first." },
      { status: 400 },
    )
  }

  const niche = user.profile?.industry ?? ""
  console.log(`[image] Profile used: industry=${niche}`)

  const breakdown = idea.breakdowns[0].outline as unknown as BreakdownOutline
  // Targeted edit when the user gave an instruction AND we have the current
  // prompt to edit; otherwise full regeneration as before.
  const prompt =
    userInstruction && currentImagePrompt
      ? buildImageEditPrompt(currentImagePrompt, userInstruction)
      : `${CAPTION_GHOSTWRITER_INSTRUCTION}

${buildImagePrompt(breakdown.refinedHook, breakdown.deepDive, caption, size, userInstruction, niche)}`

  console.log("[image-prompt] Full prompt sent to model:\n", prompt)

  // Same text both providers see: the reference-usage instruction rides along
  // only when a reference image is attached (unchanged from before).
  const promptText = referenceImage ? prompt + REFERENCE_IMAGE_INSTRUCTION : prompt

  let modelRaw = ""
  let usedFallback = false

  // PRIMARY: GPT-4o. Any refusal or API error falls through to Claude below.
  try {
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      ...(referenceImage
        ? [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${referenceMediaType || "image/jpeg"};base64,${referenceImage}`,
                detail: "high" as const,
              },
            },
          ]
        : []),
      { type: "text" as const, text: promptText },
    ]

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [{ role: "user" as const, content: userContent }],
    })

    console.log("[image-prompt] GPT-4o finish_reason:", response.choices[0]?.finish_reason)

    const gptRaw = response.choices[0]?.message?.content ?? ""

    if (isRefusal(gptRaw)) {
      console.warn("[image-prompt] GPT-4o refused request, falling back to Claude")
      usedFallback = true
    } else {
      modelRaw = gptRaw
    }
  } catch (err) {
    const e = err as { message?: string }
    console.warn("[image-prompt] GPT-4o error, falling back to Claude:", e?.message ?? err)
    usedFallback = true
  }

  // FALLBACK: Claude — the previous implementation, unchanged.
  if (usedFallback) {
    try {
      const messageContent: Anthropic.MessageParam["content"] = referenceImage
        ? [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: referenceMediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: referenceImage,
              },
            },
            { type: "text", text: promptText },
          ]
        : prompt

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: messageContent }],
      })

      console.log("[image-prompt] Claude fallback stop_reason:", response.stop_reason)

      modelRaw = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
    } catch (err) {
      const e = err as { message?: string }
      console.error("[image-prompt] Claude fallback also failed:", e?.message ?? err)
      return NextResponse.json({ error: "Failed to generate content" }, { status: 502 })
    }
  }

  console.log("[image-prompt] Model used:", usedFallback ? "Claude (fallback)" : "GPT-4o")
  console.log("[generate/image-prompt] Raw model response:\n", modelRaw)

  let parsed: { caption: string; imagePrompt: string }
  try {
    parsed = parseJsonResponse(modelRaw)
  } catch {
    console.error("[generate/image-prompt] All parse strategies failed. Raw:\n", modelRaw)
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 })
  }

  if (!parsed.imagePrompt) {
    return NextResponse.json({ error: "Image prompt was empty in AI response" }, { status: 502 })
  }

  // Inject the fixed style contract at the start of the prompt (reference
  // uploads only). Guarded so edit-mode round-trips — where the client sends a
  // prompt that already carries the block — don't stack duplicates.
  if (referenceImage && !parsed.imagePrompt.includes("## STYLE REFERENCE")) {
    parsed.imagePrompt = `${STYLE_REFERENCE_BLOCK}\n\n${parsed.imagePrompt}`
  }

  return NextResponse.json({ caption: parsed.caption, imagePrompt: parsed.imagePrompt })
}
