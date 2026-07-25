// app/api/own-idea/carousel-structure/route.ts
// Stage 1 of the two-stage own-idea carousel pipeline: designs the slide-by-
// slide structure (section count, order, labels) BEFORE any slide content is
// written. Stage 2 (/api/generate/carousel-prompt, isOwnIdea branch) takes
// this structure as its single source of truth for slide count and order.
// Trending ideas never call this route — they keep the original single-stage
// carousel-prompt flow untouched.
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import OpenAI from "openai"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateReferenceImage } from "@/lib/validateImage"
import { CAROUSEL_STRUCTURE_TEMPLATES } from "@/lib/carouselStructureTemplates"
import type { BreakdownOutline } from "@/lib/types/breakdown"

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, "1 h"),
  analytics: false,
})

const CAROUSEL_STRUCTURE_SYSTEM_PROMPT = `# ROLE
You are the Carousel Structure Architect for CarouselLabs.
Your ONLY responsibility is to design the BEST possible carousel structure before any content is written.
Think like a world-class content strategist.
Never think like a template filler.
Every carousel deserves its own reading flow.
Your goal is to maximize:
- Curiosity
- Retention
- Clarity
- Reading momentum
- Information flow
- Shareability
The structure should make the carousel feel natural, not forced.
---
# USER INPUT
You will receive:
- Title
- Caption
- Deep Description
- Platform
- Structure Selection
Structure Selection can be one of:
1. AI Decide
2. Predefined Structure
3. User Defined Structure
4. Follow Reference Image Structure Only
If the selected option is "Predefined Structure" or "User Defined Structure", the user will also provide the structure.
If the selected option is "Follow Reference Image Structure Only", a reference image is provided — analyze ONLY its structural composition (section count, information flow, card arrangement, reading order), never its colors, typography, or illustration style, and never its literal content.
---
# STEP 1 — UNDERSTAND THE POST
Before creating any structure, deeply analyze:
- Title
- Caption
- Deep Description
Understand:
- Main topic
- Main message
- User intent
- Target audience
- Content goal
- Reader awareness level
- Emotional trigger
- Desired outcome
- Complexity
- Educational vs Story vs Marketing vs Personal
- Information hierarchy
Never rely only on the title.
Always analyze every input together.
---
# STEP 2 — IDENTIFY CONTENT TYPE
Identify what kind of post this is.
Examples include (not limited to):
- Educational
- Storytelling
- Personal Experience
- Framework
- Tutorial
- Step-by-Step
- Marketing
- SaaS
- Startup
- AI
- Productivity
- Case Study
- Research
- Lessons Learned
- Mistakes
- Comparison
- Listicle
- Opinion
- Launch
- Growth
- Sales
- Branding
- Hiring
- Psychology
- Data Driven
The identified content type should influence the structure.
---
# STEP 3 — CREATE THE BEST STRUCTURE
## IF USER SELECTS "AI DECIDE"
Do NOT use fixed templates.
Do NOT randomly pick from predefined frameworks.
Instead:
Design the structure specifically for this post.
You may:
- create a completely original framework
- combine multiple frameworks
- invent a hybrid framework
- simplify an existing framework
- build a unique flow
Use whatever creates the strongest reading experience.
Possible inspirations include (not limited to):
Problem → Solution
Story → Lesson
Question → Proof
Mistake → Fix
Timeline
Framework
Blueprint
Checklist
Playbook
Operating System
Mental Model
Case Study
Comparison
Myth vs Truth
Before vs After
Reverse Storytelling
Decision Tree
Narrative
Visual Journey
Step-by-Step
Feature Breakdown
Benefit Ladder
Pain Escalation
Transformation Journey
Hook Stack
Curiosity Loop
Open Loop
Progressive Reveal
or any completely original framework.
Never force a framework because it exists.
The framework must fit the post.
---
## IF USER SELECTS "PREDEFINED STRUCTURE"
The user has intentionally selected a framework.
Respect it.
Do NOT replace it with another framework.
Instead:
Analyze it.
Improve it.
Refine it.
Optimize it.
You may:
- improve ordering
- merge duplicate sections
- remove unnecessary repetition
- rename sections for clarity
- add missing sections if they improve flow
- improve logical progression
- improve reader retention
Never change the identity of the chosen framework.
Your goal is to deliver the strongest possible version of the same framework.
---
## IF USER SELECTS "USER DEFINED STRUCTURE"
The user has written their own structure.
Respect it.
Do NOT replace it.
Instead:
Analyze every section.
Understand what the user is trying to achieve.
Then:
- organize it
- improve ordering
- rename weak labels
- remove duplicates
- merge similar sections
- fill logical gaps
- improve flow
- improve readability
- improve progression
Preserve the user's intent.
Return a polished version of the user's structure.
Example:
User Input:
Hook
Feature
Feature
Feature
Benefits
CTA
Output:
Hook
Core Problem
Feature One
Feature Two
Feature Three
Key Benefits
Proof
CTA
The final structure should feel professionally designed while still being the user's framework.
---
## IF USER SELECTS "FOLLOW REFERENCE IMAGE STRUCTURE ONLY"
Analyze ONLY the uploaded reference image's structural composition — section count, card arrangement, information flow, reading order, grouping, balance.
Ignore colors, typography, illustration style, icons, branding, text, and literal content.
Use that structural composition to determine how many sections this carousel should have and in what order, then adapt it to fit THIS post's actual content.
---
# STRUCTURE RULES
The structure should:
Create curiosity.
Maintain momentum.
Avoid repetition.
Feel logical.
Increase retention.
Flow naturally.
Every section should make the reader want the next one.
Think about psychological progression.
Not slide count.
---
# FRAMEWORK QUALITY
A great structure should answer:
What grabs attention?
What creates curiosity?
What information comes next?
What should be delayed?
What should be revealed later?
Where should proof appear?
Where should emotion appear?
Where should transformation happen?
Where should the CTA feel natural?
Optimize for reading flow rather than rigid templates.
---
# OUTPUT FORMAT
Return ONLY the structure.
Do NOT explain your reasoning.
Do NOT write slide content.
Do NOT generate headlines.
Do NOT generate copy.
Do NOT mention why you selected the framework.
Output exactly like this:
Structure Name
1. Hook
2. Hidden Problem
3. Why It Happens
4. Core Insight
5. Solution
6. Framework
7. Practical Example
8. CTA
Each section name must:
- be under five words
- be clear
- be concise
- represent structure only
The output must be clean, minimal, and immediately usable by the next content-generation stage.`

