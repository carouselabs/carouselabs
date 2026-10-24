"use client"

// Leads → Lists: every list, fixed (the people put on it: an upload, leads
// added by hand, or ticked in All leads) or smart (a saved filter: whoever
// matches it now). Make an empty list, rename one, change a smart list's
// filters, see its people, or delete it (a fixed list's leads can stay or
// go with it).
import { useState } from "react"
import { FolderPlus, ListFilter, Pencil, Trash2, Users } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, ConfirmModal, Modal, fmtDate } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { describeFilter } from "@/lib/leadFilters"
import type { LeadColumn } from "@/lib/leadRules"
import { filterColumns } from "./LeadFilterBar"
import { count, isSmart, type LeadListInfo } from "./leadTypes"

export function LeadLists({
  lists,
  columns,
  onSeePeople,
  onEditFilters,
  onNewSmart,
  onChanged,
}: {
  lists: LeadListInfo[]
  columns: LeadColumn[]
  onSeePeople: (list: LeadListInfo) => void
  onEditFilters: (list: LeadListInfo) => void
  // Go to All leads to set the filters of a new smart list.
  onNewSmart: () => void
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [making, setMaking] = useState(false)
  const [renaming, setRenaming] = useState<LeadListInfo | null>(null)
  const [deleting, setDeleting] = useState<LeadListInfo | null>(null)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  const names = {
    lists: Object.fromEntries(lists.map((l) => [l.id, l.name])),
    columns: Object.fromEntries(filterColumns(columns).map((c) => [c.key, c.label])),
  }

  async function call(url: string, init: RequestInit, fallback: string) {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? fallback)
    return body
  }

  async function make() {
    setBusy(true)
    try {
      await call("/api/admin/leads/lists", { method: "POST", body: JSON.stringify({ name: name.trim(), kind: "static" }) }, "Couldn't make the list")
      toast(`Made "${name.trim()}". Fill it from All leads: tick people, then Add to list.`, "success")
      setMaking(false)
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't make the list", "error")
    } finally {
      setBusy(false)
    }
  }

  async function rename(list: LeadListInfo) {
    setBusy(true)
    try {
      await call(`/api/admin/leads/lists/${list.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }, "Couldn't rename it")
      toast(`Renamed "${list.name}" to "${name.trim()}"`, "success")
      setRenaming(null)
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't rename it", "error")
    } finally {
      setBusy(false)
    }
  }

  async function remove(list: LeadListInfo, leads: "keep" | "delete") {
    setBusy(true)
    try {
      const body = await call(`/api/admin/leads/lists/${list.id}?leads=${leads}`, { method: "DELETE" }, "Couldn't delete the list")
      toast(
        isSmart(list) ? `Deleted the smart list "${list.name}"` : leads === "keep" ? `Deleted "${list.name}". Its leads are still saved.` : `Deleted "${list.name}" and ${count(body.removed)} leads only on it`,
        "success",
      )
      setDeleting(null)
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete the list", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard
      title={`Lists (${lists.length})`}
      actions={
        <span className="flex flex-wrap gap-2">
          <AdminButton
            variant="secondary"
            onClick={() => {
              setName("")
              setMaking(true)
            }}
          >
            <FolderPlus aria-hidden />
            New list
          </AdminButton>
          <AdminButton variant="secondary" onClick={onNewSmart}>
            <ListFilter aria-hidden />
            New smart list
          </AdminButton>
        </span>
      }
    >
      {lists.length === 0 ? (
        <p className="text-caption text-muted-foreground">No lists yet. Upload a CSV or add leads in Add &amp; upload, or make an empty list and fill it from All leads.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {lists.map((l) => (
            <li key={l.id} aria-label={`List ${l.name}`} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-label font-semibold text-foreground">{l.name}</span>
                  {isSmart(l) ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                      <ListFilter className="size-3" aria-hidden />
                      Smart
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Fixed</span>
                  )}
                </span>
                <span className="truncate text-caption text-muted-foreground">
                  {count(l.count)} {l.count === 1 ? "person" : "people"}
                  {isSmart(l)
                    ? ` now · ${l.filter ? describeFilter(l.filter, names) : "no filters"}`
                    : l.fileName
                      ? ` · uploaded ${fmtDate(l.createdAt)} from ${l.fileName}`
                      : ` · made ${fmtDate(l.createdAt)}`}
                </span>
                {l.columns.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {l.columns.map((c) => (
                      <span key={c.key} title={c.label} className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {`{{${c.key}}}`}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-1">
                <AdminButton variant="ghost" onClick={() => onSeePeople(l)}>
                  <Users aria-hidden />
                  See people
                </AdminButton>
                {isSmart(l) && (
                  <AdminButton variant="ghost" onClick={() => onEditFilters(l)}>
                    <ListFilter aria-hidden />
                    Edit filters
                  </AdminButton>
                )}
                <AdminButton
                  variant="ghost"
                  onClick={() => {
                    setName(l.name)
                    setRenaming(l)
                  }}
                >
                  <Pencil aria-hidden />
                  Rename
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => setDeleting(l)}>
                  <Trash2 aria-hidden />
                  Delete
                </AdminButton>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal open={making} onClose={() => setMaking(false)} title="New list">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) void make()
          }}
        >
          <AdminInput aria-label="List name" autoFocus value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Founders I met in Bangalore" />
          <p className="text-caption text-muted-foreground">
            An empty list you fill yourself: in All leads, tick people and press Add to list, or add leads to it in Add &amp; upload. For a list that fills itself, use New smart list.
          </p>
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setMaking(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" loading={busy} disabled={!name.trim()}>
              Make list
            </AdminButton>
          </div>
        </form>
      </Modal>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title={`Rename "${renaming?.name ?? ""}"`}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (renaming && name.trim()) void rename(renaming)
          }}
        >
          <AdminInput aria-label="New name" autoFocus value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" loading={busy} disabled={!name.trim() || name.trim() === renaming?.name}>
              Rename
            </AdminButton>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting && isSmart(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting, "keep")}
        loading={busy}
        title={`Delete the smart list "${deleting?.name ?? ""}"?`}
        body="Only the saved filters go: nobody is deleted. Campaigns already made keep their people."
        confirmLabel="Delete smart list"
      />
      <Modal open={!!deleting && !isSmart(deleting)} onClose={() => setDeleting(null)} title={`Delete "${deleting?.name ?? ""}"?`}>
        <div className="flex flex-col gap-4">
          <p className="text-label text-muted-foreground">
            Keep its {count(deleting?.count ?? 0)} leads saved (on All leads and any other lists), or delete the ones only on this list too. Anyone who unsubscribed is always
            kept, so they&apos;re never emailed again. Campaigns already made keep their people.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </AdminButton>
            <AdminButton variant="secondary" loading={busy} onClick={() => deleting && void remove(deleting, "keep")}>
              Delete list, keep leads
            </AdminButton>
            <AdminButton variant="danger" loading={busy} onClick={() => deleting && void remove(deleting, "delete")}>
              Delete list and its leads
            </AdminButton>
          </div>
        </div>
      </Modal>
    </AdminCard>
  )
}
