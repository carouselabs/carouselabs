import Link from "next/link"
import { ArrowRight } from "lucide-react"

const TOOL_URL = "/tools/tap-hold-maker"

type TapHoldCTAProps = {
  variant: "top" | "middle" | "bottom"
  keyword: string
}

const COPY: Record<TapHoldCTAProps["variant"], { eyebrow: string; body: string; button: string }> = {
  top: {
    eyebrow: "Free · No login required",
    body: "Skip ahead and start now, or read the full guide below.",
    button: "Open the Tap & Hold Image Maker",
  },
  middle: {
    eyebrow: "Try it as you read",
    body: "Open the maker in another tab and follow along with the steps above.",
    button: "Try the Tap & Hold Image Maker",
  },
  bottom: {
    eyebrow: "Ready when you are",
    body: "Everything above happens inside one free browser tool — no signup, no design software.",
    button: "Create your Tap & Hold image now",
  },
}

/** Reusable CTA block. All three placements (top/middle/bottom) point only to the Tap & Hold Image Maker. */
export function TapHoldCTA({ variant, keyword }: TapHoldCTAProps) {
  const copy = COPY[variant]

  if (variant === "bottom") {
    return (
      <section className="px-6 py-20 sm:py-24">
        <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden px-8 py-16 sm:py-20 text-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(500px circle at 50% 0%, rgba(255,255,255,0.18), transparent 70%), linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.1] tracking-[-0.025em] text-white">
              Make your {keyword.toLowerCase()} right now
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">{copy.body}</p>
            <Link
              href={TOOL_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              {copy.button}
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">Free forever · Works entirely in your browser</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="px-6">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#7C3AED]">{copy.eyebrow}</p>
          <p className="mt-1 text-[14px] text-[#4B5563]">{copy.body}</p>
        </div>
        <Link
          href={TOOL_URL}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[14px] font-semibold text-white transition-colors"
        >
          {copy.button}
          <ArrowRight size={15} strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  )
}
