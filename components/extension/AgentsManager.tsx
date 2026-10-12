"use client"

// Extension → AI agents: the custom AI conversation agents both extensions'
// Messages screens reply with (model EngageAgent). Same routes, rules and
// fields as the panel's Agents tab (app/api/ext/agents), so an agent edited
// here is the agent the panel uses, and the other way round.
//
// Saving sends the version the edit started from: if the agent was changed
// in the panel meanwhile, the server refuses (409) and the newer version is
// loaded here instead of being overwritten.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Bot, Copy, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  "w-full rounded-control border border-border bg-surface-raised px-3.5 py-2.5 text-label text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"

function Field({ label, hint, required, wide, children }: { label: string; hint?: string; required?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-2 ${wide ? "md:col-span-2" : ""}`}>
      <span className="flex flex-col gap-0.5">
        <span className="text-caption font-semibold text-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {hint && <span className="text-caption leading-[1.5] text-muted-foreground">{hint}</span>}
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
        <span className="text-caption font-semibold text-foreground">{label}</span>
        <span className="text-caption leading-[1.5] text-muted-foreground">{hint}</span>
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
              className="mt-2 rounded-control-sm p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-danger"
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
          className="inline-flex w-fit items-center gap-1.5 rounded-control-sm border border-border px-3 py-1.5 text-caption font-medium text-foreground hover:bg-surface-muted"
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
      <h4 className="border-b border-border pb-2 text-label font-semibold text-foreground">{title}</h4>
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
    <div className="flex flex-col gap-8 rounded-showcase border border-border bg-surface-raised p-6 shadow-card sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-title-sm font-semibold text-foreground">{existing ? "Edit agent" : "New agent"}</h3>
        <button type="button" onClick={onCancel} aria-label="Close" className="relative -mt-1 -mr-1 rounded-control-sm p-1.5 text-muted-foreground after:absolute after:-inset-1.5 after:content-[''] hover:bg-surface-muted hover:text-foreground">
          <X size={16} aria-hidden />
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

      <label className="flex items-center gap-2 text-label text-foreground">
        <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} />
        Start new conversations with this agent
      </label>

      {error && <p className="text-label text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <Button onClick={() => void save()} disabled={!canSave} aria-busy={saving || undefined}>
          {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {existing ? "Save changes" : "Create agent"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** One block of the briefing: its title in the margin, its content beside it. */
function BriefSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-3 border-t border-border pt-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8">
      <h3 className="text-label font-semibold text-foreground">{title}</h3>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </section>
  )
}

function BriefItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption text-muted-foreground">{label}</p>
      <div className="text-label whitespace-pre-line text-foreground">{children}</div>
    </div>
  )
}

/**
 * The selected agent as a briefing: who it speaks for, what it's for, how it
 * sounds, what it knows, its rules, and replies in its voice.
 */
function AgentBrief({
  agent,
  pending,
  confirming,
  onEdit,
  onDuplicate,
  onToggleDefault,
  onAskDelete,
  onDelete,
  onKeep,
}: {
  agent: Agent
  pending: boolean
  confirming: boolean
  onEdit: () => void
  onDuplicate: () => void
  onToggleDefault: () => void
  onAskDelete: () => void
  onDelete: () => void
  onKeep: () => void
}) {
  const c = { ...EMPTY_CONFIG, ...agent.config }
  const facts = c.facts.filter((x) => x.trim())
  const objections = c.objections.filter((x) => x.trim())
  const examples = c.examples.filter((x) => x.trim())
  const has = (...v: string[]) => v.some((x) => x.trim())

  return (
    <article aria-label={agent.name} className="flex flex-col gap-6 rounded-showcase border border-border bg-surface-raised p-6 shadow-card sm:p-8 lg:p-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {agent.isDefault && (
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] leading-4 font-semibold text-success">Default</span>
          )}
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] leading-4 font-semibold text-muted-foreground">
            {AGENT_PURPOSE_LABELS[agent.purpose]}
          </span>
        </div>
        <h2 className="font-display text-[2.5rem] leading-[1.02] font-normal tracking-[-0.01em] text-balance text-foreground sm:text-[3.25rem]">
          {agent.name}
        </h2>
        {(agent.description || c.goals) && (
          <p className="max-w-[62ch] text-body-lg text-foreground/80">{agent.description || c.goals}</p>
        )}
      </header>

      {has(c.business, c.offer, c.audience) && (
        <BriefSection title="Your business">
          {c.business.trim() && <BriefItem label="Who you are, what you do">{c.business}</BriefItem>}
          {c.offer.trim() && <BriefItem label="What you offer">{c.offer}</BriefItem>}
          {c.audience.trim() && <BriefItem label="Who you talk to">{c.audience}</BriefItem>}
        </BriefSection>
      )}

      <BriefSection title="Goals">
        <BriefItem label="What these conversations are for">{c.goals}</BriefItem>
        {c.nextStep.trim() && <BriefItem label="Next step to aim for">{c.nextStep}</BriefItem>}
        {c.strategy.trim() && <BriefItem label="How to move the conversation">{c.strategy}</BriefItem>}
      </BriefSection>

      <BriefSection title="Style">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          {[
            ["Tone", c.tone],
            ["Reply length", LENGTH_LABELS[c.length]],
            ["Language", c.language],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-caption text-muted-foreground">{label}</dt>
              <dd className="text-label font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </BriefSection>

      {(facts.length > 0 || objections.length > 0) && (
        <BriefSection title="Knowledge">
          {facts.length > 0 && (
            <BriefItem label="Verified facts">
              <ul className="flex flex-col gap-1.5">
                {facts.map((f, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-success" />
                    {f}
                  </li>
                ))}
              </ul>
            </BriefItem>
          )}
          {objections.length > 0 && (
            <BriefItem label="Objections and situations">
              <ul className="flex flex-col gap-1.5">
                {objections.map((o, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
                    {o}
                  </li>
                ))}
              </ul>
            </BriefItem>
          )}
        </BriefSection>
      )}

      {has(c.alwaysDo, c.neverDo) && (
        <BriefSection title="Rules">
          <div className="grid gap-5 sm:grid-cols-2">
            {c.alwaysDo.trim() && <BriefItem label="Always">{c.alwaysDo}</BriefItem>}
            {c.neverDo.trim() && <BriefItem label="Never">{c.neverDo}</BriefItem>}
          </div>
        </BriefSection>
      )}

      {examples.length > 0 && (
        <BriefSection title="Examples">
          <ul className="flex flex-col gap-2.5" aria-label="Replies that sound like you">
            {examples.map((e, i) => (
              <li key={i} className="max-w-[60ch] self-end rounded-[1.25rem] rounded-br-md bg-brand-soft px-4 py-3 text-label whitespace-pre-line text-foreground">
                {e}
              </li>
            ))}
          </ul>
        </BriefSection>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Delete ${agent.name}?`}>
            <span className="text-label font-medium text-danger">Delete this agent?</span>
            <Button variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={onKeep}>
              Keep it
            </Button>
          </div>
        ) : (
          <>
            <Button variant="outline" size="sm" disabled={pending} onClick={onEdit}>
              <Pencil aria-hidden /> Edit
            </Button>
            <Button variant="ghost" size="sm" disabled={pending} onClick={onDuplicate}>
              <Copy aria-hidden /> Duplicate
            </Button>
            <Button variant="ghost" size="sm" disabled={pending} onClick={onToggleDefault}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Star aria-hidden />}
              {agent.isDefault ? "Stop using by default" : "Make default"}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete"
              disabled={pending}
              onClick={onAskDelete}
              className="ml-auto text-muted-foreground hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
      </footer>
    </article>
  )
}

