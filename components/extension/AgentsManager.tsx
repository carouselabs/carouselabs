"use client"

// Extension → AI agents: the custom AI conversation agents both extensions'
// Messages screens reply with (model EngageAgent). Same routes, rules and
// fields as the panel's Agents tab (app/api/ext/agents), so an agent edited
// here is the agent the panel uses, and the other way round.
//
// Saving sends the version the edit started from: if the agent was changed
// in the panel meanwhile, the server refuses (409) and the newer version is
// loaded here instead of being overwritten.
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Bot, Copy, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import {
  AGENT_LENGTHS,
  AGENT_LIMITS,
  AGENT_PURPOSES,
  AGENT_PURPOSE_LABELS,
  MATCH_CONVERSATION_LANGUAGE,
  type AgentConfig,
  type AgentLength,
  type AgentPurpose,
} from "@/lib/engageAgents"
import { errorMessage, extApi, ExtApiError, LANGUAGES } from "./api"

interface Agent {
  id: string
  name: string
  description: string
  purpose: AgentPurpose
  status: "active" | "draft"
  isDefault: boolean
  version: number
  config: AgentConfig
  updatedAt: string
}

interface Draft {
  name: string
  description: string
  purpose: AgentPurpose
  config: AgentConfig
}

const TONES = ["Natural", "Professional", "Casual, latest slang", "Simple, plain English", "Warm", "Direct"]
const LENGTH_LABELS: Record<AgentLength, string> = {
  auto: "Whatever fits the moment",
  short: "Short (1-3 sentences)",
  medium: "Medium (a short paragraph)",
  long: "Long (when there's substance)",
}

const EMPTY_CONFIG: AgentConfig = {
  business: "",
  offer: "",
  audience: "",
  goals: "",
  nextStep: "",
  strategy: "",
  tone: "Natural",
  length: "auto",
  language: MATCH_CONVERSATION_LANGUAGE,
  facts: [],
  objections: [],
  alwaysDo: "",
  neverDo: "",
  examples: [],
}

const draftOf = (agent: Agent | null, copy = false): Draft =>
  agent
    ? { name: copy ? `${agent.name} copy` : agent.name, description: agent.description, purpose: agent.purpose, config: { ...EMPTY_CONFIG, ...agent.config } }
    : { name: "", description: "", purpose: "sales", config: EMPTY_CONFIG }

const inputClass =
  "w-full rounded-xl border border-[#E5E3DE] bg-white px-3.5 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15"