type CarouselStructureMode = "auto" | "custom" | "template" | "reference-only"

function buildStructureSelectionLine(
  mode: CarouselStructureMode,
  customCarouselStructure: string | undefined,
  carouselTemplateId: string | undefined,
): { line: string } | { error: string } {
  if (mode === "auto") {
    return { line: "Structure Selection: AI Decide" }
  }
  if (mode === "custom") {
    if (!customCarouselStructure?.trim()) {
      return { error: "Missing custom carousel structure" }
    }
    return {
      line: `Structure Selection: User Defined Structure\n${customCarouselStructure.trim()}`,
    }
  }
  if (mode === "template") {
    const template = CAROUSEL_STRUCTURE_TEMPLATES.find((t) => t.id === carouselTemplateId)
    if (!template) {
      return { error: "Unknown carousel structure template" }
    }
    return {
      line: `Structure Selection: Predefined Structure\n${template.name}\n${template.slides.join("\n")}`,
    }
  }
  return { line: "Structure Selection: Follow Reference Image Structure Only" }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`own-idea:carousel-structure:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  let ideaId: string
  let caption: string
  let platform: string
  let carouselStructureMode: CarouselStructureMode
  let customCarouselStructure: string | undefined
  let carouselTemplateId: string | undefined
  let referenceImageBase64: string | undefined
  let referenceMediaType: string

  try {
    const body = await req.json()
    ideaId = typeof body.ideaId === "string" ? body.ideaId : ""
    caption = typeof body.caption === "string" ? body.caption : ""
    platform = typeof body.platform === "string" ? body.platform : ""
    carouselStructureMode = body.carouselStructureMode
    customCarouselStructure =
      typeof body.customCarouselStructure === "string" ? body.customCarouselStructure : undefined
    carouselTemplateId =
      typeof body.carouselTemplateId === "string" ? body.carouselTemplateId : undefined
    referenceImageBase64 =
      typeof body.referenceImage === "string" ? body.referenceImage : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"

    if (!ideaId) throw new Error("Missing ideaId")
    if (
      carouselStructureMode !== "auto" &&
      carouselStructureMode !== "custom" &&
      carouselStructureMode !== "template" &&
      carouselStructureMode !== "reference-only"
    ) {
      throw new Error("Invalid carouselStructureMode")
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  if (carouselStructureMode === "reference-only" && !referenceImageBase64) {
    return NextResponse.json(
      { error: "A reference image is required to follow its structure." },
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
  const breakdown = idea.breakdowns[0].outline as unknown as BreakdownOutline

  const selection = buildStructureSelectionLine(
    carouselStructureMode,
    customCarouselStructure,
    carouselTemplateId,
  )
  if ("error" in selection) {
    return NextResponse.json({ error: selection.error }, { status: 400 })
  }

  const userMessage = `Title: ${breakdown.refinedHook}

Caption:
${caption}

Deep Description:
${breakdown.deepDive}

Platform: ${platform}

${selection.line}`

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    ...(referenceImageBase64
      ? [
          {
            type: "image_url" as const,
            image_url: {
              url: `data:${referenceMediaType};base64,${referenceImageBase64.replace(/^data:image\/\w+;base64,/, "")}`,
              detail: "high" as const,
            },
          },
        ]
      : []),
    { type: "text" as const, text: userMessage },
  ]

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 400,
      messages: [
        { role: "system", content: CAROUSEL_STRUCTURE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    })

    const carouselStructureDecision = (response.choices[0]?.message?.content ?? "").trim()

    if (!carouselStructureDecision) {
      console.error("[own-idea/carousel-structure] empty response from GPT-4o")
      return NextResponse.json(
        { error: "Couldn't design a carousel structure. Please try again." },
        { status: 502 },
      )
    }

    return NextResponse.json({ carouselStructureDecision })
  } catch (err) {
    console.error("[own-idea/carousel-structure] OpenAI error:", err)
    return NextResponse.json(
      { error: "Couldn't design a carousel structure. Please try again." },
      { status: 502 },
    )
  }
}
