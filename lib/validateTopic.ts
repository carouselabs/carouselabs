// Keeps CarouseLabs focused on social-media content creation. This is a
// heuristic guard against using it as a general-purpose AI assistant — it
// blocks clear off-topic / assistant-style requests (code, homework, recipes,
// translation, website building, etc.) while staying lenient on real content
// topics. It errs toward letting genuine content ideas through.

export const INVALID_TOPIC_MESSAGE =
  "CarouseLabs is a social media content creation tool — not a general AI assistant. Try a content idea about your niche instead, like a trend, a lesson, a story, or a hot take for your audience."

const BLOCK_PATTERNS: RegExp[] = [
  // ── Programming / coding ──
  /\bwrite\s+(me\s+)?(a\s+|some\s+)?(code|program|script|function|api|website|web\s?app)\b/i,
  /\b(fix|debug|refactor|optimi[sz]e)\s+(this\s+|my\s+|a\s+|the\s+)?(bug|code|error|program|script|function|app)\b/i,
  /\b(programming|coding|leetcode|compile|runtime error|syntax error|stack\s?trace|stack overflow)\b/i,
  /\b(python|javascript|typescript|golang|c\+\+|c#|html|css|sql)\b.*\b(code|script|program|function|loop|array|variable|api|query|error)\b/i,
  /\bbuild\s+(me\s+)?(a\s+|the\s+)?(website|web\s?app|web\s?site|mobile app|application|landing page|game|chat\s?bot|bot)\b/i,

  // ── Academic / homework ──
  /\b(homework|assignment|essay|thesis|dissertation|term paper|book report|exam answers?)\b/i,
  /\b(math|maths|calculus|algebra|geometry|physics|chemistry|biology)\s+(problem|homework|question|equation|answer)\b/i,
  /\bsolve\s+(this\s+|my\s+|the\s+)?(equation|problem|integral|derivative|for\s+x)\b/i,

  // ── General-assistant tasks ──
  /\b(recipe|how to cook|how to bake|ingredients for)\b/i,
  /\btranslate\s+(this|that|the following|to|into|from)\b/i,
  /\b(convert|conversion of)\b.*\b(currency|km|miles|kg|pounds|celsius|fahrenheit|usd|eur|inr)\b/i,
  /\b(weather|forecast)\b.*\b(today|tomorrow|right now|in|for)\b/i,
  /\b(song lyrics|guitar tabs|chord progression)\b/i,
]

export function validateContentTopic(text: string): { valid: boolean; error?: string } {
  const t = (text ?? "").trim()
  if (!t) return { valid: true } // emptiness is handled by the caller

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(t)) {
      return { valid: false, error: INVALID_TOPIC_MESSAGE }
    }
  }
  return { valid: true }
}