function Field({ label, hint, required, wide, children }: { label: string; hint?: string; required?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-2 ${wide ? "md:col-span-2" : ""}`}>
      <span className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-semibold text-[#0A0A0A]">
          {label}
          {required && <span className="text-[#DC2626]"> *</span>}
        </span>
        {hint && <span className="text-[12px] leading-[1.5] text-[#9CA3AF]">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function ListField({ label, hint, noun, items, max, onChange }: { label: string; hint: string; noun: string; items: string[]; max: number; onChange: (items: string[]) => void }) {
  const shown = items.length > 0 ? items : [""]
  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-semibold text-[#0A0A0A]">{label}</span>
        <span className="text-[12px] leading-[1.5] text-[#9CA3AF]">{hint}</span>
      </span>
      {shown.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            aria-label={`${noun} ${i + 1}`}
            className={`${inputClass} resize-y`}
            rows={2}
            value={item}
            placeholder={`${noun[0].toUpperCase()}${noun.slice(1)} ${i + 1}`}
            onChange={(e) => onChange(shown.map((s, j) => (j === i ? e.target.value : s)))}
          />
          {shown.length > 1 && (
            <button
              type="button"
              aria-label={`Remove ${noun} ${i + 1}`}
              onClick={() => onChange(shown.filter((_, j) => j !== i))}
              className="mt-2 rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#F4F2EC] hover:text-[#DC2626]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {shown.length < max && (
        <button
          type="button"
          onClick={() => onChange([...shown, ""])}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-[12.5px] font-medium text-[#374151] hover:bg-[#F4F2EC]"
        >
          <Plus size={13} /> Add {noun}
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h4 className="border-b border-[#F0EEE9] pb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{title}</h4>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">{children}</div>
    </section>
  )
}

const cleaned = (items: string[]) => items.map((s) => s.trim()).filter(Boolean)

function AgentEditor({ existing, seed, onDone, onCancel }: { existing: Agent | null; seed: Draft; onDone: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(seed)
  const [version, setVersion] = useState(existing?.version ?? 0)
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const c = draft.config
  const set = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) =>
    setDraft((d) => ({ ...d, config: { ...d.config, [key]: value } }))
  const canSave = Boolean(draft.name.trim() && c.goals.trim()) && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await extApi(existing ? `/api/ext/agents/${existing.id}` : "/api/ext/agents", {
        method: existing ? "PUT" : "POST",
        body: JSON.stringify({
          ...draft,
          status: "active",
          config: { ...c, facts: cleaned(c.facts), objections: cleaned(c.objections), examples: cleaned(c.examples) },
          ...(existing ? { version } : {}),
          ...(setAsDefault ? { setAsDefault: true } : {}),
        }),
      })
      onDone()
    } catch (err) {
      const latest = err instanceof ExtApiError && err.status === 409 ? (err.data.agent as Agent | undefined) : undefined
      if (latest) {
        setDraft(draftOf(latest))
        setVersion(latest.version)
      }
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const text = (key: "business" | "offer" | "audience" | "goals" | "strategy" | "alwaysDo" | "neverDo", placeholder: string) => (
    <textarea className={`${inputClass} resize-y`} rows={3} value={c[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
  )

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-[#E5E3DE] bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold text-[#0A0A0A]">{existing ? "Edit agent" : "New agent"}</h3>
        <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#F4F2EC] hover:text-[#0A0A0A]">
          <X size={16} />
        </button>
      </div>

      <Section title="The agent">
        <Field label="Agent name" required>
          <input className={inputClass} value={draft.name} maxLength={AGENT_LIMITS.name} placeholder="e.g. Founder outreach" onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </Field>
        <Field label="Kind of agent">
          <select className={inputClass} value={draft.purpose} onChange={(e) => setDraft((d) => ({ ...d, purpose: e.target.value as AgentPurpose }))}>
            {AGENT_PURPOSES.map((p) => (
              <option key={p} value={p}>
                {AGENT_PURPOSE_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Short description" wide>
          <input className={inputClass} value={draft.description} maxLength={AGENT_LIMITS.description} placeholder="e.g. Builds relationships with SaaS founders" onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
        </Field>
      </Section>

      <Section title="Your business">
        <Field label="Who you are, what you do" wide>{text("business", "e.g. I run a SaaS company that helps people create LinkedIn content")}</Field>
        <Field label="What you offer" hint="Your product or service, and why it's worth having." wide>{text("offer", "e.g. Turns one idea into a week of LinkedIn posts and carousels")}</Field>
        <Field label="Who you talk to" wide>{text("audience", "e.g. Founders and creators who struggle to post consistently")}</Field>
      </Section>

      <Section title="Goals">
        <Field label="What these conversations are for" required wide>{text("goals", "e.g. Understand their challenges and build a real relationship; introduce the product only when it fits")}</Field>
        <Field label="Next step to aim for" hint="Only suggested once the conversation is ready for it.">
          <input className={inputClass} value={c.nextStep} maxLength={AGENT_LIMITS.nextStep} placeholder="e.g. A 15-minute call" onChange={(e) => set("nextStep", e.target.value)} />
        </Field>
        <Field label="How to move the conversation" wide>{text("strategy", "e.g. Ask about their content process first; mention the product only if they share a problem it solves")}</Field>
      </Section>

      <Section title="Style">
        <Field label="Tone">
          <select className={inputClass} value={c.tone} onChange={(e) => set("tone", e.target.value)}>
            {(TONES.includes(c.tone) ? TONES : [c.tone, ...TONES]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reply length">
          <select className={inputClass} value={c.length} onChange={(e) => set("length", e.target.value as AgentLength)}>
            {AGENT_LENGTHS.map((l) => (
              <option key={l} value={l}>
                {LENGTH_LABELS[l]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select className={inputClass} value={c.language} onChange={(e) => set("language", e.target.value)}>
            {[...new Set([MATCH_CONVERSATION_LANGUAGE, ...LANGUAGES, c.language])].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
          </select>
        </Field>
      </Section>

      <Section title="Knowledge">
        <ListField
          label="Verified facts"
          hint="The only things it may say about your product: prices, features, results. Anything not here, it won't claim."
          noun="fact"
          items={c.facts}
          max={AGENT_LIMITS.facts}
          onChange={(facts) => set("facts", facts)}
        />
        <ListField
          label="Objections and situations"
          hint={"Each with how to handle it, e.g. “Too expensive: mention the free plan, don't push.”"}
          noun="situation"
          items={c.objections}
          max={AGENT_LIMITS.objections}
          onChange={(objections) => set("objections", objections)}
        />
      </Section>

      <Section title="Rules">
        <Field label="Always" wide>{text("alwaysDo", "e.g. Answer their question before anything else")}</Field>
        <Field label="Never" wide>{text("neverDo", "e.g. Never pitch in the first reply, never ask for a call twice")}</Field>
      </Section>

      <Section title="Examples">
        <ListField
          label="Replies that sound like you"
          hint="Optional, but the strongest lever on voice."
          noun="example"
          items={c.examples}
          max={AGENT_LIMITS.examples}
          onChange={(examples) => set("examples", examples)}
        />
      </Section>

      <label className="flex items-center gap-2 text-[13px] text-[#374151]">
        <input type="checkbox" className="h-4 w-4 accent-[#7C3AED]" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} />
        Start new conversations with this agent
      </label>

      {error && <p className="text-[13px] text-[#DC2626]" role="alert">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {existing ? "Save changes" : "Create agent"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0A]">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function AgentsManager() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ existing: Agent | null; seed: Draft } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const load = useCallback(() => {
    return extApi<{ agents: Agent[] }>("/api/ext/agents")
      .then(({ agents: list }) => {
        setAgents(list)
        setError(null)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: () => Promise<unknown>) {
    setPendingId(id)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPendingId(null)
      setConfirmingId(null)
      await load()
    }
  }

  const setDefault = (agent: Agent, isDefault: boolean) =>
    act(agent.id, () =>
      extApi(`/api/ext/agents/${agent.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...draftOf(agent), status: agent.status, version: agent.version, setAsDefault: isDefault }),
      }),
    )

  if (editing) {
    return (
      <AgentEditor
        existing={editing.existing}
        seed={editing.seed}
        onCancel={() => setEditing(null)}
        onDone={() => {
          setEditing(null)
          void load()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 className="text-[16px] font-bold text-[#0A0A0A]">AI agents</h2>
          <p className="text-[13px] leading-[1.6] text-[#6B7280]">
            An agent knows your business, who you talk to and what your conversations are for, and writes your replies on the
            Messages screen of both extensions (LinkedIn and X). You review every reply before sending.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ existing: null, seed: draftOf(null) })}
          disabled={agents !== null && agents.length >= AGENT_LIMITS.agentsPerUser}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          <Plus size={15} /> New agent
        </button>
      </div>

      {error && <p className="text-[13px] text-[#DC2626]" role="alert">{error}</p>}

      {agents === null ? (
        !error && <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#E5E3DE] bg-white px-6 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(124,58,237,0.08)] text-[#7C3AED]">
            <Bot size={18} />
          </span>
          <p className="text-[14px] font-semibold text-[#0A0A0A]">No agents yet</p>
          <p className="max-w-md text-[13px] text-[#6B7280]">Create one, then pick it on the extension&apos;s Messages screen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {agents.map((agent) => {
            const pending = pendingId === agent.id
            return (
              <div key={agent.id} className="flex flex-col gap-2 rounded-2xl border border-[#E5E3DE] bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#0A0A0A]">{agent.name}</span>
                  {agent.isDefault && (
                    <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">Default</span>
                  )}
                  <span className="rounded-full bg-[#F4F2EC] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
                    {AGENT_PURPOSE_LABELS[agent.purpose]}
                  </span>
                </div>
                <p className="line-clamp-2 text-[13px] leading-[1.6] text-[#6B7280]">{agent.description || agent.config.goals}</p>
                {confirmingId === agent.id ? (
                  <div className="flex items-center gap-2" role="group" aria-label={`Delete ${agent.name}?`}>
                    <span className="text-[12.5px] font-medium text-[#DC2626]">Delete this agent?</span>
                    <button type="button" disabled={pending} onClick={() => void act(agent.id, () => extApi(`/api/ext/agents/${agent.id}`, { method: "DELETE" }))} className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-[12px] font-semibold text-white">
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirmingId(null)} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#6B7280]">
                      Keep it
                    </button>
                  </div>
                ) : (
                  <div className="-ml-2 flex flex-wrap items-center gap-1">
                    <button type="button" disabled={pending} onClick={() => setEditing({ existing: agent, seed: draftOf(agent) })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-[#374151] hover:bg-[#F4F2EC]">
                      <Pencil size={13} /> Edit
                    </button>
                    <button type="button" disabled={pending} onClick={() => setEditing({ existing: null, seed: draftOf(agent, true) })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-[#374151] hover:bg-[#F4F2EC]">
                      <Copy size={13} /> Duplicate
                    </button>
                    <button type="button" disabled={pending} onClick={() => void setDefault(agent, !agent.isDefault)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-[#374151] hover:bg-[#F4F2EC]">
                      {pending ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
                      {agent.isDefault ? "Stop using by default" : "Make default"}
                    </button>
                    <button type="button" aria-label="Delete" disabled={pending} onClick={() => setConfirmingId(agent.id)} className="ml-auto rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
