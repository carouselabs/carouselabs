import type { Metadata } from "next"
import { SPEED_PAGES } from "./data"
import { SpeedHub } from "./SpeedHub"

const BASE_URL = "https://carouselabs.com"
const TITLE = `${SPEED_PAGES.length} Ways to Create LinkedIn Content Fast — CarouseLabs`
const DESCRIPTION = `Carousels, captions, hooks, content calendars, post ideas, and images — in 5 minutes or less. ${SPEED_PAGES.length} speed-focused pages for every professional and format.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/speed` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/speed`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function SpeedIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    numberOfItems: SPEED_PAGES.length,
    itemListElement: SPEED_PAGES.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.metaTitle,
      url: `${BASE_URL}/speed/${p.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <SpeedHub />
    </>
  )
}
