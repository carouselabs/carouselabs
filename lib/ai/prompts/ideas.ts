// lib/ai/prompts/ideas.ts
import type { Profile } from "@prisma/client"

function formatProfile(profile: Profile): string {
  let writingStyleStr = ""
  let targetAudienceStr = ""

  try {
    const ws = JSON.parse(profile.writingStyle ?? "{}")
    writingStyleStr = [
      ws.role && `Role: ${ws.role}`,
      ws.tones?.length && `Tone: ${ws.tones.join(", ")}`,
      ws.primaryGoal && `Primary Goal: ${ws.primaryGoal}`,
      ws.goals?.length && `Goals: ${ws.goals.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n")
  } catch {
    writingStyleStr = profile.writingStyle ?? ""
  }

  try {
    const ta = JSON.parse(profile.targetAudience ?? "{}")
    targetAudienceStr = [
      ta.role && `Role: ${ta.role}`,
      ta.seniority && `Seniority: ${ta.seniority}`,
      ta.industry && `Industry: ${ta.industry}`,
      ta.problem && `Core Problem: ${ta.problem}`,
    ]
      .filter(Boolean)
      .join(", ")
  } catch {
    targetAudienceStr = profile.targetAudience ?? ""
  }

  return [
    profile.name && `Name: ${profile.name}`,
    profile.headline && `Headline: ${profile.headline}`,
    profile.industry && `Industry/Niche: ${profile.industry}`,
    targetAudienceStr && `Target Audience: ${targetAudienceStr}`,
    profile.contentPillars.length && `Content Pillars: ${profile.contentPillars.join(", ")}`,
    writingStyleStr && `Writing Style:\n${writingStyleStr}`,
  ]
    .filter(Boolean)
    .join("\n")
}

const BASE_INSTRUCTIONS = `Generate 10 highly engaging LinkedIn post ideas based on the user's provided profile information, niche, audience, goals, tone, recent content, and writing style.

Structure:
- 3 Latest News ideas
- 3 Trending Topic ideas
- 3 Industry Topic ideas
- 1 Random but Relevant idea

One Latest News idea must be based on a major update, launch, trend, or discussion from the past 48 hours relevant to the user's niche.

Output format:
[Category] "Hook/Post Idea" -> Post Type | CTA

Example:
[Trending] "AI won't replace creators. Creators using AI will." -> Text Post | CTA: "Agree?"

Rules:
- Keep every output within 1 line only
- Make hooks strong, curiosity-driven, and engaging
- Match the user's niche, audience, and personal brand
- Avoid generic or repetitive ideas
- Optimize for shares, saves, comments, and profile visits
- Include realistic CTAs
- Make ideas feel modern and viral-ready for LinkedIn`

export function buildModeAPrompt(profile: Profile): string {
  return `${formatProfile(profile)}\n\n${BASE_INSTRUCTIONS}`
}

export function buildModeBPrompt(profile: Profile, topic: string): string {
  const topicSeed = `The user has written the following in the topic field: ${topic}\nUse this as the primary seed for generating 10 ideas.`
  return `${formatProfile(profile)}\n\n${topicSeed}\n\n${BASE_INSTRUCTIONS}`
}

export function buildMorePrompt(
  profile: Profile,
  topic: string | null,
  alreadyShown: string[],
): string {
  const dedup =
    alreadyShown.length > 0
      ? `\n\nIMPORTANT: Do NOT repeat any of these hooks already shown to the user:\n${alreadyShown.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
      : ""

  const base = topic ? buildModeBPrompt(profile, topic) : buildModeAPrompt(profile)
  return `${base}${dedup}`
}
