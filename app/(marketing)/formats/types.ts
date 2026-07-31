// app/(marketing)/formats/types.ts
// Shared types for the format-type × topic SEO pages at /formats/[slug].

export interface FormatPage {
  slug: string // e.g. "carousel-ideas-for-networking"
  formatType:
    | "carousel-ideas"
    | "caption-examples"
    | "hook-examples"
    | "post-ideas"
    | "content-calendar"
    | "linkedin-post-examples"
  topic: string // e.g. "Networking"
  metaTitle: string
  metaDescription: string
  intro: string // 100-150 words
  items: string[] // 8-10 concrete ideas/examples/hooks specific to format+topic combo
  whyItWorks: string // 100-150 words on why this format+topic combo matters
  tips: string[] // 3-4 practical tips
  faq: { question: string; answer: string }[]
  relatedSlugs: string[]
}

export const FORMATS = [
  "carousel-ideas",
  "caption-examples",
  "hook-examples",
  "post-ideas",
  "content-calendar",
  "linkedin-post-examples",
] as const

export const FORMAT_LABELS: Record<(typeof FORMATS)[number], string> = {
  "carousel-ideas": "Carousel Ideas",
  "caption-examples": "Caption Examples",
  "hook-examples": "Hook Examples",
  "post-ideas": "Post Ideas",
  "content-calendar": "Content Calendar",
  "linkedin-post-examples": "LinkedIn Post Examples",
}

export const FORMAT_EMOJI: Record<(typeof FORMATS)[number], string> = {
  "carousel-ideas": "🎠",
  "caption-examples": "💬",
  "hook-examples": "🪝",
  "post-ideas": "💡",
  "content-calendar": "📅",
  "linkedin-post-examples": "📝",
}

export const TOPICS = [
  "networking",
  "career-change",
  "leadership",
  "productivity",
  "remote-work",
  "sales",
  "personal-finance",
  "mental-health-at-work",
  "job-searching",
  "startup-growth",
  "public-speaking",
  "time-management",
  "work-life-balance",
  "team-building",
  "customer-service",
  "innovation",
  "diversity-and-inclusion",
  "employee-engagement",
  "negotiation",
  "goal-setting",
  "mentorship",
  "personal-development",
  "resume-writing",
  "interview-tips",
  "salary-negotiation",
  "workplace-culture",
  "onboarding",
  "performance-reviews",
  "burnout-prevention",
  "career-pivot",
  "skill-development",
  "industry-trends",
  "thought-leadership",
  "professional-development",
  "workplace-communication",
  "personal-branding",
] as const

export function topicLabel(topicSlug: string): string {
  return topicSlug
    .split("-")
    .map((w) => (w === "and" ? "and" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
}