export function AgentsManager() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ existing: Agent | null; seed: Draft } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  // Which agent the briefing shows (null: the default, else the first).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

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

  // On narrow screens the panel sits under the list: bring it into view.
  const reveal = () =>
    requestAnimationFrame(() => {
      if (!window.matchMedia("(min-width: 64rem)").matches) detailRef.current?.scrollIntoView({ block: "start" })
    })
  const edit = (next: { existing: Agent | null; seed: Draft }) => {
    setEditing(next)
    reveal()
  }

  const selected =
    agents?.find((a) => a.id === selectedId) ?? agents?.find((a) => a.isDefault) ?? agents?.[0] ?? null
  const atLimit = agents !== null && agents.length >= AGENT_LIMITS.agentsPerUser

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h2 className="text-title-sm font-semibold text-foreground">AI agents</h2>
          <p className="text-body text-muted-foreground">
            An agent knows your business, who you talk to and what your conversations are for, and writes your replies on the
            Messages screen of both extensions (LinkedIn and X). You review every reply before sending.
          </p>
        </div>
        <Button onClick={() => edit({ existing: null, seed: draftOf(null) })} disabled={atLimit}>
          <Plus aria-hidden /> New agent
        </Button>
      </div>

      {error && (
        <p className="rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger" role="alert">
          {error}
        </p>
      )}

      {agents === null ? (
        !error && <p className="text-label text-muted-foreground">Loading…</p>
      ) : agents.length === 0 && !editing ? (
        <div className="flex flex-col items-center gap-2 rounded-showcase border border-dashed border-border bg-surface-raised px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Bot className="size-5" aria-hidden />
          </span>
          <p className="text-body font-semibold text-foreground">No agents yet</p>
          <p className="max-w-md text-label text-muted-foreground">Create one, then pick it on the extension&apos;s Messages screen.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="Agents" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <ul className="flex flex-col gap-0.5">
              {agents.map((agent) => {
                const current = !editing && agent.id === selected?.id
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => {
                        setEditing(null)
                        setConfirmingId(null)
                        setSelectedId(agent.id)
                        reveal()
                      }}
                      className="relative flex w-full flex-col gap-0.5 rounded-control px-3 py-2.5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-muted aria-[current=true]:bg-surface-raised aria-[current=true]:shadow-card aria-[current=true]:before:absolute aria-[current=true]:before:inset-y-2.5 aria-[current=true]:before:left-0 aria-[current=true]:before:w-0.5 aria-[current=true]:before:rounded-full aria-[current=true]:before:bg-brand"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-label font-semibold text-foreground">{agent.name}</span>
                        {agent.isDefault && (
                          <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[11px] leading-4 font-semibold text-success">
                            Default
                          </span>
                        )}
                      </span>
                      <span className="truncate text-caption text-muted-foreground">{AGENT_PURPOSE_LABELS[agent.purpose]}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div ref={detailRef} className="min-w-0 scroll-mt-28">
            {editing ? (
              <AgentEditor
                key={editing.existing?.id ?? "new"}
                existing={editing.existing}
                seed={editing.seed}
                onCancel={() => setEditing(null)}
                onDone={() => {
                  setEditing(null)
                  void load()
                }}
              />
            ) : (
              selected && (
                <AgentBrief
                  key={selected.id}
                  agent={selected}
                  pending={pendingId === selected.id}
                  confirming={confirmingId === selected.id}
                  onEdit={() => edit({ existing: selected, seed: draftOf(selected) })}
                  onDuplicate={() => edit({ existing: null, seed: draftOf(selected, true) })}
                  onToggleDefault={() => void setDefault(selected, !selected.isDefault)}
                  onAskDelete={() => setConfirmingId(selected.id)}
                  onDelete={() => void act(selected.id, () => extApi(`/api/ext/agents/${selected.id}`, { method: "DELETE" }))}
                  onKeep={() => setConfirmingId(null)}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
