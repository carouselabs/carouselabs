"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"

const INDUSTRIES = [
  "Technology & SaaS",
  "Marketing & Advertising",
  "Finance & Investing",
  "E-commerce & Retail",
  "Healthcare & Wellness",
  "Education & EdTech",
  "Real Estate",
  "Legal & Compliance",
  "HR & Recruiting",
  "Consulting & Coaching",
  "Design & Creative",
  "Media & Entertainment",
  "Nonprofit & Social Impact",
  "Manufacturing & Supply Chain",
  "Food & Hospitality",
  "Travel & Tourism",
  "Sports & Fitness",
  "Sustainability & Climate",
  "Blockchain & Web3",
  "AI & Data Science",
  "Cybersecurity",
  "Logistics & Operations",
]

export default function IndustryPage() {
  const router = useRouter()
  const industry = useOnboardingStore((s) => s.industry)
  const niche = useOnboardingStore((s) => s.niche)
  const setIndustry = useOnboardingStore((s) => s.setIndustry)
  const setNiche = useOnboardingStore((s) => s.setNiche)

  const [query, setQuery] = useState(industry)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filtered = INDUSTRIES.filter((i) =>
    i.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (val: string) => {
    setIndustry(val)
    setQuery(val)
    setOpen(false)
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#F0F0FA] mb-1">What's your industry?</h1>
      <p className="text-sm text-[rgba(255,255,255,0.45)] mb-8">
        We'll align your content with your space.
      </p>

      <div className="space-y-5">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-medium text-[rgba(255,255,255,0.45)] mb-2 uppercase tracking-wide">
            Industry
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              if (!e.target.value) setIndustry("")
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search your industry…"
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#F0F0FA] placeholder-[rgba(255,255,255,0.22)] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl bg-[#0D0D1A] border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-auto max-h-52">
              {filtered.map((item) => (
                <button
                  key={item}
                  onMouseDown={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    industry === item
                      ? "text-[#A78BFA] bg-[rgba(124,58,237,0.1)]"
                      : "text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F0F0FA]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[rgba(255,255,255,0.45)] mb-2 uppercase tracking-wide">
            Niche or Specialization{" "}
            <span className="text-[rgba(255,255,255,0.3)] normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. B2B SaaS growth, Seed-stage startups…"
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#F0F0FA] placeholder-[rgba(255,255,255,0.22)] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>
      </div>

      <StepNav
        backHref="/onboarding/identity"
        onContinue={() => router.push("/onboarding/topics")}
        canContinue={!!industry}
      />
    </div>
  )
}
