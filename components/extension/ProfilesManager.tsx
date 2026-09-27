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
import { useCallback, useEffect, useState } from "react"
import { Copy, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { NoteSettingsCard } from "./NoteSettingsCard"
import { ConversationSettingsCard } from "./ConversationSettingsCard"
import {
  errorMessage,
  extApi,
  LANGUAGES,
  type ExtMe,
  type ExtSettings,
} from "./api"

// ── The three kinds ─────────────────────────────────────────────────────────

type FieldDef =
  | { key: string; label: string; type: "text"; required?: boolean; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "select"; required?: boolean; options: string[]; hint?: string }
  | { key: string; label: string; type: "range"; required?: boolean; min: number; max: number; hint?: string }

interface KindDef {
  id: "comment" | "connection" | "message"
  label: string
  endpoint: string
  defaultKey: keyof Pick<ExtSettings, "defaultCommentProfileId" | "defaultConnectionProfileId" | "defaultMessageProfileId">
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

const KINDS: KindDef[] = [
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
  "w-full rounded-xl border border-[#E5E3DE] bg-white px-3.5 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15"

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12.5px] font-semibold text-[#0A0A0A]">
        {label}
        {required && <span className="text-[#DC2626]"> *</span>}
      </span>
      {hint && <span className="text-[11.5px] leading-[1.5] text-[#9CA3AF]">{hint}</span>}
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
      <span className="text-[12.5px] text-[#9CA3AF]">to</span>
      <input
        type="number"
        className={`${inputClass} w-28`}
        min={bounds.min}
        max={bounds.max}
        value={maxText}
        onChange={(e) => update(minText, e.target.value)}
        aria-label="Maximum characters"
      />
      <span className="text-[12.5px] text-[#9CA3AF]">characters</span>
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
    <div className="flex flex-col gap-5 rounded-2xl border border-[#E5E3DE] bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold text-[#0A0A0A]">
          {existingId ? "Edit profile" : "New profile"} · {kind.label}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#F4F2EC] hover:text-[#0A0A0A]"
        >
          <X size={16} />
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
              className="mt-2 rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#F4F2EC] hover:text-[#DC2626]"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {samples.length < MAX_SAMPLES && (
          <button
            type="button"
            onClick={() => set("samples", [...samples, ""])}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-[#D1CFC8] px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0A]"
          >
            <Plus size={13} /> Add sample
          </button>
        )}
      </div>

      <label className="flex items-center gap-2.5 text-[13px] text-[#374151]">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#7C3AED]"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
        />
        Make this my default
      </label>

      {(error || rangeProblem) && (
        <div className="rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/5 px-4 py-3 text-[12.5px] text-[#DC2626]">
          {error || rangeProblem}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving || missing.length > 0 || !!rangeProblem}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {existingId ? "Save changes" : "Create profile"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0A]"
        >
          Cancel
        </button>
        {missing.length > 0 && (
          <span className="text-[12px] text-[#9CA3AF]">Fill in {missing.map((f) => f.label).join(", ")}.</span>
        )}
      </div>
    </div>
  )
}

// ── Lists ───────────────────────────────────────────────────────────────────

function ProfileCard({
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
  const description = kind.description(profile)
  const iconButton =
    "inline-flex items-center gap-1.5 rounded-lg border border-[#E5E3DE] px-2.5 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#F9F7F2]"

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E3DE] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[14px] font-semibold text-[#0A0A0A]">{profile.name}</p>
        {profile.isRecommended && (
          <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10.5px] font-semibold text-[#B45309]">
            Recommended
          </span>
        )}
        {isDefault && (
          <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-[10.5px] font-semibold text-[#7C3AED]">
            Default
          </span>
        )}
      </div>
      <p className="text-[12px] text-[#9CA3AF]">{kind.summary(profile)}</p>
      {description && <p className="line-clamp-2 text-[12.5px] leading-[1.55] text-[#6B7280]">{description}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {onEdit && (
          <button type="button" onClick={onEdit} className={iconButton}>
            <Pencil size={12} /> Edit
          </button>
        )}
        {!isDefault && (
          <button type="button" onClick={onMakeDefault} className={iconButton}>
            <Star size={12} /> Make default
          </button>
        )}
        <button type="button" onClick={onDuplicate} className={iconButton}>
          <Copy size={12} /> {profile.isSystem ? "Customise" : "Duplicate"}
        </button>
        {onDelete &&
          (confirming ? (
            <>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await onDelete()
                  setDeleting(false)
                  setConfirming(false)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC2626] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {deleting && <Loader2 size={12} className="animate-spin" />}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-1.5 text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0A]"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Delete profile"
              onClick={() => setConfirming(true)}
              className="ml-auto inline-flex items-center rounded-lg border border-[#E5E3DE] p-1.5 text-[#9CA3AF] hover:border-[#DC2626]/40 hover:text-[#DC2626]"
            >
              <Trash2 size={13} />
            </button>
          ))}
      </div>
    </div>
  )
}

type Editing = { initial: Draft; existingId: string | null } | null

function KindPanel({ kind, me, onDefaultsChanged }: { kind: KindDef; me: ExtMe; onDefaultsChanged: () => void }) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [error, setError] = useState<string | null>(null)

  // Refetch after a save or delete.
  const load = useCallback(async () => {
    try {
      const res = await extApi<{ profiles: Profile[] }>(kind.endpoint)
      setProfiles(res.profiles)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [kind.endpoint])

  useEffect(() => {
    let cancelled = false
    extApi<{ profiles: Profile[] }>(kind.endpoint)
      .then((res) => !cancelled && setProfiles(res.profiles))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [kind.endpoint])

  const custom = profiles?.filter((p) => !p.isSystem) ?? []
  const builtIn = profiles?.filter((p) => p.isSystem) ?? []

  // The account's explicit default, else the shared built-in default.
  const explicitDefault = me[kind.defaultKey]
  const defaultId =
    (explicitDefault && profiles?.some((p) => p.id === explicitDefault) ? explicitDefault : null) ??
    builtIn.find((p) => p.isDefault)?.id ??
    null

  async function makeDefault(id: string) {
    setError(null)
    try {
      await extApi("/api/ext/settings", { method: "PATCH", body: JSON.stringify({ [kind.defaultKey]: id }) })
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
  }

  if (editing) {
    return (
      <ProfileForm
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
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] text-[#6B7280]">{kind.intro}</p>
      {kind.id === "connection" && <NoteSettingsCard />}
      {kind.id === "message" && profiles && (
        <ConversationSettingsCard profiles={profiles.map((p) => ({ id: p.id, name: p.name }))} />
      )}
      {error && (
        <div className="rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/5 px-4 py-3 text-[12.5px] text-[#DC2626]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-[#0A0A0A]">
            Your profiles{" "}
            <span className="font-normal text-[#9CA3AF]">({custom.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => startNew(null)}
            disabled={!profiles}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            <Plus size={14} /> New profile
          </button>
        </div>
        {!profiles ? (
          <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
        ) : custom.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E3DE] p-6 text-center text-[13px] text-[#6B7280]">
            No custom profiles yet. Create one, or customise a built-in one below.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {custom.map((p) => (
              <ProfileCard
                key={p.id}
                kind={kind}
                profile={p}
                isDefault={p.id === defaultId}
                onEdit={() => setEditing({ initial: draftFrom(kind, p), existingId: p.id })}
                onDuplicate={() => startNew(p)}
                onMakeDefault={() => makeDefault(p.id)}
                onDelete={() => remove(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {builtIn.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[14px] font-semibold text-[#0A0A0A]">Built-in</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {builtIn.map((p) => (
              <ProfileCard
                key={p.id}
                kind={kind}
                profile={p}
                isDefault={p.id === defaultId}
                onDuplicate={() => startNew(p)}
                onMakeDefault={() => makeDefault(p.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProfilesManager() {
  const [kindId, setKindId] = useState<KindDef["id"]>("comment")
  const [me, setMe] = useState<ExtMe | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadMe = useCallback(() => {
    extApi<ExtMe>("/api/ext/me")
      .then(setMe)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  const kind = KINDS.find((k) => k.id === kindId) ?? KINDS[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKindId(k.id)}
            className={[
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              kindId === k.id
                ? "bg-[#1A1A1A] text-white"
                : "border border-[#E5E3DE] bg-white text-[#6B7280] hover:text-[#0A0A0A]",
            ].join(" ")}
          >
            {k.label}
          </button>
        ))}
      </div>

      {error && <p className="text-[13px] text-[#DC2626]">{error}</p>}
      {me ? (
        <KindPanel key={kind.id} kind={kind} me={me} onDefaultsChanged={loadMe} />
      ) : (
        !error && <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
      )}
    </div>
  )
}
