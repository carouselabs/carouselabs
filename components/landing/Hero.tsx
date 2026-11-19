import { Fragment } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PlatformLogo } from "@/components/brand/PlatformLogo"
import { PLATFORM_ORDER } from "@/lib/platforms"
import { HeroStage } from "@/components/landing/HeroStage"

// Copy is unchanged from the previous hero. The composition is anantgoyal.in's
// hero: the blue → violet frame round a white panel, the words on the left
// (one phrase in the italic gradient), the product on a stage on the right.
const LINES: { words: string[]; em?: boolean }[] = [
  { words: ["Create", "viral", "content", "for"] },
  { words: ["every", "platform"], em: true },
]

const NAMES: Record<(typeof PLATFORM_ORDER)[number], string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  x: "Twitter/X",
  facebook: "Facebook",
  pinterest: "Pinterest",
  threads: "Threads",
}

export function Hero() {
  let wordIndex = 0
  return (
    <section
      data-hero
      data-enter
      aria-labelledby="hero-title"
      className="ground-canvas relative isolate overflow-hidden px-2 pt-[84px] pb-2 font-ui sm:px-4 sm:pt-[88px] sm:pb-4 lg:px-6 lg:pb-6"
    >
      <div className="relative mx-auto grid min-h-[calc(100svh-92px)] max-w-[1400px] overflow-hidden rounded-[28px] bg-white text-[#100C33] shadow-[0_40px_120px_-40px_rgb(16_6_90/0.65)] sm:min-h-[calc(100svh-104px)] sm:rounded-[40px] lg:min-h-[calc(100svh-112px)] lg:grid-cols-[1.06fr_1fr]">
        {/* words */}
        <div className="relative z-10 flex flex-col justify-between gap-8 px-4 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-10 lg:px-14 lg:pt-10 lg:pb-10">
          <div>
            <p
              data-enter-fade
              style={{ ["--d" as string]: "0ms" }}
              className="inline-flex items-center gap-2 rounded-full border border-[#4B30EE]/20 bg-[#EFEAFF] py-1.5 pr-3.5 pl-2.5 text-[13px] font-medium text-[#4B30EE]"
            >
              <span className="live-dot size-2 rounded-full bg-[#22C55E]" aria-hidden />
              AI-powered content creation
            </p>

            <h1
              id="hero-title"
              className="mt-6 text-[clamp(2.6rem,1.2rem+4vw,4.75rem)] leading-[0.96] font-semibold tracking-[-0.045em] sm:mt-8"
            >
              {LINES.map((line, li) => (
                <span key={li} className="block">
                  {line.words.map((w, wi) => {
                    const d = 80 + wordIndex++ * 70
                    return (
                      <Fragment key={wi}>
                        <span className="hero-mask">
                          <span
                            className={line.em ? "hero-word serif-accent text-[1.12em] tracking-[-0.02em]" : "hero-word"}
                            style={{ ["--d" as string]: `${d}ms` }}
                          >
                            {line.em ? <span className="gradient-word pr-[0.06em]">{w}</span> : w}
                          </span>
                        </span>
                        {wi < line.words.length - 1 ? " " : null}
                      </Fragment>
                    )
                  })}
                  {li < LINES.length - 1 ? " " : null}
                </span>
              ))}
            </h1>

            <p data-enter-fade style={{ ["--d" as string]: "560ms" }} className="mt-6 max-w-[32rem] text-[17px] leading-[1.6] text-[#46426B] sm:text-lg">
              Tell CarouseLabs about your business and it generates post ideas, writes your captions, and creates the images and
              carousels — ready for LinkedIn, Instagram, and Twitter/X in minutes.
            </p>

            <div data-enter-fade style={{ ["--d" as string]: "660ms" }} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/sign-up"
                className="btn-nudge inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#100C33] px-7 text-base font-medium text-white shadow-[0_10px_24px_-10px_rgb(16_12_51/0.6)] transition-[translate,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#1D1850] hover:shadow-[0_16px_30px_-12px_rgb(16_12_51/0.6)] active:translate-y-0 active:scale-[0.97] motion-reduce:hover:translate-y-0"
              >
                Start for free
                <ArrowRight aria-hidden className="nudge size-[1.1em]" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-14 items-center justify-center rounded-full border border-[#8D89A8] bg-white px-7 text-base font-medium text-[#100C33] transition-[translate,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[#F1EFFA] active:translate-y-0 active:scale-[0.97] motion-reduce:hover:translate-y-0"
              >
                See how it works
              </a>
            </div>
          </div>

          <div data-enter-fade style={{ ["--d" as string]: "780ms" }}>
            <p className="text-[13px] font-medium text-[#5C5884]">Built for Every Platform</p>
            <ul className="mt-3 flex flex-wrap items-center gap-1.5">
              {PLATFORM_ORDER.map((p) => (
                <li key={p} className="flex h-9 items-center gap-1.5 rounded-full border border-[#E5E2F4] bg-[#F4F3FC]/70 px-3 text-[13px] font-medium text-[#46426B]">
                  <PlatformLogo platform={p} size={14} />
                  {NAMES[p]}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* the product, on its stage */}
        <div className="relative px-4 pb-4 sm:px-3 sm:pb-3 lg:py-4 lg:pr-4 lg:pl-0">
          <HeroStage />
        </div>
      </div>
    </section>
  )
}
