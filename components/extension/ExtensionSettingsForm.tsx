"use client"

// Extension → Settings: the account-level settings the side panel's
// Settings screen edits, through the same route (app/api/ext/settings).
// Each change saves on its own, as in the panel.
import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import {
  errorMessage,
  extApi,
  LANGUAGES,
  type CommentProfile,
  type ConnectionProfile,
  type ExtSettings,
  type MessageProfile,
} from "./api"

type Option = { id: string; name: string }

const selectClass =
  "w-full rounded-xl border border-[#E5E3DE] bg-white px-3.5 py-2.5 text-[13px] text-[#0A0A0A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 disabled:opacity-60"

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-2 md:gap-6 py-4 border-b border-[#F0EEE8] last:border-0">
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-semibold text-[#0A0A0A]">{label}</p>
        {hint && <p className="text-[12px] text-[#9CA3AF] leading-[1.5]">{hint}</p>}
      </div>
      <div className="max-w-md">{children}</div>
    </div>
  )
}

function ProfileSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string | null
  options: Option[]
  disabled: boolean
  onChange: (id: string | null) => void
}) {
  return (
    <select
      className={selectClass}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Built-in default</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

export function ExtensionSettingsForm() {
  const [settings, setSettings] = useState<ExtSettings | null>(null)
  const [comment, setComment] = useState<Option[]>([])
  const [connection, setConnection] = useState<Option[]>([])
  const [message, setMessage] = useState<Option[]>([])
  const [saving, setSaving] = useState<keyof ExtSettings | null>(null)
  const [saved, setSaved] = useState<keyof ExtSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      extApi<ExtSettings>("/api/ext/settings"),
      extApi<{ profiles: CommentProfile[] }>("/api/ext/profiles"),
      extApi<{ profiles: ConnectionProfile[] }>("/api/ext/connection-profiles"),
      extApi<{ profiles: MessageProfile[] }>("/api/ext/message-profiles"),
    ])
      .then(([s, c, n, m]) => {
        setSettings(s)
        setComment(c.profiles)
        setConnection(n.profiles)
        setMessage(m.profiles)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function save<K extends keyof ExtSettings>(key: K, value: ExtSettings[K]) {
    if (!settings) return
    const previous = settings
    setSettings({ ...settings, [key]: value })
    setSaving(key)
    setSaved(null)
    setError(null)
    try {
      const updated = await extApi<ExtSettings>("/api/ext/settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      })
      setSettings(updated)
      setSaved(key)
      setTimeout(() => setSaved((k) => (k === key ? null : k)), 1500)
    } catch (err) {
      setSettings(previous)
      setError(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  const status = (key: keyof ExtSettings) =>
    saving === key ? (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-[#9CA3AF]">
        <Loader2 size={11} className="animate-spin" /> Saving
      </span>
    ) : saved === key ? (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-[#15803D]">
        <Check size={11} /> Saved
      </span>
    ) : null

  if (!settings) {
    return error ? (
      <p className="text-[13px] text-[#DC2626]">{error}</p>
    ) : (
      <p className="text-[13px] text-[#9CA3AF]">Loading settings…</p>
    )
  }

  const busy = saving !== null

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-[13px] text-[#DC2626]">{error}</p>}

      <div className="rounded-2xl border border-[#E5E3DE] bg-white px-5">
        <Row label="Default language" hint="What the extension writes in unless a voice profile says otherwise.">
          <div className="flex items-center gap-3">
            <select
              className={selectClass}
              value={settings.defaultLanguage ?? ""}
              disabled={busy}
              onChange={(e) => save("defaultLanguage", e.target.value || null)}
            >
              <option value="">Not set</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {status("defaultLanguage")}
          </div>
        </Row>

        <Row label="Default comment voice" hint="Picked first when you click Comment or Reply on LinkedIn.">
          <div className="flex items-center gap-3">
            <ProfileSelect
              value={settings.defaultCommentProfileId}
              options={comment}
              disabled={busy}
              onChange={(id) => save("defaultCommentProfileId", id)}
            />
            {status("defaultCommentProfileId")}
          </div>
        </Row>

        <Row label="Default connection note voice" hint="Picked first when you click Connect on someone's profile.">
          <div className="flex items-center gap-3">
            <ProfileSelect
              value={settings.defaultConnectionProfileId}
              options={connection}
              disabled={busy}
              onChange={(id) => save("defaultConnectionProfileId", id)}
            />
            {status("defaultConnectionProfileId")}
          </div>
        </Row>

        <Row label="Default conversation voice" hint="Picked first in the Conversation Assistant.">
          <div className="flex items-center gap-3">
            <ProfileSelect
              value={settings.defaultMessageProfileId}
              options={message}
              disabled={busy}
              onChange={(id) => save("defaultMessageProfileId", id)}
            />
            {status("defaultMessageProfileId")}
          </div>
        </Row>

        <Row
          label="Insert button"
          hint="Whether the extension shows Insert, which types the text straight into LinkedIn. Copy always stays."
        >
          <label className="flex items-center gap-3 text-[13px] text-[#374151]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#7C3AED]"
              checked={settings.insertButtonHidden !== true}
              disabled={busy}
              onChange={(e) => save("insertButtonHidden", !e.target.checked)}
            />
            Show the Insert button
            {status("insertButtonHidden")}
          </label>
        </Row>

        <Row
          label="Insert warning"
          hint="A reminder, before the first Insert, that you're responsible for what gets posted from your account."
        >
          <label className="flex items-center gap-3 text-[13px] text-[#374151]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#7C3AED]"
              checked={!settings.insertWarningHidden}
              disabled={busy}
              onChange={(e) => save("insertWarningHidden", !e.target.checked)}
            />
            Show the warning before inserting
            {status("insertWarningHidden")}
          </label>
        </Row>
      </div>

      <p className="text-[12px] text-[#9CA3AF]">
        Connection note context, note length and each conversation&apos;s reason are under{" "}
        <a href="/extension/profiles" className="font-medium text-[#7C3AED] hover:underline">
          Custom tones
        </a>
        .
      </p>
    </div>
  )
}
