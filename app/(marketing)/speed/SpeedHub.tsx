"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Search, Timer } from "lucide-react"
import { SPEED_PAGES, type SpeedPage } from "./data"
import { ExploreOtherHubs } from "@/components/marketing/ExploreOtherHubs"

type CategoryFilter = "all" | SpeedPage["category"]

const CATEGORY_LABELS: Record<SpeedPage["category"], string> = {
  "format-speed": "Format Speed",
  "niche-outcome": "Niche Outcomes",
  personalization: "Personalized (Brand-Matched)",
}

const FORMAT_LABELS: Record<string, string> = {
  carousel: "Carousel",
  caption: "Caption",
  hook: "Hook",
  "content-calendar": "Content Calendar",
  "post-ideas": "Post Ideas",
  image: "Image",
}

function nicheLabel(niche?: string): string {
  if (!niche) return ""
  return niche
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function SpeedHub() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all")
  const [query, setQuery] = useState("")

  const normalized = query.trim().toLowerCase()

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: SPEED_PAGES.length }
    for (const p of SPEED_PAGES) c[p.category] = (c[p.category] ?? 0) + 1
    return c
  }, [])

  const filtered = useMemo(() => {
    return SPEED_PAGES.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.category === activeCategory
      const matchesQuery =
        !normalized ||
        p.headline.toLowerCase().includes(normalized) ||
        (p.niche ?? "").toLowerCase().includes(normalized) ||
        (p.format ?? "").toLowerCase().includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [activeCategory, normalized])

  return (
    <div className="bg-white">
      {/* ── HEADER ── */}
      <section className="px-6 pt-16 pb-10 sm:pt-20 sm:pb-12 border-b border-[#EEEBE3]">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <nav className="text-[12.5px] text-[#9CA3AF]">
            <Link href="/" className="hover:text-[#6B7280] transition-colors">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#6B7280]">Speed</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[12px] font-medium text-[#7C3AED] w-fit">
            <Timer size={12} strokeWidth={2.4} />
            {SPEED_PAGES.length} speed-focused pages
          </div>
          <h1 className="text-[clamp(1.8rem,4.4vw,2.6rem)] font-bold leading-[1.15] tracking-[-0.025em] text-[#0A0A0A]">
            Create LinkedIn Content in 5 Minutes, Not 3 Hours
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.7] text-[#4B5563]">
            Carousels, captions, hooks, content calendars, post ideas, and images — for your
            profession, matched to your outcome, and (if you want it) matched to your exact
            brand. No design tool required.
          </p>
          <div className="relative max-w-sm">
            <Search
              size={16}
              strokeWidth={2.2}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by profession or format..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#FAFAF9] text-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#EDE9FE] transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── CATEGORY TABS ── */}
      <section className="px-6 py-6 border-b border-[#EEEBE3]">
        <nav className="max-w-5xl mx-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
              activeCategory === "all"
                ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                : "bg-[#FAFAF9] border-[#EEEBE3] text-[#4B5563] hover:border-[#C4B5FD] hover:text-[#7C3AED]"
            }`}
          >
            All
            <span
              className={`text-[11px] ${activeCategory === "all" ? "text-white/70" : "text-[#9CA3AF]"}`}
            >
              {counts.all}
            </span>
          </button>
          {(Object.keys(CATEGORY_LABELS) as SpeedPage["category"][]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
                activeCategory === cat
                  ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                  : "bg-[#FAFAF9] border-[#EEEBE3] text-[#4B5563] hover:border-[#C4B5FD] hover:text-[#7C3AED]"
              }`}
            >
              {CATEGORY_LABELS[cat]}
              <span
                className={`text-[11px] ${activeCategory === cat ? "text-white/70" : "text-[#9CA3AF]"}`}
              >
                {counts[cat] ?? 0}
              </span>
            </button>
          ))}
        </nav>
      </section>

      {/* ── RESULTS ── */}
      {filtered.length === 0 ? (
        <div className="px-6 py-16 max-w-3xl mx-auto text-center text-[14.5px] text-[#6B7280]">
          No pages match &quot;{query}&quot;.
        </div>
      ) : (
        <section className="px-6 py-10">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, 60).map((p) => (
              <SpeedCard key={p.slug} page={p} />
            ))}
          </div>
          {filtered.length > 60 && (
            <p className="text-center text-[13px] text-[#9CA3AF] mt-8">
              Showing 60 of {filtered.length} pages — refine your search to narrow the results.
            </p>
          )}
        </section>
      )}

      {/* ── FOOTER LINK ── */}
      <section className="px-6 py-12 text-center">
        <p className="text-[13.5px] text-[#6B7280]">
          Looking for a specific profession instead?{" "}
          <Link href="/for" className="font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
            Browse all niches
          </Link>{" "}
          or explore{" "}
          <Link href="/formats" className="font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
            content formats by topic
          </Link>
          .
        </p>
      </section>

      <ExploreOtherHubs current="/speed" />
    </div>
  )
}

function SpeedCard({ page }: { page: SpeedPage }) {
  const formatLabel = page.format ? FORMAT_LABELS[page.format] : undefined
  const niche = nicheLabel(page.niche)

  return (
    <Link
      href={`/speed/${page.slug}`}
      className="group h-full flex flex-col justify-between gap-3 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
    >
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#7C3AED] w-fit">
          <Timer size={11} strokeWidth={2.4} />
          {page.timeClaim}
          {formatLabel && <span className="text-[#C4B5FD]">&middot; {formatLabel}</span>}
        </span>
        <span className="text-[14.5px] font-semibold text-[#0A0A0A] leading-snug">
          {page.headline}
        </span>
        {niche && <span className="text-[12px] text-[#9CA3AF]">{niche}</span>}
      </div>
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#7C3AED]">
        View page
        <ArrowRight
          size={12}
          strokeWidth={2.2}
          className="group-hover:translate-x-0.5 transition-transform"
        />
      </span>
    </Link>
  )
}
