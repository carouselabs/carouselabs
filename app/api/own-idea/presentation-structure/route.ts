// app/api/own-idea/presentation-structure/route.ts
// Stage 1 of the own-idea Image + Caption pipeline: decides HOW the image's
// information should be visually organized (not the image prompt itself).
// Own-idea only — trending ideas never call this route.
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import OpenAI from "openai"
import { getCurrentUser } from "@/lib/auth"
import { validateReferenceImage } from "@/lib/validateImage"
import { IMAGE_STRUCTURE_TEMPLATES } from "@/lib/imageStructureTemplates"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Cost guard — a single short GPT-4o call, cap per user.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, "1 h"),
  analytics: false,
})

export const maxDuration = 60

const PRESENTATION_STRUCTURE_SYSTEM_PROMPT = `# ROLE
You are a world-class Visual Content Strategist and Creative Director.
Your ONLY responsibility is selecting the best PRESENTATION STRUCTURE for a SINGLE image.
You DO NOT generate the image.
You DO NOT generate an image prompt.
You ONLY decide how the information should be visually organized.
----------------------------------------------------
# INPUT
You will receive:
- Title
- Deep Down (complete idea)
- Caption
- Reference Image (optional)
- Image Structure Selection
----------------------------------------------------
# GOAL
Understand the complete content before making any decision.
Read the Title, Deep Down and Caption carefully.
Identify:
- Main message
- Audience
- Goal
- Information density
- Reading flow
- What should grab attention first
- What should be remembered after seeing the image
Then determine the best visual presentation structure.
Your decision should maximize:
- Clarity
- Readability
- Engagement
- Visual storytelling
- Information hierarchy
- Scroll-stopping potential
The structure should feel natural for the content, not forced.
----------------------------------------------------
# IMAGE STRUCTURE MODES
## 1. 🤖 Let AI Decide
Analyze the Title, Deep Down and Caption.
Do NOT limit yourself to predefined templates.
You may create a completely custom structure.
You may combine multiple presentation structures if that communicates the idea better.
Examples:
- Hero + Infographic
- Dashboard + Framework
- Timeline + Comparison
- Magazine + Collection
- Blueprint + Process Flow
or any completely original structure.
Always choose the structure that best communicates THIS specific content.
Never choose a structure simply because it is common.
----------------------------------------------------
## 2. ✍️ User Decides
The user has already described how they want the information presented.
Follow the user's instructions exactly.
Do not replace the structure with your own unless the user explicitly asks for suggestions.
----------------------------------------------------
## 3. 📋 Choose a Template
The user selected a presentation template.
Use that template as the primary presentation structure.
Minor improvements to hierarchy or readability are acceptable, but do not fundamentally change the chosen template.
----------------------------------------------------
## 4. 🖼️ Follow Reference Image Structure Only
Analyze ONLY the uploaded reference image's structural composition.
Ignore:
- Colors
- Typography
- Illustration style
- Icons
- Branding
- Text
- Characters
- Objects
- Story
Extract ONLY:
- Overall layout
- Information hierarchy
- Section arrangement
- Reading flow
- Card placement
- Grouping
- Alignment
- Balance
- White-space distribution
- Visual rhythm
- Focal point
- Content organization
Use that structural composition as the presentation structure.
Never copy the actual content or design elements from the reference image.
----------------------------------------------------
# IMPORTANT
Your task is ONLY to determine the presentation structure.
Do NOT describe:
- Colors
- Typography
- Illustration style
- Lighting
- Rendering
- Shadows
- Textures
Those are handled later.
Focus ONLY on how the information should be visually organized.
----------------------------------------------------
# OUTPUT
Return ONLY one paragraph of no more than 100 words.
Include:
- Selected presentation structure
- Why it best fits the content
- Reading flow
- Information hierarchy
- If applicable, mention any hybrid structure being used
Do not generate an image prompt.
Do not generate the image.
Do not use markdown.
Return only the presentation structure decision.`

type ImageStructureMode = "auto" | "custom" | "template" | "reference-only"

function buildStructureSelectionLine(
  mode: ImageStructureMode,
  customImageStructure: string | undefined,
  template: { name: string; description: string } | undefined,
): string {
  if (mode === "auto") return "Image Structure Selection: Let AI Decide"
  if (mode === "custom") {
    return `Image Structure Selection: User Decides\nUser's description: ${customImageStructure ?? ""}`
  }
  if (mode === "template") {
    return template
      ? `Image Structure Selection: Choose a Template\nSelected template: ${template.name} — ${template.description}`
      : "Image Structure Selection: Choose a Template"
  }
  return "Image Structure Selection: Follow Reference Image Structure Only"
}

// Strips wrapping markdown fences/quotes a model occasionally adds despite
// the "no markdown" instruction, leaving plain paragraph text.
function cleanStructureText(raw: string): string {
  return raw
    .trim()
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/, "")
    .replace(/^["']+|["']+$/g, "")
    .trim()
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`own-idea:presentation-structure:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  let title: string
  let deepDive: string
  let caption: string
  let imageStructureMode: ImageStructureMode
  let customImageStructure: string | undefined
  let imageTemplateId: string | undefined
  let referenceImageBase64: string | undefined
  let referenceMediaType: string

  try {
    const body = await req.json()
    title = typeof body.title === "string" ? body.title : ""
    deepDive = typeof body.deepDive === "string" ? body.deepDive : ""
    caption = typeof body.caption === "string" ? body.caption : ""
    if (!["auto", "custom", "template", "reference-only"].includes(body.imageStructureMode)) {
      throw new Error("Invalid image structure mode")
    }
    imageStructureMode = body.imageStructureMode as ImageStructureMode
    customImageStructure =
      typeof body.customImageStructure === "string" ? body.customImageStructure : undefined
    imageTemplateId = typeof body.imageTemplateId === "string" ? body.imageTemplateId : undefined
    referenceImageBase64 =
      typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  if (imageStructureMode === "reference-only" && !referenceImageBase64) {
    return NextResponse.json(
      { error: "Reference image required for this structure mode" },
      { status: 400 },
    )
  }

  if (referenceImageBase64) {
    const check = validateReferenceImage(referenceImageBase64, referenceMediaType)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }
    referenceImageBase64 = check.data
    referenceMediaType = check.mediaType
  }

  const template = imageTemplateId
    ? IMAGE_STRUCTURE_TEMPLATES.find((t) => t.id === imageTemplateId)
    : undefined
  const structureSelectionLine = buildStructureSelectionLine(
    imageStructureMode,
    customImageStructure,
    template,
  )

  const userMessageText = `Title: ${title}\n\nDeep Down:\n${deepDive}\n\nCaption:\n${caption}\n\n${structureSelectionLine}`

  try {
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      ...(referenceImageBase64
        ? [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${referenceMediaType};base64,${referenceImageBase64}`,
                detail: "high" as const,
              },
            },
          ]
        : []),
      { type: "text" as const, text: userMessageText },
    ]

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        { role: "system", content: PRESENTATION_STRUCTURE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ""
    const presentationStructure = cleanStructureText(raw)
    if (!presentationStructure) {
      throw new Error("Empty presentation structure response")
    }

    return NextResponse.json({ presentationStructure })
  } catch (err) {
    console.error("[own-idea/presentation-structure] error:", err)
    return NextResponse.json(
      { error: "Failed to determine image structure. Please try again." },
      { status: 500 },
    )
  }
}
