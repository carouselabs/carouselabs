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
      <h1 className="text-2xl font-semibold text-[#0A0A0A] mb-1">What's your industry?</h1>
      <p className="text-sm text-[#6B7280] mb-8">
        We'll align your content with your space.
      </p>

      <div className="space-y-5">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">
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
            className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl bg-[#FFFFFF] border border-[#E5E3DE] shadow-2xl overflow-auto max-h-52">
              {filtered.map((item) => (
                <button
                  key={item}
                  onMouseDown={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    industry === item
                      ? "text-[#1A1A1A] bg-[rgba(26,26,26,0.1)]"
                      : "text-[#374151] hover:bg-[#F1EFE9] hover:text-[#0A0A0A]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">
            Describe your business
          </label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. I help B2B SaaS founders grow with content"
            className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
          />
        </div>
      </div>

      <StepNav
        backHref="/onboarding/identity"
        onContinue={() => router.push("/onboarding/topics")}
        canContinue={!!industry && !!niche.trim()}
      />
    </div>
  )
}
