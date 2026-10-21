"use client"

// Extension → Custom tones: everything the side panel lets you set about how
// it writes, for each of its three kinds of writing — the custom profiles
// (create, edit, delete, default), plus the connection note settings that
// apply to every note and the reason/tone remembered for each conversation.
// Same routes, and so the same validation, as the side
// panel (app/api/ext/{profiles,connection-profiles,message-profiles,
// settings,contacts}).
//
// There is no Test button here, unlike the panel's comment builder: testing
// generates text, and generating only happens in the extension.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Copy, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NoteSettingsCard } from "./NoteSettingsCard"
import { ConversationSettingsCard } from "./ConversationSettingsCard"
import {
  errorMessage,
  extApi,
  LANGUAGES,
  type ContactContext,
  type ExtSettings,
} from "./api"

// ── The three kinds ─────────────────────────────────────────────────────────

type FieldDef =
  | { key: string; label: string; type: "text"; required?: boolean; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "select"; required?: boolean; options: string[]; hint?: string }
  | { key: string; label: string; type: "range"; required?: boolean; min: number; max: number; hint?: string }

type LinkedinDefaultKey = keyof Pick<
  ExtSettings,
  "defaultCommentProfileId" | "defaultConnectionProfileId" | "defaultMessageProfileId"
>

interface KindDef {
  id: "comment" | "connection" | "message" | "x"
  label: string
  endpoint: string
  // Where the default is saved: a field of the LinkedIn extension's settings,
  // or, for X reply profiles, X's own settings (settingsEndpoint), whose
  // current value comes back with the profile list.
  defaultKey: LinkedinDefaultKey | "defaultProfileId"
  settingsEndpoint?: string
  intro: string
  fields: FieldDef[]
  samplesLabel: string
  samplesHint: string
  empty: Draft
  // One line under the name on a profile card.
  summary: (p: Profile) => string
  description: (p: Profile) => string
}

// The panel's option lists (browser-extension-comment/src/sidepanel/
// components/*ProfileForm.tsx). The server takes any string for these, so
// they only need to agree for the two builders to feel the same.
const COMMENT_GOALS = [
  "adds one useful insight",
  "agrees and adds a personal angle",
  "asks a genuine question",
  "shares a contrasting view",
  "congratulates specifically",
]
const COMMENT_TONES = ["professional", "friendly", "direct", "warm", "witty"]
const CONNECTION_TONES = ["Plain", "Friendly", "Professional", "Direct", "Warm"]
const MESSAGE_TONES = ["Natural", "Professional", "Casual, latest slang", "Simple, plain English", "Warm", "Direct"]

// Length bounds the server enforces (LENGTH_RANGE_MIN/MAX in
// lib/commentProfiles; CONNECTION_NOTE_MIN/HARD_MAX for notes).
const COMMENT_LENGTH = { min: 15, max: 900 }
const NOTE_LENGTH = { min: 40, max: 280 }

type Draft = Record<string, string | string[]>
type Profile = Record<string, unknown> & {
  id: string
  name: string
  isSystem: boolean
  isRecommended: boolean
  isDefault?: boolean
}

type LinkedinKindId = Exclude<KindDef["id"], "x">

