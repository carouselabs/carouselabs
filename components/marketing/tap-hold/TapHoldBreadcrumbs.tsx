import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { TAP_HOLD_CATEGORY_LABELS, type TapHoldCategory } from "@/app/(marketing)/tap-hold/types"

type TapHoldBreadcrumbsProps = {
  category: TapHoldCategory
  h1: string
}

/** Home > Tap & Hold Image Maker > Category > current article. Doubles as internal-linking to the parent category and home. */
export function TapHoldBreadcrumbs({ category, h1 }: TapHoldBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="px-6 pt-6">
      <ol className="max-w-3xl mx-auto flex flex-wrap items-center gap-1.5 text-[13px] text-[#6B7280]">
        <li>
          <Link href="/" className="hover:text-[#7C3AED] transition-colors">
            Home
          </Link>
        </li>
        <ChevronRight size={13} className="text-[#C4B5FD]" />
        <li>
          <Link href="/tools/tap-hold-maker" className="hover:text-[#7C3AED] transition-colors">
            Tap &amp; Hold Image Maker
          </Link>
        </li>
        <ChevronRight size={13} className="text-[#C4B5FD]" />
        <li>
          <Link href={`/tap-hold#${category}`} className="hover:text-[#7C3AED] transition-colors">
            {TAP_HOLD_CATEGORY_LABELS[category]}
          </Link>
        </li>
        <ChevronRight size={13} className="text-[#C4B5FD]" />
        <li className="font-medium text-[#3F3F46] truncate max-w-[240px] sm:max-w-none" aria-current="page">
          {h1}
        </li>
      </ol>
    </nav>
  )
}

export function buildBreadcrumbJsonLd(category: TapHoldCategory, h1: string, slug: string) {
  const base = "https://carouselabs.com"
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Tap & Hold Image Maker", item: `${base}/tools/tap-hold-maker` },
      { "@type": "ListItem", position: 3, name: TAP_HOLD_CATEGORY_LABELS[category], item: `${base}/tap-hold#${category}` },
      { "@type": "ListItem", position: 4, name: h1, item: `${base}/tap-hold/${slug}` },
    ],
  }
}
