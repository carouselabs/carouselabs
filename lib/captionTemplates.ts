// lib/captionTemplates.ts
// Proven caption frameworks for the Caption Only flow's structure selection
// screen, organized into categories rendered as tabs. "Auto" is not in this
// list — it's a top-level option, not a template.

export interface CaptionTemplate {
  id: string
  emoji: string
  name: string
  structure: string[]
  category: string
}

export const CATEGORY_ORDER = [
  "Narrative & Story",
  "Educational & Insight",
  "Problem-Focused",
  "Data & Analysis",
  "Engagement & Discussion",
  "Quick Format",
  "Business & Product",
  "Community & Celebration",
  "Tone-Specific",
]

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  // ── Narrative & Story ─────────────────────────────────────────
  {
    id: "storytelling",
    emoji: "📖",
    name: "Storytelling",
    category: "Narrative & Story",
    structure: ["Hook", "Set the Scene", "Challenge / Conflict", "Turning Point", "Lesson / Takeaway", "CTA"],
  },
  {
    id: "founder-journey",
    emoji: "👤",
    name: "Personal / Founder Journey",
    category: "Narrative & Story",
    structure: ["Hook", "Experience", "Challenge", "What Changed", "Lesson", "CTA"],
  },
  {
    id: "transformation",
    emoji: "🔄",
    name: "Before → After / Transformation",
    category: "Narrative & Story",
    structure: ["Hook", "Before", "What Changed", "After", "Key Takeaway", "CTA"],
  },
  {
    id: "behind-the-scenes",
    emoji: "🎬",
    name: "Behind the Scenes",
    category: "Narrative & Story",
    structure: ["Hook", "Context", "Process", "Challenges", "Outcome", "CTA"],
  },
  {
    id: "story-lesson",
    emoji: "📖",
    name: "Story + Lesson",
    category: "Narrative & Story",
    structure: ["Hook", "Story", "Turning Point", "Lesson", "Actionable Takeaway", "CTA"],
  },

  // ── Educational & Insight ─────────────────────────────────────
  {
    id: "educational",
    emoji: "🎓",
    name: "Educational",
    category: "Educational & Insight",
    structure: ["Hook", "Introduction", "Key Insight 1", "Key Insight 2", "Key Insight 3", "Summary", "CTA"],
  },
  {
    id: "framework",
    emoji: "🧩",
    name: "Framework / Step-by-Step",
    category: "Educational & Insight",
    structure: ["Hook", "Framework or Goal", "Step 1", "Step 2", "Step 3", "Step 4", "Result", "CTA"],
  },
  {
    id: "lessons-learned",
    emoji: "📚",
    name: "Lessons Learned",
    category: "Educational & Insight",
    structure: ["Hook", "Situation", "Lesson 1", "Lesson 2", "Lesson 3", "Final Thought", "CTA"],
  },
  {
    id: "reflection",
    emoji: "🌱",
    name: "Reflection",
    category: "Educational & Insight",
    structure: ["Hook", "What Happened", "Reflection", "What I Learned", "Moving Forward", "CTA"],
  },
  {
    id: "insight-post",
    emoji: "🧠",
    name: "Insight Post",
    category: "Educational & Insight",
    structure: ["Hook", "Insight", "Explanation", "Why It Matters", "Final Thought", "CTA"],
  },
  {
    id: "faq",
    emoji: "🔍",
    name: "FAQ",
    category: "Educational & Insight",
    structure: ["Question", "Direct Answer", "Explanation", "Example", "CTA"],
  },

  // ── Problem-Focused ───────────────────────────────────────────
  {
    id: "problem-solution",
    emoji: "🚨",
    name: "Problem → Solution",
    category: "Problem-Focused",
    structure: ["Hook", "The Problem", "Why It Matters", "The Solution", "Benefits / Outcome", "CTA"],
  },
  {
    id: "checklist",
    emoji: "✅",
    name: "Checklist",
    category: "Problem-Focused",
    structure: ["Hook", "Checklist Item 1", "Checklist Item 2", "Checklist Item 3", "Checklist Item 4", "Final Advice", "CTA"],
  },
  {
    id: "myth-reality",
    emoji: "❌",
    name: "Myth vs Reality",
    category: "Problem-Focused",
    structure: ["Hook", "Common Myth", "Reality", "Explanation", "Key Takeaway", "CTA"],
  },

  // ── Data & Analysis ───────────────────────────────────────────
  {
    id: "case-study",
    emoji: "📊",
    name: "Case Study / Success Story",
    category: "Data & Analysis",
    structure: ["Hook", "Background", "Problem", "Solution", "Results", "Lesson", "CTA"],
  },
  {
    id: "comparison",
    emoji: "⚖️",
    name: "Comparison",
    category: "Data & Analysis",
    structure: ["Hook", "Option A", "Option B", "Key Differences", "Recommendation", "CTA"],
  },
  {
    id: "data-breakdown",
    emoji: "📈",
    name: "Data Breakdown",
    category: "Data & Analysis",
    structure: ["Hook", "Data / Statistic", "Analysis", "Why It Matters", "Key Insight", "CTA"],
  },
  {
    id: "trend-analysis",
    emoji: "📉",
    name: "Trend Analysis",
    category: "Data & Analysis",
    structure: ["Hook", "Current Trend", "Why It's Happening", "Impact", "Prediction", "CTA"],
  },

  // ── Engagement & Discussion ───────────────────────────────────
  {
    id: "thought-leadership",
    emoji: "💡",
    name: "Thought Leadership / Opinion",
    category: "Engagement & Discussion",
    structure: ["Bold Hook", "Opinion", "Reasoning", "Supporting Insight", "Conclusion", "CTA"],
  },
  {
    id: "engagement",
    emoji: "💬",
    name: "Engagement / Discussion",
    category: "Engagement & Discussion",
    structure: ["Hook or Question", "Context", "Your Perspective", "Discussion Point", "Question to Audience"],
  },
  {
    id: "conversation-starter",
    emoji: "💬",
    name: "Conversation Starter",
    category: "Engagement & Discussion",
    structure: ["Bold Statement", "Context", "Your Perspective", "Open Discussion", "Question"],
  },
  {
    id: "question-first",
    emoji: "❓",
    name: "Question First",
    category: "Engagement & Discussion",
    structure: ["Question", "Why It Matters", "Your Perspective", "Supporting Insight", "CTA"],
  },

  // ── Quick Format ──────────────────────────────────────────────
  {
    id: "listicle",
    emoji: "📋",
    name: "Listicle / Tips",
    category: "Quick Format",
    structure: ["Hook", "1.", "2.", "3.", "4.", "5.", "Summary", "CTA"],
  },
  {
    id: "quick-tips",
    emoji: "🎯",
    name: "Quick Tips",
    category: "Quick Format",
    structure: ["Hook", "Tip 1", "Tip 2", "Tip 3", "Quick Summary", "CTA"],
  },

  // ── Business & Product ────────────────────────────────────────
  {
    id: "product-launch",
    emoji: "🚀",
    name: "Product / Launch / Announcement",
    category: "Business & Product",
    structure: ["Hook", "What Happened", "Why It Matters", "Key Features or Details", "Benefits", "CTA"],
  },
  {
    id: "product-update",
    emoji: "✨",
    name: "Product Update",
    category: "Business & Product",
    structure: ["Hook", "What's New", "Why We Built It", "Key Improvements", "Benefits", "CTA"],
  },
  {
    id: "build-in-public",
    emoji: "🔨",
    name: "Build in Public",
    category: "Business & Product",
    structure: ["Hook", "Current Progress", "What Worked", "What Didn't", "Next Steps", "CTA"],
  },
  {
    id: "product-showcase",
    emoji: "💼",
    name: "Product Showcase",
    category: "Business & Product",
    structure: ["Hook", "Product Introduction", "Key Features", "Benefits", "Use Cases", "CTA"],
  },
  {
    id: "resource-share",
    emoji: "🎁",
    name: "Resource Share",
    category: "Business & Product",
    structure: ["Hook", "Resource Introduction", "Why It's Valuable", "How To Use It", "CTA"],
  },
  {
    id: "brand-awareness",
    emoji: "📢",
    name: "Brand Awareness",
    category: "Business & Product",
    structure: ["Hook", "Brand Mission", "What We Believe", "How We Help", "Invitation", "CTA"],
  },

  // ── Community & Celebration ───────────────────────────────────
  {
    id: "community-post",
    emoji: "🤝",
    name: "Community Post",
    category: "Community & Celebration",
    structure: ["Hook", "Appreciation", "Community Highlight", "Invitation", "CTA"],
  },
  {
    id: "milestone",
    emoji: "🎉",
    name: "Milestone Celebration",
    category: "Community & Celebration",
    structure: ["Hook", "Milestone", "Journey", "Gratitude", "What's Next", "CTA"],
  },
  {
    id: "testimonial",
    emoji: "⭐",
    name: "Customer Testimonial",
    category: "Community & Celebration",
    structure: ["Hook", "Customer Background", "Challenge", "Solution", "Customer Result", "CTA"],
  },
  {
    id: "event-promotion",
    emoji: "📅",
    name: "Event Promotion",
    category: "Community & Celebration",
    structure: ["Hook", "Event Introduction", "Why Attend", "What You'll Learn", "Event Details", "CTA"],
  },

  // ── Tone-Specific ─────────────────────────────────────────────
  {
    id: "inspirational",
    emoji: "❤️",
    name: "Inspirational",
    category: "Tone-Specific",
    structure: ["Hook", "Inspiring Story", "Core Message", "Encouragement", "CTA"],
  },
  {
    id: "humorous",
    emoji: "😂",
    name: "Humorous",
    category: "Tone-Specific",
    structure: ["Funny Hook", "Situation", "Punchline", "Relatable Insight", "CTA"],
  },
]

export function getTemplatesByCategory(): Record<string, CaptionTemplate[]> {
  const grouped: Record<string, CaptionTemplate[]> = {}
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = CAPTION_TEMPLATES.filter((t) => t.category === cat)
  }
  return grouped
}
