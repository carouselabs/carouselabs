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

// Real news headlines (from NewsAPI, last 48h) placed at the very top so Claude
// uses ONLY these for the Latest News ideas. Empty string when none available —
// then Claude falls back to its web search.
function realNewsBlock(realNews?: string): string {
  if (!realNews || !realNews.trim()) return ""
  return `⚠️ STOP. READ THIS FIRST BEFORE GENERATING ANY IDEAS.

REAL NEWS HEADLINES FROM THE LAST 48 HOURS:
${realNews.trim()}

YOUR FIRST TASK: Read these headlines carefully.
YOUR SECOND TASK: Generate the 3 [Latest News] ideas DIRECTLY referencing these exact headlines above.
YOUR THIRD TASK: Do NOT use any other news. Do NOT invent news. Do NOT reference Apple, PayPal, or any company not in the headlines above.

If the headlines are not relevant to the user's niche, still base the Latest News ideas on them by connecting them to the niche.

VIOLATION: Using any news story NOT in the list above for [Latest News] ideas = WRONG.

`
}

// Latest News instruction adapts to whether we have real NewsAPI headlines:
// when present, lock Claude to ONLY those; when absent, there's no web search, so
// fall the 3 Latest News slots back to [Trending] ideas rather than risk made-up
// news.
function latestNewsInstruction(realNews?: string): string {
  if (realNews && realNews.trim()) {
    return "The 3 Latest News ideas MUST reference ONLY the real headlines provided above. Do NOT fabricate any news stories. If a headline is not relevant, use [Trending] instead."
  }
  return "No real news headlines are available right now. For the 3 Latest News slots, generate [Trending] ideas instead. Do NOT make up news stories, funding amounts, founder names, or statistics."
}

const OUTPUT_FORMAT = `Output format (one idea per line, exactly this format):
[Category] "Hook/Post Idea" -> Post Type | CTA: "..."

Example:
[Trending] "AI won't replace creators. Creators using AI will." -> Text Post | CTA: "Agree?"`

const ANTI_REPETITION = `ANTI-REPETITION RULES:
- NEVER generate the same hook or angle you have generated before for this user
- Every generation must feel fresh and different from the last
- Vary the format: sometimes questions, sometimes bold statements, sometimes stories, sometimes data points
- Vary the angle: sometimes contrarian, sometimes inspirational, sometimes tactical, sometimes personal story
- Vary the topic focus within the user's niche — don't keep returning to the same sub-topics
- If the user's niche is AI, don't always write about ChatGPT — cover different AI tools, companies, trends
- Each batch of 10 ideas must feel completely different from the previous batch
- Use different hook styles: 'Here's what nobody tells you...', 'I made a mistake...', 'The data shows...', 'Unpopular opinion:', 'After X years...', 'Stop doing X', 'Why X is wrong' etc`

const COMMON_RULES = `Rules:
- Keep every output within 1 line only
- Make hooks strong, curiosity-driven, and engaging
- Match the user's niche, audience, and personal brand
- Avoid generic or repetitive ideas
- Optimize for shares, saves, comments, and profile visits
- Include realistic CTAs
- Make ideas feel modern and viral-ready for LinkedIn`

function today(): string {
  return new Date().toISOString().split("T")[0]
}
function yesterday(): string {
  return new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0]
}
function seed(): string {
  return Math.random().toString(36).substring(7)
}

// Mode A — auto-generated from profile. Based on the Postwise doc's Prompt 1A,
// with today's date, real-news context, anti-repetition, and a random seed added.
export function buildModeAPrompt(profile: Profile, realNews?: string): string {
  return `${realNewsBlock(realNews)}${formatProfile(profile)}

Generate 10 highly engaging LinkedIn post ideas based on the user's provided profile information, niche, audience, goals, tone, recent content, and writing style.

Today's date is ${today()}.

Structure:
- 3 Latest News ideas
- 3 Trending Topic ideas
- 3 Industry Topic ideas
- 1 Random but Relevant idea

${latestNewsInstruction(realNews)}

${OUTPUT_FORMAT}

${ANTI_REPETITION}

Random variation seed: ${seed()} — use this to ensure variety

${COMMON_RULES}`
}

// Mode B — topic-seeded. Based on the Postwise doc's Prompt 1B. ALL 10 ideas must
// tie back to the user's typed topic.
export function buildModeBPrompt(profile: Profile, topic: string, realNews?: string): string {
  return `${realNewsBlock(realNews)}${formatProfile(profile)}

The user has written the following in the "What type of post do you want?" field:
${topic}

Use this input as the primary seed for generating 10 highly engaging LinkedIn post ideas. Combine the user's input with their profile information, niche, audience, goals, tone, recent content, and writing style.

Today's date is ${today()}.

Interpretation rules:
- The user's input may be a topic, a rough thought, an event from their week, a question, an opinion, or a vague theme. Interpret it generously and turn it into post-ready angles.
- If the input is broad (e.g. "AI agents"), generate ideas across multiple angles within that topic.
- If the input is specific (e.g. "I lost a client last week because of a Slack misunderstanding"), generate ideas that all stay close to that exact moment, but vary in framing (story, lesson, hot take, framework).
- Always respect the user's profile, niche, and tone — do not drift into generic topics just because the input is short.

Structure:
- 3 Latest News ideas — connect the user's input to recent news, launches, or discussions in their niche from the past 48 hours (since ${yesterday()})
- 3 Trending Topic ideas — connect the user's input to trending themes on LinkedIn right now
- 3 Industry Topic ideas — evergreen angles on the user's input that are highly relevant to their industry
- 1 Random but Relevant idea — an unexpected angle on the user's input

${latestNewsInstruction(realNews)}

${OUTPUT_FORMAT}

${ANTI_REPETITION}

Random variation seed: ${seed()} — use this to ensure variety

Rules:
- Keep every output within 1 line only
- Make hooks strong, curiosity-driven, and engaging
- All 10 ideas must clearly tie back to the user's input — no off-topic ideas
- Match the user's niche, audience, and personal brand
- Avoid generic or repetitive ideas
- Optimize for shares, saves, comments, and profile visits
- Include realistic CTAs
- Make ideas feel modern and viral-ready for LinkedIn`
}

// More Ideas (Flow 2) — reuse the original mode's prompt and append a dedup hint.
export function buildMorePrompt(
  profile: Profile,
  topic: string | null,
  alreadyShown: string[],
  realNews?: string,
): string {
  const dedup =
    alreadyShown.length > 0
      ? `\n\nIMPORTANT: Do NOT repeat or rephrase any of these hooks already shown to the user:\n${alreadyShown.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n\nGenerate 10 brand new ideas following the same structure and rules above.`
      : ""

  const base = topic
    ? buildModeBPrompt(profile, topic, realNews)
    : buildModeAPrompt(profile, realNews)
  return `${base}${dedup}`
}
