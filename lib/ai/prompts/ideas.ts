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

// Built fresh on every call so the date is current and the random seed
// changes each generation (preventing repeated ideas). `niche` is interpolated
// into the web-search queries so Claude searches the right space.
function buildBaseInstructions(niche: string): string {
  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0]
  const seed = Math.random().toString(36).substring(7)
  const searchNiche = niche.trim() || "the user's niche"

  return `Generate 10 highly engaging LinkedIn post ideas based on the user's provided profile information, niche, audience, goals, tone, recent content, and writing style.

Structure:
- 3 Latest News ideas
- 3 Trending Topic ideas
- 3 Industry Topic ideas
- 1 Random but Relevant idea

WEB SEARCH — REAL NEWS REQUIREMENT:
Search for: '${searchNiche} news ${today}' and '${searchNiche} announcement ${today}'
ONLY use results published on ${today} or ${yesterday}.
If a news result is older than ${yesterday}, DO NOT use it — label as [Trending] instead.
Check the publication date of every result before using it.

CRITICAL - LATEST NEWS REQUIREMENT:
Today's date is ${today}.
The 3 Latest News ideas MUST be based on real events from the last 48 hours only (since ${yesterday}).
Do NOT fabricate news. Do NOT use news older than 48 hours.
If unsure, label as [Trending] instead of [Latest News].

Output format:
[Category] "Hook/Post Idea" -> Post Type | CTA

Example:
[Trending] "AI won't replace creators. Creators using AI will." -> Text Post | CTA: "Agree?"

ANTI-REPETITION RULES:
- NEVER generate the same hook or angle you have generated before for this user
- Every generation must feel fresh and different from the last
- Vary the format: sometimes use questions, sometimes bold statements, sometimes stories, sometimes data points
- Vary the angle: sometimes contrarian, sometimes inspirational, sometimes tactical, sometimes personal story
- Vary the topic focus within the user's niche — don't keep returning to the same sub-topics
- If the user's niche is AI, don't always write about ChatGPT — cover different AI tools, companies, trends
- Each batch of 10 ideas must feel completely different from the previous batch
- Use different hook styles: 'Here's what nobody tells you...', 'I made a mistake...', 'The data shows...', 'Unpopular opinion:', 'After X years...', 'Stop doing X', 'Why X is wrong' etc

Random variation seed: ${seed} — use this to ensure variety

Rules:
- Keep every output within 1 line only
- Make hooks strong, curiosity-driven, and engaging
- Match the user's niche, audience, and personal brand
- Avoid generic or repetitive ideas
- Optimize for shares, saves, comments, and profile visits
- Include realistic CTAs
- Make ideas feel modern and viral-ready for LinkedIn`
}

export function buildModeAPrompt(profile: Profile): string {
  return `${formatProfile(profile)}\n\n${buildBaseInstructions(profile.industry ?? "")}`
}

export function buildModeBPrompt(profile: Profile, topic: string): string {
  const topicSeed = `The user has written the following in the topic field: ${topic}\nUse this as the primary seed for generating 10 ideas.`
  // The topic the user typed is the most relevant thing to search for; fall
  // back to their industry/niche.
  const niche = topic || profile.industry || ""
  return `${formatProfile(profile)}\n\n${topicSeed}\n\n${buildBaseInstructions(niche)}`
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
