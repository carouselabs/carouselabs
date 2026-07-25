import Link from "next/link"
import { ArrowRight, Wand2 } from "lucide-react"
import { TAP_HOLD_CATEGORY_LABELS, type TapHoldCategory } from "@/app/(marketing)/tap-hold/types"

type RelatedArticle = {
  slug: string
  h1: string
  category: TapHoldCategory
}

type TapHoldRelatedArticlesProps = {
  related: RelatedArticle[]
  category: TapHoldCategory
}

/** Internal-linking hub: related articles, parent category, home, and the tool itself. */
export function TapHoldRelatedArticles({ related, category }: TapHoldRelatedArticlesProps) {
  return (
    <section className="px-6 pb-24">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <h2 className="text-center text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
          Related Tap &amp; Hold Articles
        </h2>

        {related.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/tap-hold/${r.slug}`}
                className="group h-full flex flex-col justify-between gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
              >
                <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">{r.h1}</span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                  Read the article
                  <ArrowRight size={14} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href={`/tap-hold#${category}`}
            className="group flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
          >
            <span className="text-[15px] font-semibold text-[#7C3AED]">
              More {TAP_HOLD_CATEGORY_LABELS[category]} articles
            </span>
            <ArrowRight size={16} strokeWidth={2.2} className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/tap-hold"
            className="group flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
          >
            <span className="text-[15px] font-semibold text-[#7C3AED]">Browse all Tap &amp; Hold guides</span>
            <ArrowRight size={16} strokeWidth={2.2} className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/tools/tap-hold-maker"
            className="group flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#C4B5FD] bg-white hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
          >
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#1F2937]">
              <Wand2 size={16} strokeWidth={2.2} className="text-[#7C3AED]" />
              Open the Image Maker
            </span>
            <ArrowRight size={16} strokeWidth={2.2} className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  )
}