const KINDS: (KindDef & { id: LinkedinKindId })[] = [
  {
    id: "comment",
    label: "Comments & replies",
    endpoint: "/api/ext/profiles",
    defaultKey: "defaultCommentProfileId",
    intro: "How you sound when the extension writes a comment or a reply on LinkedIn.",
    fields: [
      { key: "name", label: "Profile name", type: "text", required: true, placeholder: "e.g. Founder voice" },
      {
        key: "whoIAm",
        label: "Who I am",
        type: "textarea",
        required: true,
        placeholder: "A B2B SaaS founder who has shipped to 10k users",
      },
      { key: "goal", label: "Comment goal", type: "select", required: true, options: COMMENT_GOALS },
      { key: "tone", label: "Tone", type: "select", required: true, options: COMMENT_TONES },
      { key: "length", label: "Length", type: "range", required: true, ...COMMENT_LENGTH },
      { key: "emoji", label: "Emoji", type: "select", options: ["None", "Rarely", "Sometimes"] },
      { key: "language", label: "Language", type: "select", options: LANGUAGES },
      { key: "alwaysDo", label: "Always do", type: "textarea", placeholder: "Optional" },
      { key: "neverDo", label: "Never do", type: "textarea", placeholder: "Optional" },
    ],
    samplesLabel: "Sample comments",
    samplesHint: "3–5 comments you've really written, so it can match your voice. Optional.",
    empty: {
      name: "",
      whoIAm: "",
      goal: COMMENT_GOALS[0],
      tone: COMMENT_TONES[0],
      length: "100-220 characters",
      emoji: "None",
      language: "English",
      alwaysDo: "",
      neverDo: "",
      samples: [],
    },
    summary: (p) => `${p.tone} · ${p.length}`,
    description: (p) => String(p.whoIAm ?? ""),
  },
  {
    id: "connection",
    label: "Connection notes",
    endpoint: "/api/ext/connection-profiles",
    defaultKey: "defaultConnectionProfileId",
    intro: "How you come across in the short note sent with a connection request.",
    fields: [
      { key: "name", label: "Profile name", type: "text", required: true, placeholder: "e.g. Agency founders" },
      {
        key: "angle",
        label: "How you come across",
        type: "textarea",
        required: true,
        placeholder: "e.g. A peer in the same field, dealing with the same problems, not an outsider admiring them",
      },
      { key: "goal", label: "Note goal", type: "text", required: true, placeholder: "e.g. Get the invite accepted" },
      { key: "tone", label: "Tone", type: "select", required: true, options: CONNECTION_TONES },
      {
        key: "length",
        label: "Length",
        type: "range",
        required: true,
        ...NOTE_LENGTH,
        hint: `LinkedIn allows 300 characters; notes are capped at ${NOTE_LENGTH.max}.`,
      },
      { key: "alwaysDo", label: "Always do", type: "textarea", placeholder: "Optional" },
      { key: "neverDo", label: "Never do", type: "textarea", placeholder: "Optional" },
    ],
    samplesLabel: "Sample notes",
    samplesHint: "Notes you've sent that got accepted. Optional.",
    empty: {
      name: "",
      angle: "",
      goal: "",
      tone: CONNECTION_TONES[0],
      length: "120-220 characters",
      alwaysDo: "",
      neverDo: "",
      samples: [],
    },
    summary: (p) => `${p.tone} · ${p.length}`,
    description: (p) => String(p.angle ?? ""),
  },
  {
    id: "message",
    label: "Conversations",
    endpoint: "/api/ext/message-profiles",
    defaultKey: "defaultMessageProfileId",
    intro: "The reason behind a LinkedIn conversation, so every message the Conversation Assistant writes moves it forward.",
    fields: [
      { key: "name", label: "Profile name", type: "text", required: true, placeholder: "e.g. Agency founder leads" },
      {
        key: "goal",
        label: "Reason",
        type: "textarea",
        required: true,
        hint: "Why this conversation is happening — a lead, a warm intro, reconnecting, peer networking, or your own words. Kept in mind on every message, even weeks apart.",
        placeholder:
          "e.g. Building a genuine relationship, no pitch — or: a potential client, understand their situation before proposing anything",
      },
      { key: "tone", label: "Tone", type: "select", required: true, options: MESSAGE_TONES },
      {
        key: "alwaysDo",
        label: "Always",
        type: "textarea",
        hint: "Rules every message in this conversation must follow.",
        placeholder: "e.g. Respond to what they actually said before adding anything new",
      },
      {
        key: "neverDo",
        label: "Never",
        type: "textarea",
        placeholder: "e.g. No pitching before there's a real conversation, no asking for a call too early",
      },
    ],
    samplesLabel: "Example messages",
    samplesHint: "Messages you've written in this kind of conversation. Optional.",
    empty: { name: "", goal: "", tone: MESSAGE_TONES[0], alwaysDo: "", neverDo: "", samples: [] },
    summary: (p) => String(p.tone ?? ""),
    description: (p) => String(p.goal ?? ""),
  },
]

