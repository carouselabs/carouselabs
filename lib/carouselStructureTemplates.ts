// lib/carouselStructureTemplates.ts
// Slide-flow frameworks for the Carousel format's structure selection screen
// (own-idea only), organized into categories rendered as tabs.

export interface CarouselStructureTemplate {
  id: string
  name: string
  slides: string[]
  category: string
}

export const CAROUSEL_STRUCTURE_TEMPLATES: CarouselStructureTemplate[] = [
  { id: "problem-solution", name: "Problem → Solution", category: "Problem-Focused",
    slides: ["Hook", "Problem", "Why it Matters", "Solution", "Action Steps", "Example", "Summary", "CTA"] },
  { id: "before-after", name: "Before → After", category: "Transformation",
    slides: ["Hook", "Current State", "Pain", "Turning Point", "New State", "Benefits", "Takeaway", "CTA"] },
  { id: "myth-truth", name: "Myth → Truth", category: "Myth-Busting",
    slides: ["Hook", "Myth", "Why It's Wrong", "Evidence", "Truth", "Example", "Summary", "CTA"] },
  { id: "framework", name: "Framework", category: "Framework & Structure",
    slides: ["Hook", "Framework Intro", "Pillar 1", "Pillar 2", "Pillar 3", "Implementation", "Recap", "CTA"] },
  { id: "step-by-step", name: "Step-by-Step Guide", category: "Framework & Structure",
    slides: ["Hook", "Overview", "Step 1", "Step 2", "Step 3", "Checklist", "Summary", "CTA"] },
  { id: "comparison", name: "Comparison", category: "Comparison",
    slides: ["Hook", "Option A", "Option B", "Side-by-Side", "Winner", "When A", "When B", "CTA"] },
  { id: "timeline", name: "Timeline", category: "Timeline & Planning",
    slides: ["Hook", "Beginning", "Stage 2", "Stage 3", "Stage 4", "Present", "Future", "CTA"] },
  { id: "case-study", name: "Case Study", category: "Case Study & Analysis",
    slides: ["Hook", "Background", "Problem", "Strategy", "Execution", "Results", "Lessons", "CTA"] },
  { id: "storytelling", name: "Storytelling", category: "Narrative",
    slides: ["Hook", "Scene", "Conflict", "Turning Point", "Resolution", "Lesson", "Takeaway", "CTA"] },
  { id: "listicle", name: "Listicle", category: "Quick Format",
    slides: ["Hook", "Point 1", "Point 2", "Point 3", "Point 4", "Point 5", "Summary", "CTA"] },
  { id: "mistakes", name: "Mistakes", category: "Problem-Focused",
    slides: ["Hook", "Mistake 1", "Mistake 2", "Mistake 3", "Fix", "Example", "Summary", "CTA"] },
  { id: "playbook", name: "Playbook", category: "Framework & Structure",
    slides: ["Hook", "Goal", "Rule 1", "Rule 2", "Rule 3", "Execution", "Results", "CTA"] },
  { id: "operating-system", name: "Operating System", category: "Framework & Structure",
    slides: ["Hook", "Inputs", "Process", "Output", "Optimization", "Repeat Loop", "Summary", "CTA"] },
  { id: "decision-tree", name: "Decision Tree", category: "Decision & Logic",
    slides: ["Hook", "Question", "Path A", "Path B", "Path C", "Recommendation", "Summary", "CTA"] },
  { id: "pyramid", name: "Pyramid", category: "Hierarchy",
    slides: ["Hook", "Foundation", "Layer 2", "Layer 3", "Layer 4", "Peak", "Summary", "CTA"] },
  { id: "anatomy-breakdown", name: "Anatomy Breakdown", category: "Case Study & Analysis",
    slides: ["Hook", "Overview", "Part 1", "Part 2", "Part 3", "Connections", "Summary", "CTA"] },
  { id: "reverse-engineering", name: "Reverse Engineering", category: "Case Study & Analysis",
    slides: ["Hook", "End Result", "Step Back 1", "Step Back 2", "Origin", "Rebuild", "Summary", "CTA"] },
  { id: "faq", name: "FAQ", category: "Quick Format",
    slides: ["Hook", "Question 1", "Answer", "Question 2", "Answer", "Question 3", "Summary", "CTA"] },
  { id: "swipe-file", name: "Swipe File", category: "Inspiration & Proof",
    slides: ["Hook", "Example 1", "Why It Works", "Example 2", "Why It Works", "Template", "CTA"] },
  { id: "challenge", name: "Challenge", category: "Timeline & Planning",
    slides: ["Hook", "Challenge", "Rules", "Daily Plan", "Progress", "Results", "Lessons", "CTA"] },
  { id: "checklist", name: "Checklist", category: "Quick Format",
    slides: ["Hook", "Checklist Intro", "Item 1", "Item 2", "Item 3", "Item 4", "Summary", "CTA"] },
  { id: "pros-cons", name: "Pros & Cons", category: "Comparison",
    slides: ["Hook", "Pros", "Cons", "Trade-offs", "Recommendation", "Summary", "CTA"] },
  { id: "roadmap", name: "Roadmap", category: "Timeline & Planning",
    slides: ["Hook", "Destination", "Milestone 1", "Milestone 2", "Milestone 3", "Next Steps", "CTA"] },
  { id: "growth-journey", name: "Growth Journey", category: "Transformation",
    slides: ["Hook", "Starting Point", "Obstacle", "Experiment", "Breakthrough", "Scale", "CTA"] },
  { id: "matrix", name: "Matrix", category: "Decision & Logic",
    slides: ["Hook", "Axes", "Quadrant 1", "Quadrant 2", "Quadrant 3", "Quadrant 4", "CTA"] },
  { id: "recipe", name: "Recipe", category: "Framework & Structure",
    slides: ["Hook", "Ingredients", "Step 1", "Step 2", "Step 3", "Finished Result", "CTA"] },
  { id: "cheat-sheet", name: "Cheat Sheet", category: "Quick Format",
    slides: ["Hook", "Core Rule", "Tip 1", "Tip 2", "Tip 3", "Quick Recap", "CTA"] },
  { id: "debunking", name: "Debunking", category: "Myth-Busting",
    slides: ["Hook", "Claim", "Evidence", "Reality", "Correct Action", "Summary", "CTA"] },
  { id: "buyer-journey", name: "Buyer Journey", category: "Transformation",
    slides: ["Hook", "Awareness", "Consideration", "Decision", "Onboarding", "Success", "CTA"] },
  { id: "build-in-public", name: "Build in Public", category: "Inspiration & Proof",
    slides: ["Hook", "Goal", "Progress", "Wins", "Failures", "Lessons", "Next Steps", "CTA"] },
]

export const CAROUSEL_CATEGORY_ORDER = [
  "Problem-Focused",
  "Transformation",
  "Myth-Busting",
  "Framework & Structure",
  "Comparison",
  "Timeline & Planning",
  "Case Study & Analysis",
  "Narrative",
  "Quick Format",
  "Decision & Logic",
  "Hierarchy",
  "Inspiration & Proof",
]

export function getCarouselTemplatesByCategory(): Record<string, CarouselStructureTemplate[]> {
  const grouped: Record<string, CarouselStructureTemplate[]> = {}
  for (const cat of CAROUSEL_CATEGORY_ORDER) {
    grouped[cat] = CAROUSEL_STRUCTURE_TEMPLATES.filter((t) => t.category === cat)
  }
  return grouped
}
