"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowUpRight, Search } from "lucide-react"
import { ANSWER_PAGES, ANSWER_PAGES_BY_CATEGORY, ANSWER_CATEGORIES } from "./data"

function categorySlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function AnswersHub() {
  const [query, setQuery] = useState("")

  const normalized = query.trim().toLowerCase()

  const filteredByCategory = useMemo(() => {
    if (!normalized) return ANSWER_PAGES_BY_CATEGORY
    const result: Record<string, typeof ANSWER_PAGES> = {}
    for (const category of ANSWER_CATEGORIES) {
      const matches = ANSWER_PAGES_BY_CATEGORY[category].filter((p) =>
        p.question.toLowerCase().includes(normalized),
      )
      if (matches.length > 0) result[category] = matches
    }
    return result
  }, [normalized])

  const visibleCategories = ANSWER_CATEGORIES.filter((c) => filteredByCategory[c]?.length)

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
            <span className="text-[#6B7280]">Answers</span>
          </nav>
          <h1 className="text-[clamp(1.8rem,4.4vw,2.6rem)] font-bold leading-[1.15] tracking-[-0.025em] text-[#0A0A0A]">
            Answers to {ANSWER_PAGES.length} LinkedIn Content Questions
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.7] text-[#4B5563]">
            Direct, no-fluff answers to the questions people actually ask about posting strategy,
            hooks, carousels, the algorithm, and more.
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
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#FAFAF9] text-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#EDE9FE] transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── CATEGORY JUMP LINKS ── */}
      <section className="px-6 py-6 border-b border-[#EEEBE3]">
        <nav className="max-w-3xl mx-auto flex flex-wrap gap-2">
          {ANSWER_CATEGORIES.map((category) => (
            <a
              key={category}
              href={`#${categorySlug(category)}`}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-medium text-[#4B5563] bg-[#FAFAF9] border border-[#EEEBE3] hover:border-[#C4B5FD] hover:text-[#7C3AED] transition-colors"
            >
              {category}
            </a>
          ))}
        </nav>
      </section>

      {/* ── CATEGORY SECTIONS ── */}
      {visibleCategories.length === 0 ? (
        <div className="px-6 py-16 max-w-3xl mx-auto text-center text-[14.5px] text-[#6B7280]">
          No questions match &quot;{query}&quot;.
        </div>
      ) : (
        visibleCategories.map((category) => {
          const pages = filteredByCategory[category]
          return (
            <section
              key={category}
              id={categorySlug(category)}
              className="px-6 py-10 border-b border-[#EEEBE3] scroll-mt-8"
            >
              <div className="max-w-3xl mx-auto flex flex-col gap-4">
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#7C3AED]">
                  {category}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                  {pages.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/answers/${p.slug}`}
                        className="group inline-flex items-start gap-1.5 py-1.5 text-[14.5px] leading-[1.5] text-[#3F3F46] hover:text-[#7C3AED] transition-colors"
                      >
                        <ArrowUpRight
                          size={14}
                          strokeWidth={2.2}
                          className="text-[#C4B5FD] shrink-0 mt-[3px] group-hover:text-[#7C3AED] transition-colors"
                        />
                        {p.question}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )
        })
      )}

      {/* ── FOOTER LINK ── */}
      <section className="px-6 py-12 text-center">
        <p className="text-[13.5px] text-[#6B7280]">
          Looking for a tool instead of an answer? Browse{" "}
          <Link href="/generators" className="font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
            AI tools for LinkedIn
          </Link>{" "}
          or see{" "}
          <Link href="/best" className="font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
            best-of rankings
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
