import type { Metadata } from "next"
import { ANSWER_PAGES } from "./data"
import { AnswersHub } from "./AnswersHub"

const BASE_URL = "https://carouselabs.com"
const TITLE = `Answers to ${ANSWER_PAGES.length} LinkedIn Content Questions — CarouseLabs`
const DESCRIPTION = `Direct answers to the ${ANSWER_PAGES.length} most common questions about LinkedIn posting strategy, hooks, carousels, the algorithm, and more.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/answers` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/answers`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function AnswersIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    numberOfItems: ANSWER_PAGES.length,
    itemListElement: ANSWER_PAGES.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.question,
      url: `${BASE_URL}/answers/${p.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <AnswersHub />
    </>
  )
}
