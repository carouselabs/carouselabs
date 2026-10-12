"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X, Search } from "lucide-react"
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { SettingsSection } from "@/components/settings/SettingsSection"
import { Button } from "@/components/ui/button"
import { SavedToast } from "@/components/settings/SavedToast"
import { WordLimitedField } from "@/components/WordLimitedField"
import {
  ROLES,
  INDUSTRIES,
  TOPIC_SUGGESTIONS,
  TOPICS_MIN,
  TOPICS_MAX,
  SENIORITY,
  GOALS,
  TONES,
  type ProfileData,
} from "@/lib/profile/options"

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <SettingsSection title={title} description={hint}>
      {children}
    </SettingsSection>
  )
}

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Editable fields (pre-filled from the API)
  const [role, setRole] = useState("")
  const [industry, setIndustry] = useState("")
  const [industryQuery, setIndustryQuery] = useState("")
  const [industryOpen, setIndustryOpen] = useState(false)
  const [niche, setNiche] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState("")
  const [audienceRole, setAudienceRole] = useState("")
  const [audienceSeniority, setAudienceSeniority] = useState("")
  const [audienceIndustry, setAudienceIndustry] = useState("")
  const [coreProblem, setCoreProblem] = useState("")
  const [goals, setGoals] = useState<string[]>([])
  const [primaryGoal, setPrimaryGoal] = useState("")
  const [tones, setTones] = useState<string[]>([])

  const industryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/profile")
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load profile")
        if (!active) return
        const p: ProfileData = data.profile
        setRole(p.role)
        setIndustry(p.industry)
        setIndustryQuery(p.industry)
        setNiche(p.niche)
        setTopics(p.topics)
        setAudienceRole(p.audienceRole)
        setAudienceSeniority(p.audienceSeniority)
        setAudienceIndustry(p.audienceIndustry)
        setCoreProblem(p.coreProblem)
        setGoals(p.goals)
        setPrimaryGoal(p.primaryGoal)
        setTones(p.tones)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Close the industry dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (industryRef.current && !industryRef.current.contains(e.target as Node)) {
        setIndustryOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const filteredIndustries = INDUSTRIES.filter((i) =>
    i.toLowerCase().includes(industryQuery.toLowerCase()),
  )

  function addTopic(tag: string) {
    const t = tag.trim()
    if (!t || topics.includes(t) || topics.length >= TOPICS_MAX) return
    setTopics([...topics, t])
    setTopicInput("")
  }
  function removeTopic(tag: string) {
    setTopics(topics.filter((t) => t !== tag))
  }
  function toggleGoal(id: string) {
    if (goals.includes(id)) {
      const next = goals.filter((g) => g !== id)
      setGoals(next)
      if (primaryGoal === id) setPrimaryGoal(next[0] ?? "")
    } else {
      setGoals([...goals, id])
      if (!primaryGoal) setPrimaryGoal(id)
    }
  }
  function toggleTone(id: string) {
    setTones((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const canSave =
    !!role &&
    !!industry &&
    !!niche.trim() &&
    topics.length >= TOPICS_MIN &&
    !!audienceSeniority &&
    !!audienceIndustry.trim() &&
    !!coreProblem.trim() &&
    !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          industry,
          niche,
          topics,
          audienceRole,
          audienceSeniority,
          audienceIndustry,
          coreProblem,
          goals,
          primaryGoal,
          tones,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to save")
      // Profile changed → drop the cached generate-bar suggestions so the
      // dashboard regenerates a fresh set on next visit.
      try {
        localStorage.removeItem("ideaSuggestions")
      } catch {
        // ignore storage failures
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <SettingsHeader />

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-control bg-surface border border-border animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          {/* ── Identity ── */}
          <Section title="Identity" hint="Which best describes you?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-control border text-left transition-all",
                    role === r.id
                      ? "border-foreground bg-surface-muted text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:border-border hover:text-foreground",
                  ].join(" ")}
                >
                  <span className="text-base">{r.emoji}</span>
                  <span className="text-label font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* ── Industry & Niche ── */}
          <Section title="Industry & Niche" hint="Align your content with your space.">
            <div className="flex flex-col gap-3">
              <div className="relative" ref={industryRef}>
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={industryQuery}
                  onChange={(e) => {
                    setIndustryQuery(e.target.value)
                    setIndustryOpen(true)
                    if (!e.target.value) setIndustry("")
                  }}
                  onFocus={() => setIndustryOpen(true)}
                  placeholder="Search your industry…"
                  className="w-full pl-10 pr-4 py-3 rounded-control bg-surface border border-border text-foreground placeholder-[#ADA99F] text-label focus:outline-none focus:border-foreground transition-colors"
                />
                {industryOpen && filteredIndustries.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-control bg-surface-raised border border-border shadow-2xl overflow-auto max-h-52">
                    {filteredIndustries.map((item) => (
                      <button
                        key={item}
                        onMouseDown={() => {
                          setIndustry(item)
                          setIndustryQuery(item)
                          setIndustryOpen(false)
                        }}
                        className={[
                          "w-full text-left px-4 py-2.5 text-label transition-colors",
                          industry === item
                            ? "text-foreground bg-surface-muted"
                            : "text-foreground hover:bg-surface-muted hover:text-foreground",
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <WordLimitedField
                as="input"
                value={niche}
                onChange={setNiche}
                maxWords={500}
                placeholder="Describe your business — e.g. I help B2B SaaS founders grow with content"
                className="w-full px-4 py-3 rounded-control bg-surface border border-border text-foreground placeholder-[#ADA99F] text-label focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
          </Section>

          {/* ── Content Topics ── */}
          <Section
            title="Content Topics"
            hint={`Pick ${TOPICS_MIN}–${TOPICS_MAX} topics you post about.`}
          >
            <div
              className="min-h-[88px] p-3.5 rounded-control bg-surface border border-border flex flex-wrap gap-2 cursor-text focus-within:border-foreground transition-colors"
              onClick={() => document.getElementById("topic-input")?.focus()}
            >
              {topics.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex h-8 items-center gap-1.5 self-center rounded-full border border-border bg-surface-muted pr-1.5 pl-3 text-label text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTopic(tag)
                    }}
                    className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </span>
              ))}
              {topics.length < TOPICS_MAX && (
                <input
                  id="topic-input"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      addTopic(topicInput)
                    }
                    if (e.key === "Backspace" && !topicInput && topics.length) {
                      removeTopic(topics[topics.length - 1])
                    }
                  }}
                  placeholder={topics.length === 0 ? "Type a topic, press Enter…" : ""}
                  className="flex-1 min-w-[140px] bg-transparent text-foreground text-label placeholder-[#C4C0B6] outline-none"
                />
              )}
            </div>
            <p className="text-caption text-muted-foreground">
              {topics.length}/{TOPICS_MAX}
              {topics.length < TOPICS_MIN && ` · add at least ${TOPICS_MIN}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPIC_SUGGESTIONS.filter((s) => !topics.includes(s)).map((s) => (
                <button
                  key={s}
                  onClick={() => addTopic(s)}
                  disabled={topics.length >= TOPICS_MAX}
                  className="px-3 py-1.5 rounded-full border border-border text-caption text-muted-foreground hover:border-control-border hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </Section>

          {/* ── Target Audience ── */}
          <Section title="Target Audience" hint="Who are you writing for?">
            <div className="flex flex-col gap-3">
              <WordLimitedField
                as="input"
                value={audienceRole}
                onChange={setAudienceRole}
                maxWords={5}
                warnWithin={2}
                placeholder="Their job role — e.g. Marketing Manager, CTO…"
                className="w-full px-4 py-3 rounded-control bg-surface border border-border text-foreground placeholder-[#ADA99F] text-label focus:outline-none focus:border-foreground transition-colors"
              />
              <div className="flex flex-wrap gap-2">
                {SENIORITY.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAudienceSeniority(audienceSeniority === opt ? "" : opt)}
                    className={[
                      "px-3.5 py-2 rounded-full border text-caption transition-colors",
                      audienceSeniority === opt
                        ? "border-foreground bg-surface-muted text-foreground"
                        : "border-border text-muted-foreground hover:border-border hover:text-foreground",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <WordLimitedField
                as="input"
                value={audienceIndustry}
                onChange={setAudienceIndustry}
                maxWords={5}
                warnWithin={2}
                placeholder="Their industry — e.g. B2B SaaS, Healthcare…"
                className="w-full px-4 py-3 rounded-control bg-surface border border-border text-foreground placeholder-[#ADA99F] text-label focus:outline-none focus:border-foreground transition-colors"
              />
              <WordLimitedField
                as="textarea"
                value={coreProblem}
                onChange={setCoreProblem}
                maxWords={200}
                rows={3}
                placeholder="Core problem they face — e.g. struggling to generate leads on LinkedIn…"
                className="w-full px-4 py-3 rounded-control bg-surface border border-border text-foreground placeholder-[#ADA99F] text-label focus:outline-none focus:border-foreground transition-colors resize-none"
              />
            </div>
          </Section>

          {/* ── Content Goals ── */}
          <Section title="Content Goals" hint="Select all that apply. Tap a selected goal to make it primary.">
            <div className="flex flex-col gap-2.5">
              {GOALS.map((goal) => {
                const selected = goals.includes(goal.id)
                const isPrimary = primaryGoal === goal.id
                return (
                  <div
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={[
                      "flex items-start gap-3.5 px-4 py-3.5 rounded-control border cursor-pointer transition-all",
                      selected
                        ? "border-foreground bg-surface-muted"
                        : "border-border bg-surface hover:border-border",
                    ].join(" ")}
                  >
                    <span className="text-lg mt-0.5 select-none">{goal.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-label font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                          {goal.label}
                        </p>
                        {isPrimary && (
                          <span className="px-2 py-0.5 rounded-full bg-[rgba(26,26,26,0.2)] border border-control-border text-foreground text-[11px] font-medium">
                            Primary
                          </span>
                        )}
                        {selected && !isPrimary && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPrimaryGoal(goal.id)
                            }}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Set primary
                          </button>
                        )}
                      </div>
                      <p className="text-caption text-muted-foreground mt-0.5">{goal.description}</p>
                    </div>
                    {selected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* ── Tone & Voice ── */}
          <Section title="Tone & Voice" hint="Pick the tones that sound like you. Combine as many as you like.">
            <div className="flex flex-col gap-2.5">
              {TONES.map((tone) => {
                const selected = tones.includes(tone.id)
                return (
                  <button
                    key={tone.id}
                    onClick={() => toggleTone(tone.id)}
                    className={[
                      "w-full text-left px-4 py-3.5 rounded-control border transition-all",
                      selected
                        ? "border-foreground bg-surface-muted"
                        : "border-border bg-surface hover:border-border",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-label font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                        {tone.label}
                      </p>
                      {selected && <span className="w-4 h-4 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-caption text-muted-foreground mt-0.5">{tone.description}</p>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Error + Save */}
          {error && (
            <div className="px-4 py-3 rounded-control bg-danger-soft border border-danger/25 text-label text-danger">
              {error}
            </div>
          )}

          {/* Floating save bar: stays in reach while scrolling the long form. */}
          <div className="sticky bottom-0 z-(--z-sticky)">
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-raised/95 px-4 py-3 shadow-popover backdrop-blur-sm">
              <Button onClick={handleSave} disabled={!canSave} aria-busy={saving || undefined}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <p className="text-caption text-muted-foreground">
                Applies to your next idea generation.
              </p>
            </div>
          </div>
        </div>
      )}

      <SavedToast open={saved} onClose={() => setSaved(false)} message="Profile saved" />
    </div>
  )
}
