"use client"

// "Use again" for any sent email or template (lib/sentEmails.ts): send it to
// new people as a new campaign, edit it in the AI writer first, or send it to
// one person as a personal email. An AI-written email keeps its painted
// picture and stickers, so nothing is painted again. When the email still
// names the person it was written for ("Hi Priya"), it says so and asks to
// edit it first, or to confirm.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PenLine, Send, Users } from "lucide-react"
import { AdminButton, AdminInput, Modal } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { AudiencePicker, EMPTY_AUDIENCE, audienceRequest, type Audience } from "./AudiencePicker"
import { SendingPicker } from "./SendingPicker"
import { DEFAULT_SENDING_CHOICE, type SendingChoice } from "@/lib/sendingRules"
import { isLeadAudience } from "@/lib/leadRules"

type Content = { subject: string; body: string; design: unknown; mentionsName: string | null }
type Person = { id: string; email: string; name: string | null }
type Choice = "people" | "edit" | "person"

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Something went wrong")
  return data as T
}

export function UseAgainDialog({ source, subject, onClose }: { source: string; subject: string; onClose: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const [content, setContent] = useState<Content | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<Choice>("people")
  const [audience, setAudience] = useState<Audience>(EMPTY_AUDIENCE)
  const [sendingChoice, setSendingChoice] = useState<SendingChoice>(DEFAULT_SENDING_CHOICE)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [anyway, setAnyway] = useState(false)
  const [query, setQuery] = useState("")
  const [people, setPeople] = useState<Person[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/sent-emails/content?source=${encodeURIComponent(source)}`)
      .then((res) => json<Content>(res))
      .then((c) => !cancelled && setContent(c))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load that email"))
    return () => {
      cancelled = true
    }
  }, [source])

  // Search people as you type (at least two characters).
  useEffect(() => {
    if (choice !== "person" || query.trim().length < 2) return
    const timer = setTimeout(() => {
      fetch(`/api/admin/users?email=${encodeURIComponent(query.trim())}`)
        .then((res) => json<{ users: Person[] }>(res))
        .then((d) => setPeople(d.users))
        .catch(() => setPeople([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [choice, query])

  const designed = !!content?.design
  const blockedByName = !!content?.mentionsName && !anyway
  const request = audienceRequest(audience)
  const emailFields = content ? (designed ? { design: content.design } : { subject: content.subject, body: content.body }) : null

  function changeAudience(next: Audience) {
    setAudience(next)
    setCount(null)
  }

  async function checkCount() {
    if (!request || !emailFields) return
    setBusy(true)
    try {
      const data = await json<{ count: number }>(
        await fetch("/api/admin/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...emailFields, ...request, sending: sendingChoice, dryRun: true }),
        }),
      )
      setCount(data.count)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't count them", "error")
    } finally {
      setBusy(false)
    }
  }

  async function createCampaign() {
    if (!request || !emailFields) return
    setBusy(true)
    try {
      const data = await json<{ id: string }>(
        await fetch("/api/admin/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...emailFields, ...request, sending: sendingChoice }),
        }),
      )
      toast("Campaign made. Nothing is sent yet: pick who gets it, a batch at a time.", "success")
      router.push(`/admin/broadcasts/campaigns/${data.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't make the campaign", "error")
      setBusy(false)
    }
  }

  const choices: { key: Choice; label: string; icon: typeof Send; disabled?: string }[] = [
    { key: "people", label: "Send to new people", icon: Users },
    { key: "edit", label: "Edit first", icon: PenLine, disabled: designed ? undefined : "Written without the AI writer" },
    { key: "person", label: "Send to one person", icon: Send, disabled: designed ? undefined : "Written without the AI writer" },
  ]

  return (
    <Modal open onClose={onClose} title="Use this email again" wide>
      <div className="flex flex-col gap-4">
        <p className="truncate text-label font-semibold text-foreground">{subject}</p>
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : !content ? (
          <p className="text-caption text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div role="radiogroup" aria-label="How to use it" className="grid gap-2 sm:grid-cols-3">
              {choices.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={choice === c.key}
                  disabled={!!c.disabled}
                  title={c.disabled}
                  onClick={() => setChoice(c.key)}
                  className="flex items-center gap-2 rounded-control-sm border border-border px-3 py-2.5 text-left text-label font-medium text-foreground transition-colors aria-checked:border-brand aria-checked:bg-brand-soft disabled:opacity-50"
                >
                  <c.icon className="size-4 shrink-0 text-brand" aria-hidden />
                  {c.label}
                </button>
              ))}
            </div>

            {content.mentionsName && (
              <div role="alert" className="flex flex-col gap-2 rounded-control-sm border border-warning/40 bg-warning/10 px-3 py-2.5 text-caption text-foreground">
                <span>
                  This email says <span className="font-semibold">“{content.mentionsName}”</span> by name, so everyone would be
                  greeted as {content.mentionsName}. Edit it first, or send it as it is.
                </span>
                {choice !== "edit" && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} />
                    Send it as it is anyway
                  </label>
                )}
              </div>
            )}

            {choice === "people" && (
              <div className="flex flex-col gap-3">
                <AudiencePicker id="use-again-audience" value={audience} onChange={changeAudience} />
                <SendingPicker idPrefix="use-again-sending" value={sendingChoice} onChange={setSendingChoice} forLeads={isLeadAudience(audience.audience)} />
                <p className="text-caption text-muted-foreground">
                  It becomes a new campaign with {designed ? "the same picture and stickers (nothing painted again)" : "the same words"}.
                  Nothing is sent until you pick who gets it.
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {count !== null && (
                    <span className="mr-auto text-caption text-foreground">
                      {count === 0 ? "No one matches that." : `${count.toLocaleString("en-US")} ${count === 1 ? "person" : "people"}`}
                    </span>
                  )}
                  {count === null || count === 0 ? (
                    <AdminButton onClick={() => void checkCount()} loading={busy} disabled={!request || blockedByName}>
                      Check who it reaches
                    </AdminButton>
                  ) : (
                    <AdminButton onClick={() => void createCampaign()} loading={busy} disabled={blockedByName}>
                      Make campaign for {count.toLocaleString("en-US")}
                    </AdminButton>
                  )}
                </div>
              </div>
            )}

            {choice === "edit" && (
              <div className="flex flex-col gap-3">
                <p className="text-caption text-muted-foreground">
                  Opens it in the AI writer, picture and stickers included. Change the words or ask the writer for changes,
                  then make a campaign or send it.
                </p>
                <div className="flex justify-end">
                  <AdminButton onClick={() => router.push(`/admin/broadcasts/writer?reuse=${encodeURIComponent(source)}`)}>
                    <PenLine aria-hidden />
                    Open in the writer
                  </AdminButton>
                </div>
              </div>
            )}

            {choice === "person" && (
              <div className="flex flex-col gap-3">
                <AdminInput
                  aria-label="Find a person by email"
                  placeholder="Their email, e.g. priya@"
                  value={query}
                  autoFocus
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (e.target.value.trim().length < 2) setPeople(null)
                  }}
                />
                {people && people.length === 0 && <p className="text-caption text-muted-foreground">No one found.</p>}
                {people && people.length > 0 && (
                  <ul className="flex max-h-60 flex-col divide-y divide-border overflow-y-auto rounded-control-sm border border-border">
                    {people.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={blockedByName}
                          onClick={() => router.push(`/admin/users/${p.id}/email?reuse=${encodeURIComponent(source)}`)}
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-surface-muted disabled:opacity-50"
                        >
                          <span className="text-label text-foreground">{p.name ?? p.email}</span>
                          {p.name && <span className="text-caption text-muted-foreground">{p.email}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-caption text-muted-foreground">
                  Opens it on their page, ready to check and send to them. Their name is filled in.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
