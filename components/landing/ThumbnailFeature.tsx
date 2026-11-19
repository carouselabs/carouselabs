import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ImageIcon, LayoutTemplate, MessageCircleQuestion, UserRound } from "lucide-react"

const DIFFERENTIATORS = [
  {
    icon: MessageCircleQuestion,
    text: "Not just a prompt box — an intelligent conversation that asks what it needs to know",
  },
  {
    icon: LayoutTemplate,
    text: "Preserves what makes a thumbnail work: composition, hierarchy, contrast — not just style",
  },
  {
    icon: UserRound,
    text: "Upload your own photo to swap into the reference's exact layout",
  },
]

/**
 * A linked card in the More tools section (see app/(marketing)/page.tsx),
 * after anantgoyal.in's capability cards. Copy unchanged; the before/after
 * pair is a real reference → result made with the Thumbnail tool.
 */
export function ThumbnailFeature() {
  return (
    <article id="thumbnail" aria-labelledby="thumbnail-title" className="scroll-mt-24">
      <Link href="/thumbnail" className="lift group flex h-full flex-col rounded-[28px] bg-surface p-3 shadow-card ring-1 ring-[#100C33]/5">
        <div className="relative grid grid-cols-2 gap-3 overflow-hidden rounded-[20px] bg-[linear-gradient(150deg,#E9ECFF,#F3E9FF)] p-4 sm:p-5">
          {[
            { src: "/images/msedge_GxpOUT38VY.png", alt: "Reference YouTube thumbnail before recreation — a coding course thumbnail", label: "Reference" },
            { src: "/images/chrome_EVsJjSSheP.jpg", alt: "CarouseLabs-generated thumbnail result, same composition as the reference", label: "Result" },
          ].map((img) => (
            <div key={img.label} className="relative aspect-video overflow-hidden rounded-[14px] bg-surface shadow-float">
              <Image src={img.src} alt={img.alt} fill sizes="(max-width: 640px) 45vw, (max-width: 1024px) 45vw, 300px" className="zoom object-cover" />
              <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#100C33]">{img.label}</span>
            </div>
          ))}
          <span aria-hidden className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#100C33] text-white shadow-float">
            <ArrowRight className="size-4" />
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-4 pt-6 pb-4">
          <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand">
            <ImageIcon className="size-3.5" strokeWidth={2.2} aria-hidden />
            New — Thumbnail Recreation
          </p>
          <h3 id="thumbnail-title" className="text-2xl leading-[1.15] font-semibold tracking-[-0.03em] text-balance">
            Recreate Any YouTube Thumbnail — With Your Own Face, Your Own Content
          </h3>
          <p className="text-base leading-[1.55] text-ink-2">
            Upload a reference thumbnail you love. Tell us about your video. Our AI asks the right questions, then builds a thumbnail that
            matches the reference&apos;s proven composition — but with your actual content.
          </p>
          <p className="text-base leading-[1.55] text-ink-2">Same composition, hierarchy, and mood — new subject, new text.</p>
          <ul className="flex flex-col gap-3">
            {DIFFERENTIATORS.map((d) => (
              <li key={d.text} className="flex gap-3 text-[15px] leading-[1.5]">
                <d.icon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.9} aria-hidden />
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
          <span className="mt-auto inline-flex items-center gap-2 pt-2 text-[15px] font-medium text-foreground">
            <span className="link-draw">Try the Thumbnail Maker</span>
            <ArrowRight className="nudge size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </article>
  )
}
