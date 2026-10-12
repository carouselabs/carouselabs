// EXAMPLE CONTENT shared by both layout directions, so they can be compared
// fairly. Fictional people; nothing here is sent anywhere.

import { CREDIT_COSTS } from "@/lib/creditActions"
import { exampleIdeas } from "../../_demo/data"

export const ideas = exampleIdeas
export const selectedIdeaId = "i4"

export const author = { name: "Aarav Mehta", role: "Founder, Northwind Analytics", initials: "AM" }
export const topic = "Customer onboarding"

export const ideaContext: Record<string, { angle: string; fit: string }> = {
  i1: { angle: "Explain a rule change and what to do next", fit: "Founders in your audience will have to act on it" },
  i2: { angle: "Turn a hiring headline into practical changes", fit: "Hiring is one of your recurring topics" },
  i3: { angle: "A calm counterpoint to launch hype", fit: "Positions you as the practical voice" },
  i4: { angle: "A common onboarding mistake, told as a short list", fit: "You write for SaaS founders who fight churn" },
  i5: { angle: "A personal change with an unexpected result", fit: "Stories perform best in your conversational tone" },
  i6: { angle: "Challenge a default everyone copies", fit: "Matches your bold-but-practical voice" },
  i7: { angle: "One principle, explained with examples", fit: "Your audience is evaluating tools right now" },
  i8: { angle: "A small habit with a big lesson", fit: "Builds trust with operators and founders" },
  i9: { angle: "A checklist readers can apply today", fit: "Practical lists suit your educational goal" },
  i10: { angle: "Something lighter for your audience", fit: "Breaks up a run of tactical posts" },
}

export const breakdownPoints = [
  "Most users don't quit after the first login — they quit when day two gives them nothing to do.",
  "One useful email beats a five-email sequence nobody reads.",
  "Show the first win before asking for setup.",
  "Make the next step obvious, then get out of the way.",
]

export const hookVariations = [
  "Your users don't leave on day one. They leave on day two.",
  "Day one is the honeymoon. Day two is where you lose them.",
  "We kept fixing signup. The real drop-off was the next morning.",
]

export const caption = `Your users don't leave on day one. They leave on day two.

Day one is easy — they're curious, they click around. Day two is when they decide whether you're worth coming back to.

Three small changes that make day two count:

1. Send one useful email, not five.
2. Show the first win before asking for setup.
3. Make the next step obvious — one button, one sentence.

What does day two look like in your product?`

export const slides = [
  { kicker: "Onboarding", title: "Day two decides everything." },
  { kicker: "The problem", title: "Most users don't quit on day one." },
  { kicker: "Fix 1", title: "Send one useful email, not five." },
  { kicker: "Fix 2", title: "Show the first win before setup." },
  { kicker: "Fix 3", title: "Make the next step obvious." },
  { kicker: "Try this", title: "Ask one question. Then listen." },
  { kicker: "Checklist", title: "Your day-two checklist." },
  { kicker: "Aarav Mehta", title: "Follow for more on SaaS growth." },
]

export const formats = [
  { id: "caption", title: "Caption Only", description: "A scroll-stopping caption, ready to post.", cost: CREDIT_COSTS.caption_only, pro: false },
  { id: "image", title: "Image + Caption", description: "Caption and a single AI-generated visual.", cost: CREDIT_COSTS.image_caption, pro: false },
  { id: "carousel", title: "Caption + Slides", description: "Caption and a full 7–8 slide carousel.", cost: CREDIT_COSTS.carousel, pro: true },
] as const
export type FormatId = (typeof formats)[number]["id"]

export const tones = [
  { id: "Analytical", hint: "Data-led, logical" },
  { id: "Candid", hint: "Direct, honest" },
  { id: "Playful", hint: "Light, witty" },
  { id: "Authoritative", hint: "Expert, confident" },
  { id: "Story-driven", hint: "Narrative, emotional" },
] as const

export const ratios = [
  { id: "4:5", label: "4:5 Portrait", hint: "Best for LinkedIn feed" },
  { id: "1:1", label: "1:1 Square", hint: "Classic format" },
] as const
export type RatioId = (typeof ratios)[number]["id"]

export const flowSteps = ["Idea", "Breakdown", "Format", "Write", "Design", "Publish"]

export const suggestedSlot = "Tue, Oct 14 · 9:00 AM"

export const engageExample = {
  postAuthor: "Priya Nair",
  postRole: "Head of Growth",
  post: "We cut our onboarding emails from seven to two. Activation didn't drop — it went up. Still figuring out why.",
  draft:
    "Day two is where we lost people too. One plain email with a single next step did more than our whole sequence. Curious which two you kept?",
}

export const regenerateCost = CREDIT_COSTS.text_regen
