// lib/imageStructureTemplates.ts
// Visual layout frameworks for the Image + Caption flow's image structure
// selection screen (own-idea only), organized into categories rendered as tabs.

export interface ImageStructureTemplate {
  id: string
  name: string
  description: string
  category: string
}

export const IMAGE_CATEGORY_ORDER = [
  "Data & Analysis",
  "Bold & Simple",
  "Educational & Process",
  "Collections & Grids",
  "Timeline & Planning",
  "Concept & Structure",
  "Story & Case Study",
]

export const IMAGE_STRUCTURE_TEMPLATES: ImageStructureTemplate[] = [
  {
    id: "infographic",
    name: "Infographic",
    category: "Data & Analysis",
    description:
      "Information split into multiple sections with icons, illustrations, charts and small explanations. Great for educational posts.",
  },
  {
    id: "hero-cards",
    name: "Hero + Cards",
    category: "Concept & Structure",
    description:
      "Large hero illustration at the top with multiple information cards below. Great for tools, features, resources.",
  },
  {
    id: "big-question",
    name: "Big Question",
    category: "Bold & Simple",
    description:
      "Huge question dominates the image. Supporting visuals and answers below. Creates curiosity.",
  },
  {
    id: "big-statement",
    name: "Big Statement / Poster",
    category: "Bold & Simple",
    description:
      "One bold statement is the hero. Minimal supporting visuals. Looks like a modern poster.",
  },
  {
    id: "collection-gallery",
    name: "Collection / Gallery",
    category: "Collections & Grids",
    description:
      "Shows many items together (tools, books, apps, websites, logos) with little or no explanation.",
  },
  {
    id: "grid-layout",
    name: "Grid Layout",
    category: "Collections & Grids",
    description:
      "Information displayed in equal-sized cards arranged in rows and columns. Clean and easy to scan.",
  },
  {
    id: "comparison-board",
    name: "Comparison Board",
    category: "Data & Analysis",
    description: "Split screen comparing two or more options side by side.",
  },
  {
    id: "timeline",
    name: "Timeline",
    category: "Timeline & Planning",
    description:
      "Information flows from past to future using milestones connected by a line.",
  },
  {
    id: "roadmap",
    name: "Roadmap",
    category: "Timeline & Planning",
    description: "Future-focused timeline divided into phases, quarters or stages.",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    category: "Data & Analysis",
    description: "Looks like an analytics dashboard with cards, graphs, KPIs and metrics.",
  },
  {
    id: "framework-diagram",
    name: "Framework Diagram",
    category: "Educational & Process",
    description:
      "Visual framework using circles, layers, pyramids or connected blocks to explain a model.",
  },
  {
    id: "process-flow",
    name: "Process Flow",
    category: "Educational & Process",
    description: "Sequential boxes connected by arrows showing how something works.",
  },
  {
    id: "mind-map",
    name: "Mind Map / Ecosystem",
    category: "Concept & Structure",
    description: "One central idea with branches expanding into related concepts.",
  },
  {
    id: "checklist",
    name: "Checklist / Cheat Sheet",
    category: "Educational & Process",
    description:
      "Quick reference image with checkboxes, commands, formulas or short tips. Designed to be saved.",
  },
  {
    id: "magazine-cover",
    name: "Magazine Cover / Editorial",
    category: "Bold & Simple",
    description:
      "Large typography, premium illustration, very little text. Looks like the cover of a magazine.",
  },
  {
    id: "blueprint",
    name: "Blueprint / Technical Diagram",
    category: "Educational & Process",
    description: "Engineering-style visual with labels, callouts and technical annotations.",
  },
  {
    id: "story-board",
    name: "Story Board",
    category: "Story & Case Study",
    description:
      "Information arranged like a story with beginning, middle and end using visuals.",
  },
  {
    id: "case-study-layout",
    name: "Case Study Layout",
    category: "Story & Case Study",
    description:
      "Presents one example with problem, approach and results using cards and highlights.",
  },
  {
    id: "logo-wall",
    name: "Logo Wall / Brand Wall",
    category: "Collections & Grids",
    description:
      "A collection of logos, icons or products with almost no explanation. Best for 'Top AI Tools', 'Best Websites', etc.",
  },
  {
    id: "visual-report",
    name: "Visual Report",
    category: "Data & Analysis",
    description:
      "A professional report style combining charts, statistics, callouts and conclusions in one image.",
  },
]

export function getImageTemplatesByCategory(): Record<string, ImageStructureTemplate[]> {
  const grouped: Record<string, ImageStructureTemplate[]> = {}
  for (const cat of IMAGE_CATEGORY_ORDER) {
    grouped[cat] = IMAGE_STRUCTURE_TEMPLATES.filter((t) => t.category === cat)
  }
  return grouped
}
