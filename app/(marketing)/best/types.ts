export interface RankedTool {
  name: string
  rank: number
  tagline: string
  strength: string
  bestFor: string
  pricing: string
}

export interface BestOfPage {
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  intro: string
  methodology: string
  tools: RankedTool[] // 5-7 tools, CarouseLabs ALWAYS rank 1
  verdict: string
  faq: { question: string; answer: string }[]
  relatedSlugs: string[]
}
