"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"
import { WordLimitedField } from "@/components/WordLimitedField"
import { controlClasses } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
  const [active, setActive] = useState(-1)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const missingIndustry = attemptedSubmit && !industry
  const missingNiche = attemptedSubmit && !niche.trim()
  const validationMessage =
    !industry && !niche.trim()
      ? "Please select an industry and describe your business to continue."
      : !industry
        ? "Please select your industry to continue."
        : "Please describe your business to continue."

  const filtered = INDUSTRIES.filter((i) =>
    i.toLowerCase().includes(query.toLowerCase())
  )
  const expanded = open && filtered.length > 0

  const handleSelect = (val: string) => {
    setIndustry(val)
    setQuery(val)
    setOpen(false)
    setActive(-1)
  }

  // Combobox keys: ↓/↑ move through matches, Enter picks, Escape closes.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault()
      handleSelect(filtered[active])
    } else if (e.key === "Escape") {
      setOpen(false)
      setActive(-1)
    }
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
      <h1 className="text-title-sm font-semibold">What&apos;s your industry?</h1>
      <p className="mt-1 mb-8 text-body text-muted-foreground">
        We&apos;ll align your content with your space.
      </p>

      <div className="flex flex-col gap-6">
        <div className="relative flex flex-col gap-1.5" ref={dropdownRef}>
          <label htmlFor="industry" className="text-label font-medium">
            Industry
          </label>
          <input
            id="industry"
            type="text"
            role="combobox"
            aria-expanded={expanded}
            aria-controls="industry-options"
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? `industry-option-${active}` : undefined}
            aria-invalid={missingIndustry || undefined}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setActive(-1)
              if (!e.target.value) setIndustry("")
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search your industry…"
            className={cn(controlClasses, "h-12 px-4")}
          />
          {expanded && (
            <ul
              id="industry-options"
              role="listbox"
              aria-label="Industries"
              className="absolute top-full z-(--z-popover) mt-1 max-h-60 w-full overflow-auto rounded-control border border-border bg-popover p-1 shadow-popover"
            >
              {filtered.map((item, i) => (
                <li
                  key={item}
                  id={`industry-option-${i}`}
                  role="option"
                  aria-selected={industry === item}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(item)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center rounded-control-sm px-3 text-label",
                    i === active && "bg-surface-muted",
                    industry === item && "font-semibold text-foreground"
                  )}
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="niche" className="text-label font-medium">
            Describe your business
          </label>
          <WordLimitedField
            as="input"
            id="niche"
            invalid={missingNiche}
            value={niche}
            onChange={setNiche}
            maxWords={500}
            placeholder="e.g. I help B2B SaaS founders grow with content"
            className={cn(controlClasses, "h-12 px-4")}
          />
        </div>
      </div>

      <StepNav
        backHref="/onboarding/identity"
        onContinue={() => router.push("/onboarding/topics")}
        canContinue={!!industry && !!niche.trim()}
        validationMessage={validationMessage}
        onInvalid={() => setAttemptedSubmit(true)}
      />
    </div>
  )
}
