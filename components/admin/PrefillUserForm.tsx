"use client"

// /admin/prefill-user — pre-create someone's onboarding profile by email, so
// when they sign up normally they land straight on the dashboard instead of
// going through onboarding (see app/api/admin/prefill-user). Collects the
// exact same fields the real onboarding flow does (see
// app/(onboarding)/onboarding/*), sourced from the same shared option lists.
import { useState } from "react"
import { X } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, AdminSelect } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import {
  ROLES,
  INDUSTRIES,
  TOPIC_SUGGESTIONS,
  TOPICS_MIN,
  TOPICS_MAX,
  SENIORITY,
  GOALS,
  TONES,
} from "@/lib/profile/options"

function ToggleRow({
  options,
  selected,
  onToggle,
}: {
  options: readonly { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onToggle(o.id)}
          className={`px-3 py-1.5 rounded-full border text-[12.5px] transition-colors ${
            selected.includes(o.id)
              ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#A78BFA]"
              : "border-[#2A2A2A] text-[#8A8A8A] hover:border-[#3A3A3A] hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PrefillUserForm() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [industry, setIndustry] = useState("")
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
  const [saving, setSaving] = useState(false)

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
    setTones((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 2 ? [...prev, id] : prev,
    )
  }

  function reset() {
    setEmail("")
    setRole("")
    setIndustry("")
    setNiche("")
    setTopics([])
    setAudienceRole("")
    setAudienceSeniority("")
    setAudienceIndustry("")
    setCoreProblem("")
    setGoals([])
    setPrimaryGoal("")
    setTones([])
  }

  const canSave = !!email.trim() && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/prefill-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
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

      toast(
        data.status === "applied_existing_user"
          ? "Profile updated — they'll see it next time they load the app."
          : "Saved. It'll apply automatically the moment this email signs up.",
        "success",
      )
      reset()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <p className="text-[13px] text-[#8A8A8A]">
        Pre-fill a user&apos;s onboarding profile by email — for people who told you what they
        post about outside the app. If they&apos;ve already signed up, this overwrites their
        Profile directly. If not, it&apos;s held as a pending prefill and applied automatically
        the moment they sign up, so they skip onboarding and land on the dashboard with a banner
        prompting them to review it.
      </p>

      <AdminCard title="Who">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wide text-[#8A8A8A]">
            Email *
          </label>
          <AdminInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@company.com"
            className="w-full max-w-sm"
          />
        </div>
      </AdminCard>

      <AdminCard title="Identity">
        <ToggleRow options={ROLES} selected={role ? [role] : []} onToggle={(id) => setRole(role === id ? "" : id)} />
      </AdminCard>

      <AdminCard title="Industry & Niche">
        <div className="flex flex-col gap-3">
          <AdminSelect value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full">
            <option value="">Select an industry…</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </AdminSelect>
          <AdminInput
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Describe their business — e.g. I help B2B SaaS founders grow with content"
            className="w-full"
          />
        </div>
      </AdminCard>

      <AdminCard title="Content Topics" actions={<span className="text-[11px] text-[#6A6A6A]">{topics.length}/{TOPICS_MAX}</span>}>
        <div className="flex flex-col gap-3">
          <div
            className="min-h-[52px] p-2.5 rounded-lg bg-[#141414] border border-[#2A2A2A] flex flex-wrap gap-2 cursor-text"
            onClick={() => document.getElementById("prefill-topic-input")?.focus()}
          >
            {topics.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[#A78BFA] text-[12px]"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTopic(tag)
                  }}
                  className="text-[#A78BFA]/70 hover:text-[#A78BFA]"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {topics.length < TOPICS_MAX && (
              <input
                id="prefill-topic-input"
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
                className="flex-1 min-w-[140px] bg-transparent text-[13px] text-white placeholder:text-[#5A5A5A] outline-none"
              />
            )}
          </div>
          <p className="text-[11px] text-[#6A6A6A]">
            {topics.length < TOPICS_MIN ? `Add at least ${TOPICS_MIN}, or ` : ""}pick from
            suggestions:
          </p>
          <div className="flex flex-wrap gap-2">
            {TOPIC_SUGGESTIONS.filter((s) => !topics.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTopic(s)}
                disabled={topics.length >= TOPICS_MAX}
                className="px-2.5 py-1 rounded-full border border-[#2A2A2A] text-[12px] text-[#8A8A8A] hover:border-[#3A3A3A] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Target Audience">
        <div className="flex flex-col gap-3">
          <AdminInput
            value={audienceRole}
            onChange={(e) => setAudienceRole(e.target.value)}
            placeholder="Their job role — e.g. Marketing Manager, CTO…"
            className="w-full"
          />
          <ToggleRow
            options={SENIORITY.map((s) => ({ id: s, label: s }))}
            selected={audienceSeniority ? [audienceSeniority] : []}
            onToggle={(id) => setAudienceSeniority(audienceSeniority === id ? "" : id)}
          />
          <AdminInput
            value={audienceIndustry}
            onChange={(e) => setAudienceIndustry(e.target.value)}
            placeholder="Their industry — e.g. B2B SaaS, Healthcare…"
            className="w-full"
          />
          <textarea
            value={coreProblem}
            onChange={(e) => setCoreProblem(e.target.value)}
            rows={3}
            placeholder="Core problem they face — e.g. struggling to generate leads on LinkedIn…"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED] transition-colors resize-none"
          />
        </div>
      </AdminCard>

      <AdminCard title="Content Goals">
        <div className="flex flex-col gap-3">
          <ToggleRow options={GOALS} selected={goals} onToggle={toggleGoal} />
          {goals.length > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-[#8A8A8A]">
              Primary:
              <AdminSelect value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)}>
                {goals.map((id) => (
                  <option key={id} value={id}>
                    {GOALS.find((g) => g.id === id)?.label ?? id}
                  </option>
                ))}
              </AdminSelect>
            </div>
          )}
        </div>
      </AdminCard>

      <AdminCard title="Tone & Voice" actions={<span className="text-[11px] text-[#6A6A6A]">up to 2</span>}>
        <ToggleRow options={TONES} selected={tones} onToggle={toggleTone} />
      </AdminCard>

      <div className="flex items-center gap-3">
        <AdminButton onClick={handleSave} disabled={!canSave} loading={saving}>
          Create Pre-filled Profile
        </AdminButton>
        {!email.trim() && <span className="text-[12px] text-[#6A6A6A]">Email is required</span>}
      </div>
    </div>
  )
}