// CarouseLabs Engage for X's reply profiles (app/api/ext/x/profiles): the
// comment profile's fields, with a range that ends at the account's X limit
// (280, or more with X Premium in Extension → X → Settings).
export function xKind(maxLength: number): KindDef {
  const comment = KINDS[0]
  const max = Math.min(COMMENT_LENGTH.max, maxLength)
  return {
    ...comment,
    id: "x",
    label: "X replies",
    endpoint: "/api/ext/x/profiles",
    defaultKey: "defaultProfileId",
    settingsEndpoint: "/api/ext/x/settings",
    intro: "How you sound when CarouseLabs Engage for X writes a reply. Kept separate from your LinkedIn profiles.",
    fields: comment.fields.map((f) =>
      f.key === "goal"
        ? { ...f, label: "Reply goal" }
        : f.type === "range"
          ? {
              ...f,
              min: COMMENT_LENGTH.min,
              max,
              hint:
                maxLength > 280
                  ? `X Premium is on, so replies can be up to ${max} characters.`
                  : "X allows 280 characters. Turn on X Premium in Settings for longer replies.",
            }
          : f,
    ),
    samplesLabel: "Sample replies",
    samplesHint: "3–5 replies you've really posted on X, so it can match your voice. Optional.",
    empty: { ...comment.empty, length: `80-${Math.min(220, max)} characters` },
  }
}

const MAX_SAMPLES = 5

// Mirrors rangeFromLength in the panel's ProfileForm: an explicit "N-M
// characters" wins; otherwise the legacy keyword buckets older comment
// profiles were saved with.
function rangeFromLength(length: string, bounds: { min: number; max: number }): { min: number; max: number } {
  const value = length.toLowerCase()
  const explicit = value.match(/(\d+)\s*-\s*(\d+)\s*char/)
  let range: { min: number; max: number }
  if (explicit) {
    const [a, b] = [Number(explicit[1]), Number(explicit[2])]
    range = { min: Math.min(a, b), max: Math.max(a, b) }
  } else if (value.includes("short") || value.includes("1 line")) range = { min: 40, max: 220 }
  else if (value.includes("long") || value.includes("4")) range = { min: 240, max: 900 }
  else range = { min: 110, max: 460 }
  const clamp = (n: number) => Math.min(bounds.max, Math.max(bounds.min, n))
  return { min: clamp(range.min), max: clamp(range.max) }
}

function draftFrom(kind: KindDef, profile: Profile | null, copyName = false): Draft {
  if (!profile) return { ...kind.empty, samples: [] }
  const draft: Draft = {}
  for (const f of kind.fields) {
    const raw = profile[f.key]
    let value = typeof raw === "string" ? raw : ""
    if (f.type === "range") {
      const r = rangeFromLength(value, f)
      value = `${r.min}-${r.max} characters`
    }
    draft[f.key] = value
  }
  draft.samples = Array.isArray(profile.samples) ? (profile.samples as string[]).slice(0, MAX_SAMPLES) : []
  if (copyName) draft.name = `${profile.name} (copy)`.slice(0, 80)
  return draft
}

// ── Form ────────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-control border border-border bg-surface-raised px-3.5 py-2.5 text-label text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption font-semibold text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {hint && <span className="text-caption leading-[1.5] text-muted-foreground">{hint}</span>}
    </div>
  )
}

