// app/api/ideas/suggestions/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import crypto from "node:crypto"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Shown when there's no profile or generation fails. Never persisted with a key,
// so a transient failure is retried on the next load rather than cached forever.
const FALLBACK = [
  "What's trending in my industry today",
  "Share a surprising fact with my audience",
  "A lesson I learned the hard way",
  "A common myth in my field, debunked",
  "Turn a recent win into a post",
]

type ProfileBits = {
  industry: string | null
  headline: string | null
  targetAudience: string | null
  contentPillars: string[]
  writingStyle: string | null
}

// A stable hash of the profile inputs that shape the suggestions. When this
// changes (the user edits their profile), the cache is invalidated.
function profileKey(p: ProfileBits): string {
  return crypto
    .createHash("sha1")
    .update(
      JSON.stringify({
        industry: p.industry ?? "",
        headline: p.headline ?? "",
        audience: p.targetAudience ?? "",
        pillars: p.contentPillars ?? [],
        style: p.writingStyle ?? "",
      }),
    )
    .digest("hex")
}

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ suggestions: FALLBACK })

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { profile: true },
  })
  const profile = user?.profile
  if (!profile) return NextResponse.json({ suggestions: FALLBACK })

  const key = profileKey(profile)

  // Cached and still matching the current profile → return without calling Claude.
  if (profile.ideaSuggestionsKey === key && profile.ideaSuggestions.length >= 3) {
    return NextResponse.json({ suggestions: profile.ideaSuggestions })
  }

  // ── Generate fresh (only reaches here on first run or after a profile edit) ──
  let suggestions = FALLBACK
  let generated = false

  try {
    const ctx = [
      profile.industry && `Industry / niche: ${profile.industry}`,
      profile.headline && `Headline: ${profile.headline}`,
      profile.targetAudience && `Target audience: ${profile.targetAudience}`,
      profile.contentPillars.length && `Content pillars: ${profile.contentPillars.join(", ")}`,
      profile.writingStyle && `Writing style: ${profile.writingStyle}`,
    ]
      .filter(Boolean)
      .join("\n")

    const prompt = `You write short example prompts that a creator might type into a "generate content ideas" search bar.

Creator profile:
${ctx || "(no profile details provided)"}

Write EXACTLY 6 short example prompts, personalized to this creator's niche. Rules:
- Each is at most 8 words.
- First-person or imperative ("Generate…", "Share…", "My take on…").
- Vary the angles across the six: a trend, a surprising fact, a lesson/story, a how-to, a news take, and a contrarian opinion.
- Make them specific to the creator's industry and audience.
- No numbering and no surrounding quotes inside the strings.

Return ONLY a JSON array of exactly 6 strings, nothing else.`

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    })

    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()

    const start = text.indexOf("[")
    const end = text.lastIndexOf("]")
    if (start !== -1 && end !== -1) {
      const parsed = JSON.parse(text.slice(start, end + 1))
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((s) => typeof s === "string" && s.trim().length > 0)
          .map((s: string) => s.trim())
          .slice(0, 7)
        if (cleaned.length >= 4) {
          suggestions = cleaned
          generated = true
        }
      }
    }
  } catch (err) {
    console.error("[ideas/suggestions] generation failed:", err)
  }

  // Only persist a real generation — fallbacks aren't cached, so they retry.
  if (generated) {
    try {
      await db.profile.update({
        where: { id: profile.id },
        data: { ideaSuggestions: suggestions, ideaSuggestionsKey: key },
      })
    } catch (err) {
      console.error("[ideas/suggestions] persist failed:", err)
    }
  }

  return NextResponse.json({ suggestions })
}
