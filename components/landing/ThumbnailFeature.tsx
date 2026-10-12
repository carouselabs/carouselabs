import Link from "next/link"
import Image from "next/image"
import { ArrowRight, MessageCircleQuestion, LayoutTemplate, UserRound, ImageIcon } from "lucide-react"
import { AnimatedSection, AnimatedScale } from "@/components/marketing/AnimatedSection"

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

export function ThumbnailFeature() {
  return (
    <section className="py-24 px-6 bg-[#FBFAF6]">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        <AnimatedSection className="flex flex-col gap-4 text-center items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#DC2626]">
            <ImageIcon size={12} strokeWidth={2.2} />
            New — Thumbnail Recreation
          </div>
          <h2 className="max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A] leading-[1.15]">
            Recreate Any YouTube Thumbnail — With Your Own Face, Your Own Content
          </h2>
          <p className="max-w-2xl text-[15px] text-[#6B7280] leading-[1.7]">
            Upload a reference thumbnail you love. Tell us about your video. Our AI asks the right
            questions, then builds a thumbnail that matches the reference&apos;s proven composition —
            but with your actual content.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {DIFFERENTIATORS.map((d, i) => (
            <AnimatedScale
              key={d.text}
              delay={i * 0.08}
              className="flex flex-col items-start gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-white"
            >
              <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                <d.icon size={19} className="text-[#7C3AED]" strokeWidth={1.8} />
              </div>
              <p className="text-[14px] text-[#3F3F46] leading-[1.6]">{d.text}</p>
            </AnimatedScale>
          ))}
        </div>

        {/* Before/after showcase — a real reference -> result pair generated
            with the Thumbnail tool. */}
        <AnimatedSection>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <figure className="flex flex-col gap-2">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#E5E3DE] bg-white">
                  <Image
                    src="/images/msedge_GxpOUT38VY.png"
                    alt="Reference YouTube thumbnail before recreation — a coding course thumbnail"
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-center text-[12.5px] font-semibold text-[#7C3AED]">
                  Reference
                </figcaption>
              </figure>
              <figure className="flex flex-col gap-2">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#E5E3DE] bg-white">
                  <Image
                    src="/images/chrome_EVsJjSSheP.jpg"
                    alt="CarouseLabs-generated thumbnail result, same composition as the reference"
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-center text-[12.5px] font-semibold text-[#7C3AED]">
                  Result
                </figcaption>
              </figure>
            </div>
            <p className="text-center text-[13px] text-[#9CA3AF] leading-[1.6]">
              Same composition, hierarchy, and mood — new subject, new text.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="flex flex-col items-center gap-3">
          <Link
            href="/thumbnail"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
          >
            Try the Thumbnail Maker
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
        </AnimatedSection>
      </div>
    </section>
  )
}
