"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X, Search } from "lucide-react"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import { SavedToast } from "@/components/settings/SavedToast"
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
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[14px] font-semibold text-[#0A0A0A]">{title}</h2>
        {hint && <p className="text-[12px] text-[#9CA3AF]">{hint}</p>}
      </div>
      {children}
    </section>
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
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse"
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                    role === r.id
                      ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.1)] text-[#0A0A0A]"
                      : "border-[#E5E3DE] bg-[#F6F4EE] text-[#4B5563] hover:border-[#DEDBD4] hover:text-[#0A0A0A]",
                  ].join(" ")}
                >
                  <span className="text-base">{r.emoji}</span>
                  <span className="text-[13px] font-medium">{r.label}</span>
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-[13px] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                />
                {industryOpen && filteredIndustries.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl bg-[#FFFFFF] border border-[#E5E3DE] shadow-2xl overflow-auto max-h-52">
                    {filteredIndustries.map((item) => (
                      <button
                        key={item}
                        onMouseDown={() => {
                          setIndustry(item)
                          setIndustryQuery(item)
                          setIndustryOpen(false)
                        }}
                        className={[
                          "w-full text-left px-4 py-2.5 text-[13px] transition-colors",
                          industry === item
                            ? "text-[#1A1A1A] bg-[rgba(26,26,26,0.1)]"
                            : "text-[#374151] hover:bg-[#F1EFE9] hover:text-[#0A0A0A]",
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Describe your business — e.g. I help B2B SaaS founders grow with content"
                className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-[13px] focus:outline-none focus:border-[#1A1A1A] transition-colors"
              />
            </div>
          </Section>

          {/* ── Content Topics ── */}
          <Section
            title="Content Topics"
            hint={`Pick ${TOPICS_MIN}–${TOPICS_MAX} topics you post about.`}
          >
            <div
              className="min-h-[88px] p-3.5 rounded-xl bg-[#F6F4EE] border border-[#E5E3DE] flex flex-wrap gap-2 cursor-text focus-within:border-[#1A1A1A] transition-colors"
              onClick={() => document.getElementById("topic-input")?.focus()}
            >
              {topics.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(26,26,26,0.16)] border border-[rgba(26,26,26,0.25)] text-[#1A1A1A] text-[13px]"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTopic(tag)
                    }}
                    className="text-[rgba(26,26,26,0.55)] hover:text-[#1A1A1A]"
                  >
                    <X size={11} />
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
                  className="flex-1 min-w-[140px] bg-transparent text-[#0A0A0A] text-[13px] placeholder-[#C4C0B6] outline-none"
                />
              )}
            </div>
            <p className="text-[11px] text-[#ADA99F]">
              {topics.length}/{TOPICS_MAX}
              {topics.length < TOPICS_MIN && ` · add at least ${TOPICS_MIN}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPIC_SUGGESTIONS.filter((s) => !topics.includes(s)).map((s) => (
                <button
                  key={s}
                  onClick={() => addTopic(s)}
                  disabled={topics.length >= TOPICS_MAX}
                  className="px-3 py-1.5 rounded-full border border-[#E5E3DE] text-[12px] text-[#6B7280] hover:border-[#D6D3CC] hover:text-[#1A1A1A] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </Section>

          {/* ── Target Audience ── */}
          <Section title="Target Audience" hint="Who are you writing for?">
            <div className="flex flex-col gap-3">
              <input
                value={audienceRole}
                onChange={(e) => setAudienceRole(e.target.value)}
                placeholder="Their job role — e.g. Marketing Manager, CTO…"
                className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-[13px] focus:outline-none focus:border-[#1A1A1A] transition-colors"
              />
              <div className="flex flex-wrap gap-2">
                {SENIORITY.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAudienceSeniority(audienceSeniority === opt ? "" : opt)}
                    className={[
                      "px-3.5 py-2 rounded-full border text-[12px] transition-colors",
                      audienceSeniority === opt
                        ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.12)] text-[#1A1A1A]"
                        : "border-[#E5E3DE] text-[#6B7280] hover:border-[#DEDBD4] hover:text-[#1A1A1A]",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                value={audienceIndustry}
                onChange={(e) => setAudienceIndustry(e.target.value)}
                placeholder="Their industry — e.g. B2B SaaS, Healthcare…"
                className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-[13px] focus:outline-none focus:border-[#1A1A1A] transition-colors"
              />
              <textarea
                value={coreProblem}
                onChange={(e) => setCoreProblem(e.target.value)}
                rows={3}
                placeholder="Core problem they face — e.g. struggling to generate leads on LinkedIn…"
                className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-[13px] focus:outline-none focus:border-[#1A1A1A] transition-colors resize-none"
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
                      "flex items-start gap-3.5 px-4 py-3.5 rounded-xl border cursor-pointer transition-all",
                      selected
                        ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.08)]"
                        : "border-[#E5E3DE] bg-[#F6F4EE] hover:border-[#DEDBD4]",
                    ].join(" ")}
                  >
                    <span className="text-lg mt-0.5 select-none">{goal.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[13px] font-medium ${selected ? "text-[#0A0A0A]" : "text-[#4B5563]"}`}>
                          {goal.label}
                        </p>
                        {isPrimary && (
                          <span className="px-2 py-0.5 rounded-full bg-[rgba(26,26,26,0.2)] border border-[rgba(26,26,26,0.3)] text-[#1A1A1A] text-[10px] font-medium">
                            Primary
                          </span>
                        )}
                        {selected && !isPrimary && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPrimaryGoal(goal.id)
                            }}
                            className="text-[10px] text-[#9CA3AF] hover:text-[rgba(26,26,26,0.7)] transition-colors"
                          >
                            Set primary
                          </button>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">{goal.description}</p>
                    </div>
                    {selected && (
                      <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 mt-0.5">
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
                      "w-full text-left px-4 py-3.5 rounded-xl border transition-all",
                      selected
                        ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.08)]"
                        : "border-[#E5E3DE] bg-[#F6F4EE] hover:border-[#DEDBD4]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-[13px] font-medium ${selected ? "text-[#0A0A0A]" : "text-[#4B5563]"}`}>
                        {tone.label}
                      </p>
                      {selected && <span className="w-4 h-4 rounded-full bg-[#1A1A1A] flex-shrink-0" />}
                    </div>
                    <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">{tone.description}</p>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Error + Save */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 sticky bottom-4">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={[
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
                canSave
                  ? "bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)]"
                  : "bg-[rgba(26,26,26,0.3)] opacity-50 cursor-not-allowed",
              ].join(" ")}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <p className="text-[12px] text-[#9CA3AF]">
              Applies to your next idea generation.
            </p>
          </div>
        </div>
      )}

      <SavedToast open={saved} onClose={() => setSaved(false)} message="Profile saved" />
    </div>
  )
}
