"use client"

// Custom tones → Conversations: the reason and tone the Conversation
// Assistant remembers for each person (model ContactContext), the same
// values the side panel shows when that chat is opened (/api/ext/contacts).
import { useEffect, useState } from "react"
import { Check, ExternalLink, Loader2, Trash2 } from "lucide-react"
import { errorMessage, extApi, shortDate, type ContactContext } from "./api"

type Choice = ContactContext["choice"]

// The panel's tone list (browser-extension-comment src/lib/messageThread.ts).
const MESSAGE_TONES = ["Natural", "Professional", "Casual, latest slang", "Simple, plain English", "Warm", "Direct"]

// The panel's wording for the three choices.
const CHOICES: { choice: Choice; label: string }[] = [
  { choice: "profile", label: "Saved reason" },
  { choice: "custom", label: "Write my own" },
  { choice: "flow", label: "Just continue" },
]

const inputClass =
  "w-full rounded-xl border border-[#E5E3DE] bg-white px-3.5 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15"

function ContactRow({
  contact,
  profiles,
  onSaved,
  onForgotten,
}: {
  contact: ContactContext
  profiles: { id: string; name: string }[]
  onSaved: (c: ContactContext) => void
  onForgotten: (id: string) => void
}) {
  const [choice, setChoice] = useState<Choice>(contact.choice)
  const [profileId, setProfileId] = useState(contact.profileId ?? profiles[0]?.id ?? "")
  const [purpose, setPurpose] = useState(contact.purpose)
  const [tone, setTone] = useState(contact.tone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changed =
    choice !== contact.choice ||
    (choice === "profile" && profileId !== (contact.profileId ?? "")) ||
    purpose !== contact.purpose ||
    tone !== contact.tone
  const problem =
    choice === "profile" && !profileId
      ? "Pick a saved reason."
      : choice === "custom" && !purpose.trim()
        ? "Write the reason for this conversation."
        : null

  function chooseKind(next: Choice) {
    setChoice(next)
    // "No override" only means something with a saved reason, which has its
    // own tone; the other two need an actual tone (the panel does the same).
    if (next !== "profile" && !tone) setTone(MESSAGE_TONES[0])
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await extApi<{ contact: ContactContext }>("/api/ext/contacts", {
        method: "PUT",
        body: JSON.stringify({
          contactUrl: contact.contactUrl,
          contactName: contact.contactName,
          choice,
          profileId: choice === "profile" ? profileId : null,
          purpose: purpose.trim(),
          tone,
        }),
      })
      onSaved(res.contact)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function forget() {
    setError(null)
    try {
      await extApi(`/api/ext/contacts/${contact.id}`, { method: "DELETE" })
      onForgotten(contact.id)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const toneOptions = tone && !MESSAGE_TONES.includes(tone) ? [tone, ...MESSAGE_TONES] : MESSAGE_TONES

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E9E7E1] bg-[#FBFAF6] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13.5px] font-semibold text-[#0A0A0A]">{contact.contactName || contact.contactUrl}</p>
        <a
          href={profileLink(contact.contactUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#7C3AED] hover:underline"
        >
          {contact.contactUrl.startsWith("/x/") ? "X profile" : "Profile"} <ExternalLink size={11} />
        </a>
        <span className="text-[11.5px] text-[#9CA3AF]">· updated {shortDate(contact.updatedAt)}</span>
        <div className="ml-auto">
          {confirming ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={forget}
                className="rounded-lg bg-[#DC2626] px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-[#B91C1C]"
              >
                Forget
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[11.5px] font-medium text-[#6B7280] hover:text-[#0A0A0A]"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Forget ${contact.contactName || contact.contactUrl}`}
              onClick={() => setConfirming(true)}
              className="inline-flex items-center rounded-lg border border-[#E5E3DE] bg-white p-1.5 text-[#9CA3AF] hover:border-[#DC2626]/40 hover:text-[#DC2626]"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.choice}
            type="button"
            onClick={() => chooseKind(c.choice)}
            className={[
              "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
              choice === c.choice
                ? "bg-[#1A1A1A] text-white"
                : "border border-[#E5E3DE] bg-white text-[#6B7280] hover:text-[#0A0A0A]",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
        {choice === "profile" && (
          <select
            className={inputClass}
            aria-label="Saved reason"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          >
            {!profiles.some((p) => p.id === profileId) && <option value={profileId}>{profileId ? "Deleted reason" : "Pick one"}</option>}
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {choice === "custom" && (
          <textarea
            className={`${inputClass} resize-y`}
            rows={2}
            maxLength={400}
            aria-label="Reason"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. A potential client — understand their situation before proposing anything"
          />
        )}
        {choice === "flow" && (
          <p className="self-center text-[12.5px] text-[#6B7280]">
            No stated reason — each message just continues the conversation naturally.
          </p>
        )}
        <select className={inputClass} aria-label="Tone" value={tone} onChange={(e) => setTone(e.target.value)}>
          {choice === "profile" && <option value="">The saved reason&apos;s own tone</option>}
          {toneOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {(problem || error) && changed && <p className="text-[12px] text-[#DC2626]">{error ?? problem}</p>}

      {changed && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving || !!problem}
            onClick={save}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Save
          </button>
        </div>
      )}
      {saved && !changed && (
        <span className="inline-flex items-center gap-1 text-[12px] text-[#15803D]">
          <Check size={12} /> Saved — used the next time you open this chat in the extension
        </span>
      )}
    </div>
  )
}

// A saved person's page: LinkedIn ("/in/<slug>"), or X ("/x/<handle>", from
// CarouseLabs Engage for X's chats).
function profileLink(contactUrl: string): string {
  return contactUrl.startsWith("/x/") ? `https://x.com/${contactUrl.slice(3)}` : `https://www.linkedin.com${contactUrl}`
}

export function ConversationSettingsCard({ profiles }: { profiles: { id: string; name: string }[] }) {
  const [contacts, setContacts] = useState<ContactContext[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    extApi<{ contacts: ContactContext[] }>("/api/ext/contacts")
      .then((res) => setContacts(res.contacts))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E5E3DE] bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold text-[#0A0A0A]">Your conversations</h3>
        <p className="text-[12.5px] text-[#6B7280]">
          The reason and tone the extension remembers for each person. Change one here and it&apos;s used the next
          time you open that chat.
        </p>
      </div>
      {error && <p className="text-[12.5px] text-[#DC2626]">{error}</p>}
      {!contacts && !error && <p className="text-[12.5px] text-[#9CA3AF]">Loading…</p>}
      {contacts?.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#E5E3DE] p-5 text-center text-[12.5px] text-[#6B7280]">
          None yet. Open a LinkedIn chat in the extension and pick a reason, and it shows up here.
        </div>
      )}
      {contacts?.map((c) => (
        <ContactRow
          key={c.id}
          contact={c}
          profiles={profiles}
          onSaved={(next) => setContacts((list) => list?.map((x) => (x.contactUrl === next.contactUrl ? next : x)) ?? null)}
          onForgotten={(id) => setContacts((list) => list?.filter((x) => x.id !== id) ?? null)}
        />
      ))}
    </div>
  )
}
