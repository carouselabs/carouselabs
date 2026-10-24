"use client"

// Leads → All leads → one lead (/api/admin/leads/[id]): change their name and
// columns, see the lists they're on, and every campaign email they were sent
// with when they saw it and clicked (SeenStatus, and its History).
import { useEffect, useState } from "react"
import Link from "next/link"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { AdminButton, AdminInput, Spinner, fmtDate, fmtDateTime } from "@/components/admin/ui"
import type { LeadColumn } from "@/lib/leadRules"
import { SeenStatus } from "./SeenStatus"
import { STOPPED } from "./leadTypes"

type Detail = {
  lead: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
    fields: Record<string, string>
    createdAt: string
    unsubscribedAt: string | null
    stopReason: string | null
  }
  lists: { id: string; name: string }[]
  emails: {
    id: string
    status: string
    sentAt: string | null
    error: string | null
    openedAt: string | null
    openCount: number
    clickedAt: string | null
    clickCount: number
    lastClickedAt?: string | null
    scannedAt?: string | null
    scanReason?: string | null
    autoOpenedAt?: string | null
    campaign: { id: string; subject: string }
  }[]
  columns: LeadColumn[]
}

const label = "text-caption font-semibold text-muted-foreground"
const STATUS: Record<string, string> = { pending: "Not sent yet", sending: "Sending", failed: "Didn't send" }

export function LeadPanel({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ firstName: string; lastName: string; name: string; fields: Record<string, string> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    let live = true
    /* eslint-disable react-hooks/set-state-in-effect -- a new lead starts empty while it loads */
    setDetail(null)
    setError(null)
    setSaved(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    fetch(`/api/admin/leads/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? "Couldn't load them")
        if (!live) return
        setDetail(body)
        setDraft({ firstName: body.lead.firstName ?? "", lastName: body.lead.lastName ?? "", name: body.lead.name ?? "", fields: { ...body.lead.fields } })
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn't load them"))
    return () => {
      live = false
    }
  }, [id])

  async function save() {
    if (!id || !draft) return
    setSaving(true)
    setSaved(null)
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: draft.firstName || null, lastName: draft.lastName || null, name: draft.name || null, fields: draft.fields }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't save the changes")
      setSaved({ ok: true, text: "Saved" })
      onSaved()
    } catch (e) {
      setSaved({ ok: false, text: e instanceof Error ? e.message : "Couldn't save the changes" })
    } finally {
      setSaving(false)
    }
  }

  const lead = detail?.lead
  // Their columns: every list's, then any they have that no list names.
  const columns = detail ? [...detail.columns, ...Object.keys(detail.lead.fields).filter((k) => !detail.columns.some((c) => c.key === k)).map((k) => ({ key: k, label: k }))] : []

  return (
    <Drawer open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent side="right" title={lead?.email ?? "Lead"} description={lead ? `Added ${fmtDate(lead.createdAt)}` : undefined} className="sm:max-w-lg">
        {error ? (
          <p className="text-label text-danger">{error}</p>
        ) : !detail || !draft || !lead ? (
          <Spinner label="Loading…" />
        ) : (
          <div className="flex flex-col gap-6">
            {lead.unsubscribedAt && (
              <p className="rounded-control-sm bg-danger-soft px-3 py-2 text-caption text-danger">
                {STOPPED[lead.stopReason ?? "unsubscribed"] ?? "Unsubscribed"} {fmtDate(lead.unsubscribedAt)}. They&apos;re never emailed again.
              </p>
            )}

            <section className="flex flex-col gap-3" aria-label="Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="panel-first" className={label}>
                    First name
                  </label>
                  <AdminInput id="panel-first" value={draft.firstName} maxLength={100} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="panel-last" className={label}>
                    Last name
                  </label>
                  <AdminInput id="panel-last" value={draft.lastName} maxLength={100} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="panel-name" className={label}>
                  Full name
                </label>
                <AdminInput id="panel-name" value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Used when there's no first and last name" />
              </div>
              {columns.map((c) => (
                <div key={c.key} className="flex flex-col gap-1.5">
                  <label htmlFor={`panel-field-${c.key}`} className={label}>
                    {c.label} <span className="font-mono font-normal">{`{{${c.key}}}`}</span>
                  </label>
                  <AdminInput
                    id={`panel-field-${c.key}`}
                    value={draft.fields[c.key] ?? ""}
                    maxLength={500}
                    onChange={(e) => setDraft({ ...draft, fields: { ...draft.fields, [c.key]: e.target.value } })}
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <AdminButton onClick={() => void save()} loading={saving}>
                  Save changes
                </AdminButton>
                {saved && <span className={`text-caption ${saved.ok ? "text-success" : "text-danger"}`}>{saved.text}</span>}
              </div>
            </section>

            <section className="flex flex-col gap-2" aria-label="Lists">
              <h3 className={label}>Lists</h3>
              {detail.lists.length === 0 ? (
                <p className="text-caption text-muted-foreground">Not on any list.</p>
              ) : (
                <span className="flex flex-wrap gap-1.5">
                  {detail.lists.map((l) => (
                    <span key={l.id} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-foreground">
                      {l.name}
                    </span>
                  ))}
                </span>
              )}
            </section>

            <section className="flex flex-col gap-2" aria-label="Emails">
              <h3 className={label}>Emails ({detail.emails.length})</h3>
              {detail.emails.length === 0 ? (
                <p className="text-caption text-muted-foreground">No campaign has emailed them yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
                  {detail.emails.map((e) => (
                    <li key={e.id} className="flex flex-col gap-1 px-3 py-2.5">
                      <Link href={`/admin/broadcasts/campaigns/${e.campaign.id}`} className="truncate text-label font-medium text-foreground hover:underline">
                        {e.campaign.subject}
                      </Link>
                      <span className="text-caption text-muted-foreground">
                        {e.status === "sent" ? (
                          <>
                            Sent {fmtDateTime(e.sentAt)} · <SeenStatus {...e} activity={{ kind: "campaign", id: e.id, who: lead.email }} />
                          </>
                        ) : (
                          <span className={e.status === "failed" ? "text-danger" : undefined}>
                            {STATUS[e.status] ?? e.status}
                            {e.error ? `: ${e.error}` : ""}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
