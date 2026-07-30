"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Scale } from "lucide-react"
import { AnimatedFadeIn } from "@/components/marketing/AnimatedSection"

interface CompetitorCard {
  slug: string
  name: string
  tagline: string
  price: string
  our_price: string
}

interface VsFilterGridProps {
  competitors: CompetitorCard[]
  categoryBySlug: Record<string, string>
  categoryLabels: Record<string, string>
  categoryOrder: readonly string[]
}

export function VsFilterGrid({
  competitors,
  categoryBySlug,
  categoryLabels,
  categoryOrder,
}: VsFilterGridProps) {
  const [active, setActive] = useState<string>("all")

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: competitors.length }
    for (const cat of categoryOrder) c[cat] = 0
    for (const comp of competitors) {
      const cat = categoryBySlug[comp.slug]
      if (cat) c[cat] = (c[cat] || 0) + 1
    }
    return c
  }, [competitors, categoryBySlug, categoryOrder])

  const filtered =
    active === "all"
      ? competitors
      : competitors.filter((c) => categoryBySlug[c.slug] === active)

  const tabs = [{ key: "all", label: "All Tools" }, ...categoryOrder.map((key) => ({
    key,
    label: categoryLabels[key] ?? key,
  }))]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              active === tab.key
                ? "bg-[#7C3AED] text-white"
                : "bg-white border border-[#E5E3DE] text-[#4B5563] hover:border-[#C4B5FD] hover:text-[#7C3AED]"
            }`}
          >
            {tab.label}
            <span
              className={`text-[11px] font-bold ${
                active === tab.key ? "text-white/70" : "text-[#9CA3AF]"
              }`}
            >
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <AnimatedFadeIn key={active}>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <li key={c.slug} className="h-full">
              <Link
                href={`/vs/${c.slug}`}
                className="group h-full flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                      <Scale size={16} className="text-[#7C3AED]" strokeWidth={2.2} />
                    </div>
                    <span className="text-[16px] font-semibold text-[#0A0A0A] leading-snug">
                      vs {c.name}
                    </span>
                  </div>
                  <ArrowRight
                    size={15}
                    strokeWidth={2.2}
                    className="shrink-0 mt-2 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
                  />
                </div>

                <p className="text-[13px] leading-[1.55] text-[#6B7280]">{c.tagline}</p>

                <div className="mt-auto pt-3 border-t border-[#F0EEE8] flex items-center justify-between gap-3">
                  <span className="text-[12px] text-[#6B7280]">
                    {c.name}: <span className="font-semibold text-[#3F3F46]">{c.price}</span>
                  </span>
                  <span className="text-[12px] text-[#6B7280]">
                    Ours: <span className="font-semibold text-[#7C3AED]">{c.our_price}</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </AnimatedFadeIn>

      {filtered.length === 0 && (
        <p className="text-center text-[14px] text-[#6B7280]">
          No comparisons in this category yet.
        </p>
      )}
    </div>
  )
}
