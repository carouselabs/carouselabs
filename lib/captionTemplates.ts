// lib/captionTemplates.ts
// Proven caption frameworks for the Caption Only flow's structure selection
// screen. "Auto" is not in this list — it's a top-level option, not a template.

export interface CaptionTemplate {
  id: string
  emoji: string
  name: string
  structure: string[]
}

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: "storytelling",
    emoji: "📖",
    name: "Storytelling",
    structure: ["Hook", "Set the Scene", "Challenge / Conflict", "Turning Point", "Lesson / Takeaway", "CTA"],
  },
  {
    id: "educational",
    emoji: "🎓",
    name: "Educational",
    structure: ["Hook", "Introduction", "Key Insight 1", "Key Insight 2", "Key Insight 3", "Summary", "CTA"],
  },
  {
    id: "problem-solution",
    emoji: "🚨",
    name: "Problem → Solution",
    structure: ["Hook", "The Problem", "Why It Matters", "The Solution", "Benefits / Outcome", "CTA"],
  },
  {
    id: "listicle",
    emoji: "📋",
    name: "Listicle / Tips",
    structure: ["Hook", "1.", "2.", "3.", "4.", "5.", "Summary", "CTA"],
  },
  {
    id: "framework",
    emoji: "🧩",
    name: "Framework / Step-by-Step",
    structure: ["Hook", "Framework or Goal", "Step 1", "Step 2", "Step 3", "Step 4", "Result", "CTA"],
  },
  {
    id: "thought-leadership",
    emoji: "💡",
    name: "Thought Leadership / Opinion",
    structure: ["Bold Hook", "Opinion", "Reasoning", "Supporting Insight", "Conclusion", "CTA"],
  },
  {
    id: "case-study",
    emoji: "📊",
    name: "Case Study / Success Story",
    structure: ["Hook", "Background", "Problem", "Solution", "Results", "Lesson", "CTA"],
  },
  {
    id: "product-launch",
    emoji: "🚀",
    name: "Product / Launch / Announcement",
    structure: ["Hook", "What Happened", "Why It Matters", "Key Features or Details", "Benefits", "CTA"],
  },
  {
    id: "founder-journey",
    emoji: "👤",
    name: "Personal / Founder Journey",
    structure: ["Hook", "Experience", "Challenge", "What Changed", "Lesson", "CTA"],
  },
  {
    id: "transformation",
    emoji: "🔄",
    name: "Before → After / Transformation",
    structure: ["Hook", "Before", "What Changed", "After", "Key Takeaway", "CTA"],
  },
  {
    id: "engagement",
    emoji: "💬",
    name: "Engagement / Discussion",
    structure: ["Hook or Question", "Context", "Your Perspective", "Discussion Point", "Question to Audience"],
  },
]
