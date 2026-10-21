"use client"

// Custom tones → Connection notes: the note settings the side panel keeps
// for every note (not per profile) — what the note says about you, your own
// LinkedIn profile details, and how long notes are. Same values as the
// panel's "Your context" chooser and length picker (/api/ext/settings).
import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { errorMessage, extApi, type ExtSettings, type LinkedinProfile } from "./api"

type ContextChoice = "profile" | "custom" | "none"
type LengthPreset = "short" | "medium" | "custom"

// Mirror NOTE_MIN / NOTE_MAX / NOTE_LENGTH_PRESETS in lib/extensionPreferences.ts.
const NOTE_MIN = 40
const NOTE_MAX = 280
const PRESETS = { short: { min: 80, max: 150 }, medium: { min: 150, max: NOTE_MAX } }

// The panel's wording (browser-extension-comment ConnectContextEditor).
const CONTEXT_OPTIONS: { choice: ContextChoice; title: string; hint: string }[] = [
  { choice: "profile", title: "Use my LinkedIn profile", hint: "Your name, headline and role, from your own profile." },
  { choice: "custom", title: "Write my own purpose", hint: "A line about why you connect, e.g. \"I help SaaS founders with pricing\"." },
  { choice: "none", title: "Skip — just use their profile", hint: "The note is based only on the person you're connecting with." },
]

const LENGTH_OPTIONS: { preset: LengthPreset; label: string }[] = [
  { preset: "short", label: `Short (${PRESETS.short.min}–${PRESETS.short.max})` },
  { preset: "medium", label: `Medium (${PRESETS.medium.min}–${PRESETS.medium.max})` },
  { preset: "custom", label: "Custom" },
]

const EMPTY_PROFILE: LinkedinProfile = { name: "", headline: "", currentRole: "", about: "", url: "", capturedAt: 0 }

const inputClass =
  "w-full rounded-control border border-border bg-surface-raised px-3.5 py-2.5 text-label text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"

const optionClass = (active: boolean) =>
  `flex cursor-pointer items-start gap-2.5 rounded-control border p-3 text-label ${
    active ? "border-brand bg-brand-soft" : "border-border bg-surface-raised"
  }`

// The form's values from the saved settings; never set means the defaults.
function formFrom(s: ExtSettings | undefined) {
  return {
    choice: s?.connectNoteContext?.choice ?? ("none" as ContextChoice),
    purpose: s?.connectNoteContext?.purpose ?? "",
    profile: s?.linkedinProfile ?? EMPTY_PROFILE,
    preset: s?.connectNoteLength?.preset ?? ("medium" as LengthPreset),
    minText: String(s?.connectNoteLength?.min ?? PRESETS.medium.min),
    maxText: String(s?.connectNoteLength?.max ?? PRESETS.medium.max),
  }
}

