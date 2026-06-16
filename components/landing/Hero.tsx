"use client"

import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  PlayCircle,
  Image as ImageIcon,
  LayoutGrid,
  CheckCircle2,
  Zap,
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedSlideLeft,
  AnimatedSlideRight,
} from "@/components/marketing/AnimatedSection"
import { TypewriterPrompt } from "@/components/landing/TypewriterPrompt"

function InfoCard({
  delay,
  icon,
  label,
}: {
  delay: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <div
      style={{ animation: `float 4s ease-in-out infinite ${delay}` }}
      className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl bg-[#FFFDF8] border border-[#E5E3DE] shadow-[0_12px_32px_rgba(10,10,10,0.10)] whitespace-nowrap"
    >
      {icon}
      <span className="text-[13px] font-semibold text-[#0A0A0A]">{label}</span>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-20 overflow-hidden">
      {/* ── LEFT: connected circular badges ── */}
      <div className="absolute left-[5%] top-1/2 -translate-y-1/2 hidden lg:block z-10">
        <AnimatedSlideLeft delay={0.2}>
          <div className="relative flex flex-col items-center gap-9">
            {/* Dashed connector behind the circles */}
            <div
              aria-hidden
              className="absolute left-1/2 top-6 bottom-6 -translate-x-1/2 border-l-2 border-dashed border-[#D1D5DB]"
            />

            {/* Top — AI Ideas */}
            <div
              style={{ animation: "float 4s ease-in-out infinite 0s" }}
              className="relative z-10 w-12 h-12 rounded-full bg-[#EDE9FE] border border-[rgba(124,58,237,0.25)] flex items-center justify-center shadow-[0_6px_18px_rgba(124,58,237,0.18)]"
            >
              <Sparkles size={18} className="text-[#7C3AED]" strokeWidth={2} />
            </div>

            {/* Middle — Image generation, with "You" bubble */}
            <div
              style={{ animation: "float 4s ease-in-out infinite 0.6s" }}
              className="relative z-10"
            >
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] border border-[rgba(16,185,129,0.3)] flex items-center justify-center shadow-[0_6px_18px_rgba(16,185,129,0.18)]">
                <ImageIcon size={18} className="text-[#059669]" strokeWidth={2} />
              </div>
              <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-full bg-[#1A1A1A] text-white text-[11px] font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.2)] whitespace-nowrap">
                You
              </span>
            </div>

            {/* Bottom — Carousel */}
            <div
              style={{ animation: "float 4s ease-in-out infinite 1.2s" }}
              className="relative z-10 w-12 h-12 rounded-full bg-[#DBEAFE] border border-[rgba(59,130,246,0.3)] flex items-center justify-center shadow-[0_6px_18px_rgba(59,130,246,0.18)]"
            >
              <LayoutGrid size={18} className="text-[#2563EB]" strokeWidth={2} />
            </div>
          </div>
        </AnimatedSlideLeft>
      </div>

      {/* ── RIGHT: floating info cards ── */}
      <div className="absolute right-[5%] top-1/2 -translate-y-1/2 hidden lg:block z-10">
        <AnimatedSlideRight delay={0.2}>
          <div className="flex flex-col gap-6">
            <InfoCard
              delay="0.3s"
              icon={<CheckCircle2 size={17} className="text-[#16A34A]" strokeWidth={2.2} />}
              label="Caption Generated"
            />
            <InfoCard
              delay="0.9s"
              icon={<Zap size={17} className="text-[#1A1A1A]" strokeWidth={2.2} fill="#1A1A1A" />}
              label="10 ideas · 30 seconds"
            />
            <InfoCard
              delay="1.5s"
              icon={<CheckCircle2 size={17} className="text-[#2563EB]" strokeWidth={2.2} />}
              label="Posted to LinkedIn"
            />
          </div>
        </AnimatedSlideRight>
      </div>

      {/* ── Centered hero content ── */}
      <div className="relative z-20 max-w-3xl mx-auto text-center flex flex-col items-center gap-7">
        <AnimatedSection delay={0}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A1A1A] text-[12px] font-medium text-[#F9F7F2]">
            <Sparkles size={11} strokeWidth={2.2} />
            AI-powered content creation
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0}>
          <h1 className="text-[clamp(2.6rem,7vw,4.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
            Create viral content for every platform
          </h1>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <p className="max-w-xl text-[18px] text-[#6B7280] leading-[1.6]">
            Tell CarouseLabs about your business and it generates post ideas, writes your captions,
            and creates the images and carousels — ready for LinkedIn, Instagram, and Twitter/X in
            minutes.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15} className="w-full">
          <TypewriterPrompt />
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A1A1A] hover:bg-black text-[14px] font-semibold text-white transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            >
              Start for free
              <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#E5E3DE] bg-[#FFFDF8] hover:bg-[#F3F1EB] text-[14px] font-semibold text-[#0A0A0A] transition-colors"
            >
              <PlayCircle size={15} strokeWidth={2} />
              See how it works
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
