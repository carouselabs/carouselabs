"use client"

import { SlideCard } from "./SlideCard"

interface Slide {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  prompt: string
}

interface CarouselSlideListProps {
  slides: Slide[]
}

export function CarouselSlideList({ slides }: CarouselSlideListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
          Slide Prompts
        </p>
        <span className="text-[11px] text-[rgba(255,255,255,0.22)]">{slides.length} slides</span>
      </div>
      {slides.map((slide) => (
        <SlideCard
          key={slide.slideNumber}
          slideNumber={slide.slideNumber}
          role={slide.role}
          headline={slide.headline}
          prompt={slide.prompt}
        />
      ))}
    </div>
  )
}