function RangeInputs({
  value,
  bounds,
  onChange,
}: {
  value: string
  bounds: { min: number; max: number }
  onChange: (value: string) => void
}) {
  // Held as typed, not clamped per keystroke (typing "120" would otherwise
  // jump to the minimum at the first digit). An out-of-range value is
  // reported by the form and blocks Save instead.
  const parsed = value.match(/(\d+)\s*-\s*(\d+)/)
  const [minText, setMinText] = useState(parsed?.[1] ?? String(bounds.min))
  const [maxText, setMaxText] = useState(parsed?.[2] ?? String(bounds.max))
  const update = (nextMin: string, nextMax: string) => {
    setMinText(nextMin)
    setMaxText(nextMax)
    onChange(`${Number(nextMin) || 0}-${Number(nextMax) || 0} characters`)
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        className={`${inputClass} w-28`}
        min={bounds.min}
        max={bounds.max}
        value={minText}
        onChange={(e) => update(e.target.value, maxText)}
        aria-label="Minimum characters"
      />
      <span className="text-caption text-muted-foreground">to</span>
      <input
        type="number"
        className={`${inputClass} w-28`}
        min={bounds.min}
        max={bounds.max}
        value={maxText}
        onChange={(e) => update(minText, e.target.value)}
        aria-label="Maximum characters"
      />
      <span className="text-caption text-muted-foreground">characters</span>
    </div>
  )
}

