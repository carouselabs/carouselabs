"use client"

// /admin/broadcasts/sent — every email sent, to use again (lib/sentEmails.ts):
// templates (starred emails, plus plain ones saved in the Broadcast
// composer) on top, then campaigns and personal emails, newest first, each
// with whether it was seen and clicked. "Use again" sends one to new people,
// edits it in the writer, or sends it to one person (UseAgainDialog).
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Repeat, Search, Star } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, Modal, Spinner, fmtDate, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { percentOf } from "@/lib/campaignRules"
import { audienceLabel } from "./campaignLabels"
import { SeenStatus } from "./SeenStatus"
import { UseAgainDialog } from "./UseAgainDialog"

type Template = { id: string; name: string; subject: string; picture: string | null; designed: boolean; from: string | null; createdAt: string; createdBy: string }
type Campaign = {
  id: string
  subject: string
  audience: string
  audienceValue: string | null
  archived: boolean
  picture: string | null
  designed: boolean
  createdAt: string
  people: number
  sent: number
  seen: number
  clicked: number
  templateId: string | null
}
type Personal = {
  id: string
  subject: string | null
  to: { id: string; email: string; name: string | null } | null
  sentAt: string
  picture: string | null
  reusable: boolean
  openedAt: string | null
  openCount: number
  clickedAt: string | null
  clickCount: number
  lastClickedAt?: string | null
  scannedAt?: string | null
  scanReason?: string | null
  autoOpenedAt?: string | null
  templateId: string | null
}
type Library = { templates: Template[]; campaigns: Campaign[]; personal: Personal[] }

function Thumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- a thumbnail of R2 art
    <img src={src} alt="" className="h-10 w-16 shrink-0 rounded-detail object-cover" />
  ) : (
    <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-detail bg-surface-muted text-caption text-muted-foreground">Text</span>
  )
}

function NameDialog({ title, initial, onSave, onClose }: { title: string; initial: string; onSave: (name: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  return (
    <Modal open onClose={onClose} title={title}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          try {
            await onSave(name.trim())
          } finally {
            setBusy(false)
          }
        }}
      >
        <AdminInput aria-label="Template name" autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome back offer" />
        <div className="flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" loading={busy} disabled={!name.trim()}>
            Save
          </AdminButton>
        </div>
      </form>
    </Modal>
  )
}

