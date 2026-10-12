"use client"

// CarouseLabs Engage for X's pages on the website (app/(app)/extension/x/*):
// its reply profiles and its settings, through the same routes as the X side
// panel (app/api/ext/x/*), so a change here shows up there and the other way
// round. Its history is HistoryList platform="x". The reasons behind X chats
// are shared with LinkedIn's conversations (Custom tones → Conversations).
import { useCallback, useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { X_MAX_LENGTH, X_PREMIUM_REPLY_LENGTH } from "@/lib/xText"
import { KindPanel, xKind } from "./ProfilesManager"
import { Row, selectClass } from "./ExtensionSettingsForm"
import { errorMessage, extApi, type CommentProfile, type XSettings } from "./api"

// X's settings, which the reply profiles need too (X Premium sets how long a
// reply may be).
function useXSettings() {
  const [settings, setSettings] = useState<XSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    extApi<XSettings>("/api/ext/x/settings")
      .then(setSettings)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { settings, setSettings, error, load }
}

function XSettingsForm({ settings, onSaved }: { settings: XSettings; onSaved: (next: XSettings) => void }) {
  const [profiles, setProfiles] = useState<(CommentProfile & { isDefault?: boolean })[]>([])
  const [saving, setSaving] = useState<keyof XSettings | null>(null)
  const [saved, setSaved] = useState<keyof XSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    extApi<{ profiles: (CommentProfile & { isDefault?: boolean })[] }>("/api/ext/x/profiles")
      .then((res) => !cancelled && setProfiles(res.profiles))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [])

  async function save<K extends keyof XSettings>(key: K, value: XSettings[K]) {
    setSaving(key)
    setSaved(null)
    setError(null)
    try {
      const updated = await extApi<XSettings>("/api/ext/x/settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      })
      onSaved(updated)
      setSaved(key)
      setTimeout(() => setSaved((k) => (k === key ? null : k)), 1500)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  const status = (key: keyof XSettings) =>
    saving === key ? (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-[#9CA3AF]">
        <Loader2 size={11} className="animate-spin" /> Saving
      </span>
    ) : saved === key ? (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-[#15803D]">
        <Check size={11} /> Saved
      </span>
    ) : null

  const busy = saving !== null
  const premium = settings.maxReplyLength > X_MAX_LENGTH
  // With nothing chosen, the panel preselects CarouseLabs' default preset.
  const builtInDefault = profiles.find((p) => p.isSystem && p.isDefault) ?? profiles[0]

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-[13px] text-[#DC2626]">{error}</p>}

      <div className="rounded-2xl border border-[#E5E3DE] bg-white px-5">
        <Row
          label="X Premium"
          hint={`X allows ${X_MAX_LENGTH} characters per reply. Premium accounts can post longer ones.`}
        >
          <label className="flex items-center gap-3 text-[13px] text-[#374151]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#7C3AED]"
              checked={premium}
              disabled={busy}
              onChange={(e) => save("maxReplyLength", e.target.checked ? X_PREMIUM_REPLY_LENGTH : X_MAX_LENGTH)}
            />
            I have X Premium (replies up to {X_PREMIUM_REPLY_LENGTH.toLocaleString("en-US")} characters)
            {status("maxReplyLength")}
          </label>
        </Row>

        <Row label="Default X profile" hint="Picked first when you click Reply on a post on X.">
          <div className="flex items-center gap-3">
            <select
              className={selectClass}
              value={settings.defaultProfileId ?? builtInDefault?.id ?? ""}
              disabled={busy || profiles.length === 0}
              onChange={(e) => save("defaultProfileId", e.target.value || null)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isSystem ? " (built-in)" : ""}
                </option>
              ))}
            </select>
            {status("defaultProfileId")}
          </div>
        </Row>

        <Row
          label="Insert button"
          hint="Whether the X extension shows Insert, which types the text into X's reply box. Copy always stays."
        >
          <label className="flex items-center gap-3 text-[13px] text-[#374151]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#7C3AED]"
              checked={!settings.insertButtonHidden}
              disabled={busy}
              onChange={(e) => save("insertButtonHidden", !e.target.checked)}
            />
            Show the Insert button
            {status("insertButtonHidden")}
          </label>
        </Row>
      </div>
    </div>
  )
}

// Extension → Engage for X → Reply profiles.
export function XReplyProfiles() {
  const { settings, error, load } = useXSettings()

  if (error) return <p className="text-[13px] text-[#DC2626]">{error}</p>
  if (!settings) return <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
  return (
    <div className="flex flex-col gap-6">
      <KindPanel kind={xKind(settings.maxReplyLength)} me={null} onDefaultsChanged={load} />
      <p className="text-[12px] text-[#9CA3AF]">
        The reasons behind your X chats are shared with LinkedIn: edit them under{" "}
        <a href="/extension/profiles" className="font-medium text-[#7C3AED] hover:underline">
          Custom tones → Conversations
        </a>
        .
      </p>
    </div>
  )
}

// Extension → Engage for X → Settings.
export function XSettingsPanel() {
  const { settings, setSettings, error } = useXSettings()

  if (error) return <p className="text-[13px] text-[#DC2626]">{error}</p>
  if (!settings) return <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
  return <XSettingsForm settings={settings} onSaved={setSettings} />
}
