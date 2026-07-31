"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Search } from "lucide-react"
import { FORMAT_PAGES, type FormatPage } from "./data"
import { FORMATS, FORMAT_LABELS, FORMAT_EMOJI, topicLabel } from "./types"

type FormatFilter = "all" | (typeof FORMATS)[number]

export function FormatsHub() {
  const [activeFormat, setActiveFormat] = useState<FormatFilter>("all")
  const [query, setQuery] = useState("")

  const normalized = query.trim().toLowerCase()

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: FORMAT_PAGES.length }
    for (const f of FORMATS) c[f] = FORMAT_PAGES.filter((p) => p.formatType === f).length
    return c
  }, [])

  const filtered = useMemo(() => {
    return FORMAT_PAGES.filter((p) => {
      const matchesFormat = activeFormat === "all" || p.formatType === activeFormat
      const matchesQuery = !normalized || p.topic.toLowerCase().includes(normalized)
      return matchesFormat && matchesQuery
    })
  }, [activeFormat, normalized])

  const isGrouped = activeFormat === "all" && !normalized

  const grouped = useMemo(() => {
    if (!isGrouped) return null
    const map: Record<string, FormatPage[]> = {}
    for (const f of FORMATS) map[f] = filtered.filter((p) => p.formatType === f)
    return map
  }, [isGrouped, filtered])

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
            <span className="text-[#6B7280]">Formats</span>
          </nav>
          <h1 className="text-[clamp(1.8rem,4.4vw,2.6rem)] font-bold leading-[1.15] tracking-[-0.025em] text-[#0A0A0A]">
            {FORMAT_PAGES.length} LinkedIn Content Formats &amp; Ideas
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.7] text-[#4B5563]">
            Carousel ideas, caption examples, hooks, post ideas, content calendars, and post
            examples — for every topic professionals actually post about.
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
              placeholder="Search topics (e.g. networking, sales)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#FAFAF9] text-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#EDE9FE] transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── FORMAT TYPE TABS ── */}
      <section className="px-6 py-6 border-b border-[#EEEBE3]">
        <nav className="max-w-5xl mx-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveFormat("all")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
              activeFormat === "all"
                ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                : "bg-[#FAFAF9] border-[#EEEBE3] text-[#4B5563] hover:border-[#C4B5FD] hover:text-[#7C3AED]"
            }`}
          >
            All Formats
            <span
              className={`text-[11px] ${activeFormat === "all" ? "text-white/70" : "text-[#9CA3AF]"}`}
            >
              {counts.all}
            </span>
          </button>
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFormat(f)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
                activeFormat === f
                  ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                  : "bg-[#FAFAF9] border-[#EEEBE3] text-[#4B5563] hover:border-[#C4B5FD] hover:text-[#7C3AED]"
              }`}
            >
              <span aria-hidden>{FORMAT_EMOJI[f]}</span>
              {FORMAT_LABELS[f]}
              <span className={`text-[11px] ${activeFormat === f ? "text-white/70" : "text-[#9CA3AF]"}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </nav>
      </section>

      {/* ── RESULTS ── */}
      {filtered.length === 0 ? (
        <div className="px-6 py-16 max-w-3xl mx-auto text-center text-[14.5px] text-[#6B7280]">
          No format pages match &quot;{query}&quot;.
        </div>
      ) : isGrouped && grouped ? (
        FORMATS.map((f) => (
          <section key={f} className="px-6 py-10 border-b border-[#EEEBE3]">
            <div className="max-w-5xl mx-auto flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-[#7C3AED]">
                  <span aria-hidden className="text-[15px]">
                    {FORMAT_EMOJI[f]}
                  </span>
                  {FORMAT_LABELS[f]}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveFormat(f)}
                  className="text-[12.5px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                >
                  View all &rarr;
                </button>
              </div>
              <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {grouped[f].slice(0, 8).map((p) => (
                  <FormatCard key={p.slug} page={p} showBadge={false} />
                ))}
              </div>
            </div>
          </section>
        ))
      ) : (
        <section className="px-6 py-10">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <FormatCard key={p.slug} page={p} showBadge={activeFormat === "all"} />
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER LINK ── */}
      <section className="px-6 py-12 text-center">
        <p className="text-[13.5px] text-[#6B7280]">
          Looking for ideas by profession instead of topic? Browse{" "}
          <Link href="/ideas" className="font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
            carousel ideas by niche
          </Link>{" "}
          or see{" "}
          <Link href="/answers" className="font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
            direct answers
          </Link>
          .
        </p>
      </section>
    </div>
  )
}

function FormatCard({ page, showBadge }: { page: FormatPage; showBadge: boolean }) {
  return (
    <Link
      href={`/formats/${page.slug}`}
      className="group h-full flex flex-col justify-between gap-3 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
    >
      <div className="flex flex-col gap-1.5">
        {showBadge && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#7C3AED] w-fit">
            <span aria-hidden>{FORMAT_EMOJI[page.formatType]}</span>
            {FORMAT_LABELS[page.formatType]}
          </span>
        )}
        <span className="text-[14.5px] font-semibold text-[#0A0A0A] leading-snug">
          {topicLabel(page.slug.slice(`${page.formatType}-for-`.length))}
        </span>
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
