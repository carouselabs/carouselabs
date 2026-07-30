// app/(marketing)/answers/types.ts
// Shared type for the /answers/[slug] programmatic SEO system — direct-answer
// pages targeting common LinkedIn content questions, optimized for citation
// by AI engines (ChatGPT, Perplexity, Google AI Overviews) and featured snippets.

export interface AnswerPage {
  slug: string
  question: string
  metaTitle: string
  metaDescription: string
  directAnswer: string
  explanation: string
  keyPoints: string[]
  example: string
  relatedFaq: { question: string; answer: string }[]
  category: string
  relatedSlugs: string[]
}