export function SentEmailsLibrary() {
  const { toast } = useToast()
  const [library, setLibrary] = useState<Library | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [using, setUsing] = useState<{ source: string; subject: string } | null>(null)
  const [naming, setNaming] = useState<null | { kind: "star"; source: string; subject: string } | { kind: "rename"; id: string; name: string }>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sent-emails", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't load the sent emails")
      setLibrary(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the sent emails")
    }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
  useEffect(() => void load(), [load])

  async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Something went wrong")
  }

  async function unstar(templateId: string) {
    try {
      await send(`/api/admin/email-templates/${templateId}`, "DELETE")
      toast("Removed from templates", "success")
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't remove it", "error")
    }
  }

  if (error) {
    return (
      <AdminCard>
        <p className="text-label text-danger">{error}</p>
      </AdminCard>
    )
  }
  if (!library) return <Spinner label="Loading sent emails…" />

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (...texts: (string | null | undefined)[]) => words.every((w) => texts.some((t) => t?.toLowerCase().includes(w)))
  const templates = library.templates.filter((t) => matches(t.name, t.subject))
  const campaigns = library.campaigns.filter((c) => matches(c.subject))
  const personal = library.personal.filter((p) => matches(p.subject, p.to?.email, p.to?.name))

  const starButton = (templateId: string | null, source: string, subject: string, disabled = false) =>
    templateId ? (
      <button type="button" onClick={() => void unstar(templateId)} aria-label={`Remove "${subject}" from templates`} title="Starred as a template">
        <Star className="size-4 fill-warning text-warning" aria-hidden />
      </button>
    ) : (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setNaming({ kind: "star", source, subject })}
        aria-label={`Star "${subject}" as a template`}
        title="Star as a template"
        className="text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        <Star className="size-4" aria-hidden />
      </button>
    )

  const reuseButton = (source: string, subject: string, disabled = false) => (
    <AdminButton variant="secondary" disabled={disabled} onClick={() => setUsing({ source, subject })}>
      <Repeat aria-hidden />
      Use again
    </AdminButton>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden />
          Broadcasts
        </Link>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <AdminInput aria-label="Search sent emails" placeholder="Search subject, name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-8" />
        </div>
      </div>

      <AdminCard title={`Templates (${templates.length})`}>
        {templates.length === 0 ? (
          <p className="text-caption text-muted-foreground">Star any email below to keep it here as a template, with a name.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {templates.map((t) => (
              <li key={t.id} aria-label={`Template ${t.name}`} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Thumb src={t.picture} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label font-semibold text-foreground">{t.name}</span>
                  <span className="truncate text-caption text-muted-foreground">
                    {t.subject} · {t.designed ? "AI-written" : "plain text"} · saved {fmtDate(t.createdAt)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <AdminButton variant="ghost" onClick={() => setNaming({ kind: "rename", id: t.id, name: t.name })}>
                    Rename
                  </AdminButton>
                  <AdminButton variant="ghost" onClick={() => void unstar(t.id)}>
                    Remove
                  </AdminButton>
                  {reuseButton(`template:${t.id}`, t.subject)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title={`Campaigns (${campaigns.length})`}>
        {campaigns.length === 0 ? (
          <p className="text-caption text-muted-foreground">No campaigns{words.length ? " match" : " yet"}.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {campaigns.map((c) => (
              <li key={c.id} aria-label={`Campaign ${c.subject}`} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Thumb src={c.picture} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/admin/broadcasts/campaigns/${c.id}`} className="truncate text-label font-semibold text-foreground hover:underline">
                    {c.subject}
                  </Link>
                  <span className="text-caption text-muted-foreground">
                    {audienceLabel(c.audience, c.audienceValue)} · {fmtDate(c.createdAt)} · {c.sent} of {c.people} sent
                    {c.sent > 0 && ` · seen ${percentOf(c.seen, c.sent)} · clicked ${percentOf(c.clicked, c.sent)}`}
                    {c.archived && " · archived"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {starButton(c.templateId, `campaign:${c.id}`, c.subject)}
                  {reuseButton(`campaign:${c.id}`, c.subject)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title={`Personal emails (${personal.length})`}>
        {personal.length === 0 ? (
          <p className="text-caption text-muted-foreground">
            {words.length ? "No personal emails match." : "Personal emails sent from a person's profile show here."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {personal.map((p) => (
              <li key={p.id} aria-label={`Personal email ${p.subject ?? "(subject not kept)"}`} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Thumb src={p.picture} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-label font-semibold text-foreground">{p.subject ?? "(subject not kept)"}</span>
                  <span className="text-caption text-muted-foreground">
                    To{" "}
                    {p.to ? (
                      <Link href={`/admin/users/${p.to.id}`} className="hover:underline">
                        {p.to.name ?? p.to.email}
                      </Link>
                    ) : (
                      "a deleted account"
                    )}{" "}
                    · {fmtDateTime(p.sentAt)}
                  </span>
                  <span className="text-caption">
                    <SeenStatus {...p} activity={{ kind: "personal", id: p.id, who: p.to?.name ?? p.to?.email ?? "them" }} />
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {p.reusable ? (
                    <>
                      {starButton(p.templateId, `personal:${p.id}`, p.subject ?? "")}
                      {reuseButton(`personal:${p.id}`, p.subject ?? "")}
                    </>
                  ) : (
                    <span className="text-caption text-muted-foreground" title="Sent before personal emails were kept in full">
                      Not kept
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {using && <UseAgainDialog source={using.source} subject={using.subject} onClose={() => setUsing(null)} />}
      {naming && (
        <NameDialog
          title={naming.kind === "star" ? "Name this template" : "Rename template"}
          initial={naming.kind === "star" ? naming.subject : naming.name}
          onClose={() => setNaming(null)}
          onSave={async (name) => {
            try {
              if (naming.kind === "star") await send("/api/admin/email-templates", "POST", { name, source: naming.source })
              else await send(`/api/admin/email-templates/${naming.id}`, "PATCH", { name })
              toast(naming.kind === "star" ? "Starred as a template" : "Renamed", "success")
              setNaming(null)
              await load()
            } catch (e) {
              toast(e instanceof Error ? e.message : "Couldn't save it", "error")
            }
          }}
        />
      )}
    </div>
  )
}