// `initial`: the settings, when the page loaded them on the server; without
// them the card fetches its own.
export function NoteSettingsCard({ initial }: { initial?: ExtSettings }) {
  const start = formFrom(initial)
  const [loaded, setLoaded] = useState(!!initial)
  const [choice, setChoice] = useState<ContextChoice>(start.choice)
  const [purpose, setPurpose] = useState(start.purpose)
  const [profile, setProfile] = useState<LinkedinProfile>(start.profile)
  const [profileEdited, setProfileEdited] = useState(false)
  const [preset, setPreset] = useState<LengthPreset>(start.preset)
  const [minText, setMinText] = useState(start.minText)
  const [maxText, setMaxText] = useState(start.maxText)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadedOnServer = !!initial
  useEffect(() => {
    if (loadedOnServer) return
    extApi<ExtSettings>("/api/ext/settings")
      .then((s) => {
        const form = formFrom(s)
        setChoice(form.choice)
        setPurpose(form.purpose)
        setProfile(form.profile)
        setPreset(form.preset)
        setMinText(form.minText)
        setMaxText(form.maxText)
        setLoaded(true)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [loadedOnServer])

  const min = Number(minText)
  const max = Number(maxText)
  const lengthProblem =
    preset === "custom" && (!(min >= NOTE_MIN) || !(max <= NOTE_MAX) || min > max)
      ? `Length must be between ${NOTE_MIN} and ${NOTE_MAX} characters, minimum first.`
      : null
  const purposeProblem = choice === "custom" && !purpose.trim() ? "Write your purpose, or pick another option." : null
  const profileProblem =
    choice === "profile" && !profile.name.trim() ? "Add at least your name, or pick another option." : null
  const problem = lengthProblem || purposeProblem || profileProblem

  function choosePreset(next: LengthPreset) {
    setPreset(next)
    if (next !== "custom") {
      setMinText(String(PRESETS[next].min))
      setMaxText(String(PRESETS[next].max))
    }
  }

  function editProfile(key: keyof LinkedinProfile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }))
    setProfileEdited(true)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await extApi("/api/ext/settings", {
        method: "PATCH",
        body: JSON.stringify({
          connectNoteContext: { choice, purpose: purpose.trim() },
          connectNoteLength: { preset, min, max },
          // A website edit is stamped now, so it wins over the extension's
          // older copy (the newer of the two is used).
          ...(profileEdited ? { linkedinProfile: { ...profile, capturedAt: Date.now() } } : {}),
        }),
      })
      setProfileEdited(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-card border border-border bg-surface-raised p-5 text-label text-muted-foreground">
        {error ?? "Loading note settings…"}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-card border border-border bg-surface-raised p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-label font-semibold text-foreground">Every connection note</h3>
        <p className="text-caption text-muted-foreground">
          What the note says about you, and how long it is. Applies whichever profile you pick below.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-foreground">Your context</p>
        {CONTEXT_OPTIONS.map((o) => (
          <label key={o.choice} className={optionClass(choice === o.choice)}>
            <input
              type="radio"
              name="note-context"
              className="mt-0.5 accent-[#7C3AED]"
              checked={choice === o.choice}
              onChange={() => setChoice(o.choice)}
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{o.title}</span>
              <span className="text-caption text-muted-foreground">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {choice === "custom" && (
        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-foreground">Your purpose</span>
          <textarea
            className={`${inputClass} resize-y`}
            rows={2}
            maxLength={400}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. I help SaaS founders fix their pricing, and connect with people building in B2B"
          />
        </label>
      )}

      {choice === "profile" && (
        <div className="flex flex-col gap-3 rounded-control border border-dashed border-border p-4">
          <p className="text-caption text-muted-foreground">
            The extension fills this in when you click <span className="font-medium">Read my profile</span> on your
            own LinkedIn page. You can correct it here.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Your name" value={profile.name} onChange={(e) => editProfile("name", e.target.value)} />
            <input className={inputClass} placeholder="Headline" value={profile.headline} onChange={(e) => editProfile("headline", e.target.value)} />
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Current role, e.g. Founder at CarouseLabs"
              value={profile.currentRole}
              onChange={(e) => editProfile("currentRole", e.target.value)}
            />
            <textarea
              className={`${inputClass} md:col-span-2 resize-y`}
              rows={3}
              placeholder="About (optional)"
              value={profile.about}
              onChange={(e) => editProfile("about", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-foreground">
          Note length <span className="font-normal text-muted-foreground">— LinkedIn allows 300; notes stay under {NOTE_MAX}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {LENGTH_OPTIONS.map((o) => (
            <button
              key={o.preset}
              type="button"
              onClick={() => choosePreset(o.preset)}
              className={[
                "rounded-full px-3.5 py-1.5 text-caption font-medium transition-colors",
                preset === o.preset
                  ? "bg-primary text-white"
                  : "border border-border bg-surface-raised text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {o.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              className={`${inputClass} w-28`}
              aria-label="Minimum characters"
              value={minText}
              onChange={(e) => setMinText(e.target.value)}
            />
            <span className="text-caption text-muted-foreground">to</span>
            <input
              type="number"
              className={`${inputClass} w-28`}
              aria-label="Maximum characters"
              value={maxText}
              onChange={(e) => setMaxText(e.target.value)}
            />
            <span className="text-caption text-muted-foreground">characters</span>
          </div>
        )}
      </div>

      {(problem || error) && (
        <p className="text-caption text-danger">{error ?? problem}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving || !!problem}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-control bg-brand px-5 py-2.5 text-label font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save note settings
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-caption text-success">
            <Check size={12} /> Saved — the extension uses this from its next note
          </span>
        )}
      </div>
    </div>
  )
}
