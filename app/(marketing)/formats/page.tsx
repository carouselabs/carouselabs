import type { Metadata } from "next"
import { FORMAT_PAGES } from "./data"
import { FormatsHub } from "./FormatsHub"

const BASE_URL = "https://carouselabs.com"
const TITLE = `${FORMAT_PAGES.length} LinkedIn Content Formats & Ideas — CarouseLabs`
const DESCRIPTION = `Carousel ideas, caption examples, hooks, post ideas, content calendars, and post examples for ${FORMAT_PAGES.length} topic combinations. Find the exact format you need.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/formats` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/formats`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function FormatsIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    numberOfItems: FORMAT_PAGES.length,
    itemListElement: FORMAT_PAGES.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.metaTitle,
      url: `${BASE_URL}/formats/${p.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <FormatsHub />
    </>
  )
}