function ProfileForm({
  kind,
  initial,
  existingId,
  onDone,
  onCancel,
}: {
  kind: KindDef
  initial: Draft
  existingId: string | null
  onDone: () => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, value: string | string[]) => setDraft((d) => ({ ...d, [key]: value }))
  const samples = (draft.samples as string[]) ?? []
  const missing = kind.fields.filter((f) => f.required && !String(draft[f.key] ?? "").trim())

  // Client-side check of the same range rule the server enforces, so the
  // user sees it before a round trip.
  const rangeField = kind.fields.find((f) => f.type === "range")
  const rangeProblem = (() => {
    if (!rangeField || rangeField.type !== "range") return null
    const m = String(draft[rangeField.key] ?? "").match(/(\d+)\s*-\s*(\d+)/)
    if (!m) return `Enter a length between ${rangeField.min} and ${rangeField.max} characters.`
    const [min, max] = [Number(m[1]), Number(m[2])]
    if (min < rangeField.min || max > rangeField.max || min > max) {
      return `Length must be between ${rangeField.min} and ${rangeField.max} characters, minimum first.`
    }
    return null
  })()

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await extApi(existingId ? `${kind.endpoint}/${existingId}` : kind.endpoint, {
        method: existingId ? "PUT" : "POST",
        body: JSON.stringify({
          ...draft,
          samples: samples.map((s) => s.trim()).filter(Boolean),
          setAsDefault,
        }),
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-showcase border border-border bg-surface-raised p-6 shadow-card sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-title-sm font-semibold text-foreground">
          {existingId ? "Edit profile" : "New profile"} · {kind.label}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="relative -mt-1 -mr-1 rounded-control-sm p-1.5 text-muted-foreground after:absolute after:-inset-1.5 after:content-[''] hover:bg-surface-muted hover:text-foreground"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        {kind.fields.map((f) => {
          const value = String(draft[f.key] ?? "")
          const wide = f.type === "textarea" || f.type === "range"
          return (
            <label key={f.key} className={`flex flex-col gap-2 ${wide ? "md:col-span-2" : ""}`}>
              <FieldLabel label={f.label} required={f.required} hint={f.hint} />
              {f.type === "text" && (
                <input
                  className={inputClass}
                  value={value}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
              {f.type === "textarea" && (
                <textarea
                  className={`${inputClass} resize-y`}
                  rows={3}
                  value={value}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
              {f.type === "select" && (
                <select className={inputClass} value={value} onChange={(e) => set(f.key, e.target.value)}>
                  {/* A saved value outside the list (e.g. from a built-in
                      profile) stays selectable rather than silently changing. */}
                  {(value && !f.options.includes(value) ? [value, ...f.options] : f.options).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
              {f.type === "range" && <RangeInputs value={value} bounds={f} onChange={(v) => set(f.key, v)} />}
            </label>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel label={kind.samplesLabel} hint={kind.samplesHint} />
        {samples.map((sample, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea
              className={`${inputClass} resize-y`}
              rows={2}
              value={sample}
              placeholder={`Sample ${i + 1}`}
              onChange={(e) => set("samples", samples.map((s, j) => (j === i ? e.target.value : s)))}
            />
            <button
              type="button"
              aria-label="Remove sample"
              onClick={() => set("samples", samples.filter((_, j) => j !== i))}
              className="mt-2 rounded-control-sm p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-danger"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {samples.length < MAX_SAMPLES && (
          <button
            type="button"
            onClick={() => set("samples", [...samples, ""])}
            className="inline-flex w-fit items-center gap-1.5 rounded-control-sm border border-dashed border-control-border/70 px-3 py-1.5 text-caption font-medium text-muted-foreground hover:border-control-border hover:text-foreground"
          >
            <Plus size={13} /> Add sample
          </button>
        )}
      </div>

      <label className="flex items-center gap-2.5 text-label text-foreground">
        <input
          type="checkbox"
          className="size-4 accent-[var(--brand)]"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
        />
        Make this my default
      </label>

      {(error || rangeProblem) && (
        <div role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-caption text-danger">
          {error || rangeProblem}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <Button variant="brand" disabled={saving || missing.length > 0 || !!rangeProblem} onClick={save} aria-busy={saving || undefined}>
          {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {existingId ? "Save changes" : "Create profile"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {missing.length > 0 && (
          <span className="text-caption text-muted-foreground">Fill in {missing.map((f) => f.label).join(", ")}.</span>
        )}
      </div>
    </div>
  )
}

// ── List + voice specimen ───────────────────────────────────────────────────

function Badge({ tone, children }: { tone: "brand" | "warning" | "muted"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold",
        tone === "brand" && "bg-brand-soft text-brand",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "muted" && "bg-surface-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}

/** One profile in the list on the left. */
function ProfileRow({
  kind,
  profile,
  isDefault,
  selected,
  onSelect,
}: {
  kind: KindDef
  profile: Profile
  isDefault: boolean
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="relative flex w-full flex-col gap-0.5 rounded-control px-3 py-2.5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-muted aria-[current=true]:bg-surface-raised aria-[current=true]:shadow-card aria-[current=true]:before:absolute aria-[current=true]:before:inset-y-2.5 aria-[current=true]:before:left-0 aria-[current=true]:before:w-0.5 aria-[current=true]:before:rounded-full aria-[current=true]:before:bg-brand"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-label font-semibold text-foreground">{profile.name}</span>
          {isDefault && <Badge tone="brand">Default</Badge>}
          {profile.isRecommended && <Badge tone="warning">Recommended</Badge>}
        </span>
        <span className="truncate text-caption text-muted-foreground">{kind.summary(profile)}</span>
      </button>
    </li>
  )
}

/**
 * The selected voice, laid out like a specimen sheet: its name, who it
 * speaks as, its settings, its rules, and the samples it learns from shown
 * as the comments they are.
 */
function VoiceSpecimen({
  kind,
  profile,
  isDefault,
  onEdit,
  onDuplicate,
  onMakeDefault,
  onDelete,
}: {
  kind: KindDef
  profile: Profile
  isDefault: boolean
  onEdit?: () => void
  onDuplicate: () => void
  onMakeDefault: () => void
  onDelete?: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const value = (key: string) => String(profile[key] ?? "").trim()
  // The voice's own description (Who I am / How you come across / Reason).
  const lead = kind.fields.find((f) => f.type === "textarea" && f.required)
  const spec = kind.fields.filter((f) => f.key !== "name" && f.type !== "textarea" && value(f.key))
  const rules = kind.fields.filter((f) => (f.key === "alwaysDo" || f.key === "neverDo") && value(f.key))
  const samples = Array.isArray(profile.samples) ? (profile.samples as string[]).filter((x) => x.trim()) : []

  return (
    <article
      aria-label={profile.name}
      className="flex flex-col gap-8 rounded-showcase border border-border bg-surface-raised p-6 shadow-card sm:p-8 lg:p-10"
    >
      <header className="flex flex-col gap-4">
        {(isDefault || profile.isRecommended || profile.isSystem) && (
          <div className="flex flex-wrap gap-1.5">
            {isDefault && <Badge tone="brand">Default</Badge>}
            {profile.isRecommended && <Badge tone="warning">Recommended</Badge>}
            {profile.isSystem && <Badge tone="muted">Built-in</Badge>}
          </div>
        )}
        <h2 className="font-display text-[2.5rem] leading-[1.02] font-normal tracking-[-0.01em] text-balance text-foreground sm:text-[3.25rem]">
          {profile.name}
        </h2>
        {lead && value(lead.key) && (
          <p className="max-w-[62ch] text-body-lg text-foreground/80">{value(lead.key)}</p>
        )}
      </header>

      {spec.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-y border-border py-5 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
          {spec.map((f) => (
            <div key={f.key} className="flex min-w-0 flex-col gap-1">
              <dt className="text-caption text-muted-foreground">{f.label}</dt>
              <dd className="text-label font-medium break-words text-foreground">{value(f.key)}</dd>
            </div>
          ))}
        </dl>
      )}

      {rules.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {rules.map((f) => (
            <section key={f.key} className="flex flex-col gap-1.5">
              <h3 className="flex items-center gap-2 text-caption font-medium text-muted-foreground">
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", f.key === "alwaysDo" ? "bg-success" : "bg-danger")}
                />
                {f.label}
              </h3>
              <p className="text-label whitespace-pre-line text-foreground">{value(f.key)}</p>
            </section>
          ))}
        </div>
      )}

      {samples.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-caption font-medium text-muted-foreground">{kind.samplesLabel}</h3>
          <ul className="flex flex-col gap-2.5">
            {samples.map((sample, i) => (
              <li
                key={i}
                className="max-w-[60ch] rounded-[1.25rem] rounded-tl-md bg-surface-muted px-4 py-3 text-label whitespace-pre-line text-foreground"
              >
                {sample}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil aria-hidden /> Edit
          </Button>
        )}
        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={onMakeDefault}>
            <Star aria-hidden /> Make default
          </Button>
        )}
        <Button variant={onEdit ? "ghost" : "outline"} size="sm" onClick={onDuplicate}>
          <Copy aria-hidden /> {profile.isSystem ? "Customise" : "Duplicate"}
        </Button>
        {onDelete &&
          (confirming ? (
            <span className="ml-auto flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await onDelete()
                  setDeleting(false)
                  setConfirming(false)
                }}
              >
                {deleting && <Loader2 className="animate-spin" aria-hidden />}
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete profile"
              onClick={() => setConfirming(true)}
              className="ml-auto text-muted-foreground hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 aria-hidden />
            </Button>
          ))}
      </footer>
    </article>
  )
}

type Editing = { initial: Draft; existingId: string | null } | null

export type ProfileList = { profiles: Profile[]; defaultProfileId?: string | null }
type LinkedinDefaults = Pick<ExtSettings, LinkedinDefaultKey>

const linkedinDefaults = (s: ExtSettings): LinkedinDefaults => ({
  defaultCommentProfileId: s.defaultCommentProfileId,
  defaultConnectionProfileId: s.defaultConnectionProfileId,
  defaultMessageProfileId: s.defaultMessageProfileId,
})

// What a panel starts with when its page loaded it on the server, in the
// routes' own JSON: the list, plus the note settings (connection kind) and
// the remembered conversations (message kind).
export interface KindPanelInitial {
  list: ProfileList
  settings?: ExtSettings
  contacts?: ContactContext[]
}

// Everything Custom tones shows, loaded on the server
// (app/(app)/extension/profiles/page.tsx).
export interface ProfilesInitial {
  settings: ExtSettings
  lists: Record<LinkedinKindId, ProfileList>
  contacts: ContactContext[]
}

// `defaults` are the LinkedIn defaults; X reply profiles (settingsEndpoint)
// read theirs from the list instead and need none. Without `initial` the
// panel fetches its own list.
export function KindPanel({
  kind,
  defaults,
  initial,
  onDefaultsChanged,
}: {
  kind: KindDef
  defaults: LinkedinDefaults | null
  initial?: KindPanelInitial
  onDefaultsChanged: () => void
}) {
  const [profiles, setProfiles] = useState<Profile[] | null>(initial?.list.profiles ?? null)
  const [listDefault, setListDefault] = useState<string | null>(initial?.list.defaultProfileId ?? null)
  const [editing, setEditing] = useState<Editing>(null)
  const [error, setError] = useState<string | null>(null)
  // Which profile the panel on the right shows (null: the default).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const apply = useCallback((res: ProfileList) => {
    setProfiles(res.profiles)
    setListDefault(res.defaultProfileId ?? null)
  }, [])

  // Refetch after a save or delete.
  const load = useCallback(async () => {
    try {
      apply(await extApi<ProfileList>(kind.endpoint))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [kind.endpoint, apply])

  const loadedOnServer = !!initial
  useEffect(() => {
    if (loadedOnServer) return
    let cancelled = false
    extApi<ProfileList>(kind.endpoint)
      .then((res) => !cancelled && apply(res))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [kind.endpoint, apply, loadedOnServer])

  const custom = profiles?.filter((p) => !p.isSystem) ?? []
  const builtIn = profiles?.filter((p) => p.isSystem) ?? []

  // The account's explicit default, else the shared built-in default.
  const explicitDefault = kind.settingsEndpoint
    ? listDefault
    : (defaults?.[kind.defaultKey as LinkedinDefaultKey] ?? null)
  const defaultId =
    (explicitDefault && profiles?.some((p) => p.id === explicitDefault) ? explicitDefault : null) ??
    builtIn.find((p) => p.isDefault)?.id ??
    null

  const selected =
    profiles?.find((p) => p.id === selectedId) ??
    profiles?.find((p) => p.id === defaultId) ??
    custom[0] ??
    builtIn[0] ??
    null

  // On narrow screens the panel sits under the list: bring it into view.
  const reveal = () =>
    requestAnimationFrame(() => {
      if (!window.matchMedia("(min-width: 64rem)").matches) detailRef.current?.scrollIntoView({ block: "start" })
    })

  async function makeDefault(id: string) {
    setError(null)
    try {
      await extApi(kind.settingsEndpoint ?? "/api/ext/settings", {
        method: "PATCH",
        body: JSON.stringify({ [kind.defaultKey]: id }),
      })
      if (kind.settingsEndpoint) await load()
      onDefaultsChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      await extApi(`${kind.endpoint}/${id}`, { method: "DELETE" })
      await load()
      onDefaultsChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  // Custom tones are unlimited for everyone.
  function startNew(from: Profile | null) {
    setError(null)
    setEditing({ initial: draftFrom(kind, from, !!from), existingId: null })
    reveal()
  }

  const rows = (list: Profile[]) => (
    <ul className="flex flex-col gap-0.5">
      {list.map((p) => (
        <ProfileRow
          key={p.id}
          kind={kind}
          profile={p}
          isDefault={p.id === defaultId}
          selected={!editing && p.id === selected?.id}
          onSelect={() => {
            setEditing(null)
            setSelectedId(p.id)
            reveal()
          }}
        />
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-2xl text-body text-muted-foreground">{kind.intro}</p>
      {error && (
        <div role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-caption text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Profiles" className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 pl-3">
              <h2 className="text-label font-semibold text-foreground">
                Your profiles{" "}
                <span className="font-normal text-muted-foreground">({custom.length})</span>
              </h2>
              <Button size="xs" onClick={() => startNew(null)} disabled={!profiles}>
                <Plus aria-hidden /> New profile
              </Button>
            </div>
            {!profiles ? (
              <p className="px-3 text-label text-muted-foreground">Loading…</p>
            ) : custom.length === 0 ? (
              <p className="rounded-control border border-dashed border-border px-4 py-5 text-label text-muted-foreground">
                No custom profiles yet. Create one, or customise a built-in one below.
              </p>
            ) : (
              rows(custom)
            )}
          </div>

          {builtIn.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="pl-3 text-label font-semibold text-foreground">Built-in</h2>
              {rows(builtIn)}
            </div>
          )}
        </nav>

        <div ref={detailRef} className="min-w-0 scroll-mt-28">
          {editing ? (
            <ProfileForm
              key={editing.existingId ?? "new"}
              kind={kind}
              initial={editing.initial}
              existingId={editing.existingId}
              onCancel={() => setEditing(null)}
              onDone={async () => {
                setEditing(null)
                await load()
                onDefaultsChanged()
              }}
            />
          ) : (
            selected && (
              <VoiceSpecimen
                key={selected.id}
                kind={kind}
                profile={selected}
                isDefault={selected.id === defaultId}
                onEdit={
                  selected.isSystem
                    ? undefined
                    : () => {
                        setEditing({ initial: draftFrom(kind, selected), existingId: selected.id })
                        reveal()
                      }
                }
                onDuplicate={() => startNew(selected)}
                onMakeDefault={() => makeDefault(selected.id)}
                onDelete={selected.isSystem ? undefined : () => remove(selected.id)}
              />
            )
          )}
        </div>
      </div>

      {/* Settings that apply to every note / every conversation */}
      {kind.id === "connection" && <NoteSettingsCard initial={initial?.settings} />}
      {kind.id === "message" && profiles && (
        <ConversationSettingsCard
          profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
          initialContacts={initial?.contacts}
        />
      )}
    </div>
  )
}

// With `initial` (the real page) everything arrives with the page and nothing
// is fetched on load; without it (the design preview) each part fetches its
// own. All three kinds stay mounted, the hidden ones too, so switching
// between them is instant and keeps whatever each one had open.
export function ProfilesManager({ initial }: { initial?: ProfilesInitial }) {
  const [kindId, setKindId] = useState<LinkedinKindId>("comment")
  const [defaults, setDefaults] = useState<LinkedinDefaults | null>(
    initial ? linkedinDefaults(initial.settings) : null,
  )
  const [error, setError] = useState<string | null>(null)

  // The settings route has the defaults, read off the account row alone.
  const loadDefaults = useCallback(() => {
    extApi<ExtSettings>("/api/ext/settings")
      .then((s) => setDefaults(linkedinDefaults(s)))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const loadedOnServer = !!initial
  useEffect(() => {
    if (!loadedOnServer) loadDefaults()
  }, [loadedOnServer, loadDefaults])

  return (
    <div className="flex flex-col gap-8">
      <div role="group" aria-label="Kind of writing" className="no-scrollbar -mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
        <div className="inline-flex gap-1 rounded-full border border-border bg-surface-muted p-1">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kindId === k.id}
              onClick={() => setKindId(k.id)}
              className="h-9 shrink-0 rounded-full px-4 text-label font-medium whitespace-nowrap text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card"
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-label text-danger">{error}</p>}
      {defaults
        ? KINDS.map((k) => (
            <div key={k.id} hidden={k.id !== kindId}>
              <KindPanel
                kind={k}
                defaults={defaults}
                initial={initial && { list: initial.lists[k.id], settings: initial.settings, contacts: initial.contacts }}
                onDefaultsChanged={loadDefaults}
              />
            </div>
          ))
        : !error && <p className="text-label text-muted-foreground">Loading…</p>}
    </div>
  )
}
