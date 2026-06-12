"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Check } from "lucide-react"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import { SavedToast } from "@/components/settings/SavedToast"
import {
  TONES,
  toneLabel,
  MAX_VOICE_PRESETS,
  type ProfileData,
  type VoicePreset,
} from "@/lib/profile/options"

function makeId() {
  return `vp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export default function VoicePresetsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [presets, setPresets] = useState<VoicePreset[]>([])

  // Editor state — non-null when adding or editing.
  const [editing, setEditing] = useState<VoicePreset | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/profile")
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load")
        if (active) setPresets((data.profile as ProfileData).voicePresets ?? [])
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

  // Persist the full list, with optimistic update + revert on failure.
  async function persist(next: VoicePreset[]) {
    const snapshot = presets
    setPresets(next)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voicePresets: next }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
    } catch {
      setPresets(snapshot)
      setError("Failed to save preset")
    }
  }

  function startAdd() {
    setEditing({ id: makeId(), name: "", tones: [] })
  }
  function startEdit(preset: VoicePreset) {
    setEditing({ ...preset })
  }
  function deletePreset(id: string) {
    persist(presets.filter((p) => p.id !== id))
  }
  function saveEditing() {
    if (!editing || !editing.name.trim() || editing.tones.length === 0) return
    const exists = presets.some((p) => p.id === editing.id)
    const next = exists
      ? presets.map((p) => (p.id === editing.id ? editing : p))
      : [...presets, editing]
    persist(next)
    setEditing(null)
  }

  const atMax = presets.length >= MAX_VOICE_PRESETS

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold text-[rgba(255,255,255,0.85)]">Voice Presets</h2>
        <p className="text-[12.5px] text-[rgba(255,255,255,0.4)]">
          Save named tone combinations to reuse. Up to {MAX_VOICE_PRESETS}.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[64px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Preset list */}
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <p className="text-[14px] font-semibold text-[rgba(255,255,255,0.88)] truncate">
                  {preset.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preset.tones.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.22)] text-[#A78BFA] text-[10.5px] font-medium"
                    >
                      {toneLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => startEdit(preset)}
                  className="p-2 rounded-lg text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  aria-label="Edit preset"
                >
                  <Pencil size={14} strokeWidth={2} />
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="p-2 rounded-lg text-[rgba(255,255,255,0.4)] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                  aria-label="Delete preset"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {presets.length === 0 && !editing && (
            <p className="text-[13px] text-[rgba(255,255,255,0.35)] py-2">
              No presets yet. Add one to reuse your favorite tone combinations.
            </p>
          )}

          {/* Inline editor (add / edit) */}
          {editing && (
            <div className="flex flex-col gap-4 p-4 rounded-xl border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.04)]">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Preset name — e.g. Founder Story Mode"
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#F0F0FA] placeholder-[rgba(255,255,255,0.25)] text-[13px] focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-wide">
                  Tones
                </p>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((tone) => {
                    const selected = editing.tones.includes(tone.id)
                    return (
                      <button
                        key={tone.id}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            tones: selected
                              ? editing.tones.filter((t) => t !== tone.id)
                              : [...editing.tones, tone.id],
                          })
                        }
                        className={[
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] transition-colors",
                          selected
                            ? "border-[#7C3AED] bg-[rgba(124,58,237,0.14)] text-[#A78BFA]"
                            : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)] hover:text-[rgba(255,255,255,0.8)]",
                        ].join(" ")}
                      >
                        {selected && <Check size={11} strokeWidth={2.5} />}
                        {tone.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEditing}
                  disabled={!editing.name.trim() || editing.tones.length === 0}
                  className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-[12px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save preset
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!editing && (
            <button
              onClick={startAdd}
              disabled={atMax}
              className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.14)] text-[13px] font-medium text-[#A78BFA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} strokeWidth={2.2} />
              {atMax ? `Max ${MAX_VOICE_PRESETS} presets` : "Add preset"}
            </button>
          )}
        </div>
      )}

      <SavedToast open={saved} onClose={() => setSaved(false)} message="Presets saved" />
    </div>
  )
}
