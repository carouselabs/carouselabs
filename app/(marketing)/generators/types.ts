// app/(marketing)/generators/types.ts
// Shared type for the /generators/[slug] programmatic SEO system — generic
// product/feature keyword pages ("LinkedIn carousel maker", "AI caption
// generator"), distinct from the audience-specific /tools/[slug] pages.

export interface GeneratorPage {
  slug: string
  keyword: string
  h1: string
  metaTitle: string
  metaDescription: string
  intro: string
  howItWorks: { step: string; description: string }[]
  useCases: string[]
  faq: { question: string; answer: string }[]
  relatedSlugs: string[]
}
