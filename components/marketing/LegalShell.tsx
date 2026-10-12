import type { ReactNode } from "react"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"

export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro?: string
  children: ReactNode
}) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-20">
      <AnimatedSection className="flex flex-col gap-3 pb-10 mb-10 border-b border-[#E5E3DE]">
        <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">
          CarouseLabs
        </p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.025em] text-[#0A0A0A] leading-[1.1]">
          {title}
        </h1>
        <p className="text-[12px] text-[#9CA3AF]">Last updated: {updated}</p>
        {intro && <p className="mt-3 text-[15px] text-[#6B7280] leading-[1.7]">{intro}</p>}
      </AnimatedSection>

      <div className="flex flex-col gap-9">{children}</div>
    </article>
  )
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <AnimatedSection className="flex flex-col gap-3">
      <h2 className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.01em]">{heading}</h2>
      <div className="flex flex-col gap-3 text-[14px] text-[#6B7280] leading-[1.75]">{children}</div>
    </AnimatedSection>
  )
}
