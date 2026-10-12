import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MessageCircleQuestion, LayoutTemplate, UserRound, ImageIcon } from "lucide-react"

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

/** Panel in the tools section (see app/(marketing)/page.tsx). Copy unchanged. */
export function ThumbnailFeature() {
  return (
    <article id="thumbnail" aria-labelledby="thumbnail-title" className="flex scroll-mt-20 flex-col gap-6 rounded-showcase border border-border bg-surface p-5 sm:p-8">
      {/* Before/after showcase — a real reference -> result pair generated with the Thumbnail tool. */}
      <figure className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { src: "/images/msedge_GxpOUT38VY.png", alt: "Reference YouTube thumbnail before recreation — a coding course thumbnail", label: "Reference" },
            { src: "/images/chrome_EVsJjSSheP.jpg", alt: "CarouseLabs-generated thumbnail result, same composition as the reference", label: "Result" },
          ].map((img) => (
            <div key={img.label} className="flex flex-col gap-2">
              <div className="relative aspect-video overflow-hidden rounded-control border border-border bg-surface-raised">
                <Image src={img.src} alt={img.alt} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 45vw, 30vw" className="object-cover" />
              </div>
              <span className="text-caption font-medium text-muted-foreground">{img.label}</span>
            </div>
          ))}
        </div>
        <figcaption className="text-label text-muted-foreground">Same composition, hierarchy, and mood — new subject, new text.</figcaption>
      </figure>

      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-1.5 text-label font-medium text-brand">
          <ImageIcon className="size-3.5" strokeWidth={2.2} aria-hidden />
          New — Thumbnail Recreation
        </p>
        <h2 id="thumbnail-title" className="text-title-sm font-semibold text-balance sm:text-title">
          Recreate Any YouTube Thumbnail — With Your Own Face, Your Own Content
        </h2>
        <p className="text-body text-muted-foreground">
          Upload a reference thumbnail you love. Tell us about your video. Our AI asks the right questions, then builds a thumbnail that
          matches the reference&apos;s proven composition — but with your actual content.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {DIFFERENTIATORS.map((d) => (
          <li key={d.text} className="flex gap-3 text-label">
            <d.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
            <span>{d.text}</span>
          </li>
        ))}
      </ul>

      <Link href="/thumbnail" className="mt-auto inline-flex items-center gap-1.5 self-start text-label font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
        Try the Thumbnail Maker
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  )
}
