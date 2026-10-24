"use client"

// Leads → All leads: everyone saved, in one table (/api/admin/leads, lib/leads.ts
// listLeads), narrowed by the filters (LeadFilterBar). Tick leads, or "all
// that match", to add them to a list (or a new one), take them off the list
// being shown, or delete them. Save the filters as a smart list that keeps
// itself up to date, or change a smart list's filters (Lists → Edit filters).
// A lead opens in LeadPanel.
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, FolderPlus, ListFilter, ListMinus, Trash2, X } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, AdminSelect, ConfirmModal, Modal, Spinner, fmtDate, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { describeFilter, isEmptyFilter, type LeadFilter } from "@/lib/leadFilters"
import type { LeadColumn } from "@/lib/leadRules"
import { LeadFilterBar, filterColumns } from "./LeadFilterBar"
import { LeadPanel } from "./LeadPanel"
import { STOPPED, count, isSmart, type LeadListInfo, type LeadRowInfo } from "./leadTypes"

type Page = { page: number; pageSize: number; total: number; leads: LeadRowInfo[] }
const NEW = "__new__"

// What the filter means once a smart list being shown is folded in: what
// "Save as smart list" saves (a smart list can't be built on another).
function savable(filter: LeadFilter, lists: LeadListInfo[]): LeadFilter {
  const smart = filter.listId ? lists.find((l) => l.id === filter.listId && isSmart(l)) : undefined
  if (!smart) return filter
  const rest = { ...filter }
  delete rest.listId
  return { ...(smart.filter ?? {}), ...rest }
}

export function AllLeads({
  lists,
  columns,
  filter,
  onFilter,
  editing,
  onDoneEditing,
  onChanged,
  onAdd,
}: {
  lists: LeadListInfo[]
  columns: LeadColumn[]
  filter: LeadFilter
  onFilter: (next: LeadFilter) => void
  // The smart list whose filters are being changed (Lists → Edit filters).
  editing: LeadListInfo | null
  onDoneEditing: () => void
  // The lists or numbers changed: load them again.
  onChanged: () => void
  // Go to Add & upload.
  onAdd: () => void
}) {
  const { toast } = useToast()
  const [data, setData] = useState<Page | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = JSON.stringify(filter)
  // The page and what's ticked belong to these filters: new filters start
  // from the first page with nothing ticked.
  const [at, setAt] = useState({ key, page: 1, ticked: new Set<string>(), all: false })
  const mine = at.key === key
  const page = mine ? at.page : 1
  const ticked = mine ? at.ticked : new Set<string>()
  const allMatching = mine && at.all
  const change = (patch: Partial<Omit<typeof at, "key">>) =>
    setAt((cur) => ({ ...(cur.key === key ? cur : { key, page: 1, ticked: new Set<string>(), all: false }), ...patch }))
  const setPage = (next: (p: number) => number) => change({ page: next(page) })
  const setAllMatching = (all: boolean) => change({ all })
  const [open, setOpen] = useState<string | null>(null)
  const [dialog, setDialog] = useState<"add" | "remove" | "delete" | "save" | null>(null)
  const [target, setTarget] = useState(NEW)
  const [newName, setNewName] = useState("")
  const [busy, setBusy] = useState(false)

  // The page of leads; only the newest answer shows, however the answers arrive.
  const [reloads, setReloads] = useState(0)
  const reload = () => setReloads((n) => n + 1)
  useEffect(() => {
    let live = true
    const params = new URLSearchParams({ only: "leads", page: String(page), filter: key })
    fetch(`/api/admin/leads?${params}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? "Couldn't load the leads")
        if (!live) return
        setData(body)
        setError(null)
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn't load the leads"))
    return () => {
      live = false
    }
  }, [page, key, reloads])

  const shownList = filter.listId ? lists.find((l) => l.id === filter.listId) : undefined
  const fixedShown = shownList && !isSmart(shownList) ? shownList : undefined
  const fixedLists = lists.filter((l) => !isSmart(l))
  const names = {
    lists: Object.fromEntries(lists.map((l) => [l.id, l.name])),
    columns: Object.fromEntries(filterColumns(columns).map((c) => [c.key, c.label])),
  }
  const leads = data?.leads ?? []
  const total = data?.total ?? 0
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const pageTicked = leads.length > 0 && leads.every((l) => ticked.has(l.id))
  const chosen = allMatching ? total : ticked.size
  const tableColumns = (fixedShown ? fixedShown.columns : columns).slice(0, 3)

  function tickPage() {
    const next = new Set(ticked)
    for (const l of leads) {
      if (pageTicked) next.delete(l.id)
      else next.add(l.id)
    }
    change({ ticked: next, all: false })
  }
  function tick(id: string) {
    const next = new Set(ticked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    change({ ticked: next, all: false })
  }
  const clearTicks = () => change({ ticked: new Set(), all: false })

  async function run(body: Record<string, unknown>): Promise<{ affected: number; kept: number; listId?: string }> {
    const res = await fetch("/api/admin/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...(allMatching ? { filter } : { ids: [...ticked] }) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Couldn't do that")
    return data
  }

  async function act(action: "add" | "remove" | "delete") {
    setBusy(true)
    try {
      if (action === "add") {
        const name = target === NEW ? newName.trim() : (lists.find((l) => l.id === target)?.name ?? "the list")
        const done = await run({ action, ...(target === NEW ? { newListName: name } : { listId: target }) })
        const already = chosen - done.affected
        toast(`Added ${count(done.affected)} to "${name}"${already > 0 ? ` (${count(already)} were on it already)` : ""}`, "success")
      } else if (action === "remove") {
        const done = await run({ action, listId: fixedShown!.id })
        toast(`Took ${count(done.affected)} off "${fixedShown!.name}"`, "success")
      } else {
        const done = await run({ action })
        toast(`Deleted ${count(done.affected)} leads${done.kept ? `. Kept ${count(done.kept)} who stopped getting emails, so they're never emailed again` : ""}`, "success")
      }
      setDialog(null)
      setNewName("")
      clearTicks()
      onChanged()
      reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't do that", "error")
    } finally {
      setBusy(false)
    }
  }

  async function saveSmart() {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/leads/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), kind: "smart", filter: savable(filter, lists) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't save the smart list")
      toast(`Saved the smart list "${newName.trim()}". It keeps itself up to date, and campaigns can be sent to it.`, "success")
      setDialog(null)
      setNewName("")
      onChanged()
      onFilter({ listId: body.id })
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save the smart list", "error")
    } finally {
      setBusy(false)
    }
  }

  async function saveEditing() {
    if (!editing) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/leads/lists/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't save the filters")
      toast(`Saved the filters of "${editing.name}"`, "success")
      onDoneEditing()
      onChanged()
      onFilter({ listId: editing.id })
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save the filters", "error")
    } finally {
      setBusy(false)
    }
  }

  const title = shownList ? `${shownList.name} (${count(total)})` : `All leads (${count(total)})`
  return (
    <div className="flex flex-col gap-4">
      {editing && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-card border border-brand/40 bg-brand-soft px-4 py-3">
          <ListFilter className="size-4 text-brand" aria-hidden />
          <span className="min-w-0 flex-1 text-label text-foreground">
            Changing the filters of the smart list <strong>{editing.name}</strong>. Set them below and the table shows who&apos;d be on it.
          </span>
          <AdminButton onClick={() => void saveEditing()} loading={busy} disabled={isEmptyFilter(filter)}>
            Save to &quot;{editing.name}&quot;
          </AdminButton>
          <AdminButton variant="ghost" onClick={onDoneEditing}>
            Cancel
          </AdminButton>
        </div>
      )}

      <AdminCard
        title={title}
        actions={
          !editing &&
          !isEmptyFilter(filter) &&
          !(shownList && isSmart(shownList) && Object.keys(filter).length === 1) && (
            <AdminButton
              variant="secondary"
              onClick={() => {
                setNewName("")
                setDialog("save")
              }}
            >
              <ListFilter aria-hidden />
              Save as smart list
            </AdminButton>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <LeadFilterBar filter={filter} onChange={onFilter} lists={editing ? lists.filter((l) => l.id !== editing.id && !isSmart(l)) : lists} columns={columns} />
          {shownList && isSmart(shownList) && shownList.filter && (
            <p className="text-caption text-muted-foreground">
              Smart list: {describeFilter(shownList.filter, names)}. Who&apos;s on it changes by itself as leads match.
            </p>
          )}

          {chosen > 0 && (
            <div role="region" aria-label="Ticked leads" className="flex flex-wrap items-center gap-2 rounded-control-sm bg-surface-muted px-3 py-2">
              <span className="text-label font-semibold text-foreground">{count(chosen)} ticked</span>
              {pageTicked && !allMatching && total > leads.length && (
                <button type="button" onClick={() => setAllMatching(true)} className="text-caption font-medium text-brand hover:underline">
                  Tick all {count(total)} that match
                </button>
              )}
              <span className="flex-1" />
              <AdminButton
                variant="secondary"
                onClick={() => {
                  setTarget(fixedLists.find((l) => l.id !== fixedShown?.id)?.id ?? NEW)
                  setNewName("")
                  setDialog("add")
                }}
              >
                <FolderPlus aria-hidden />
                Add to list
              </AdminButton>
              {fixedShown && (
                <AdminButton variant="secondary" onClick={() => setDialog("remove")}>
                  <ListMinus aria-hidden />
                  Take off this list
                </AdminButton>
              )}
              <AdminButton variant="danger" onClick={() => setDialog("delete")}>
                <Trash2 aria-hidden />
                Delete
              </AdminButton>
              <AdminButton variant="ghost" onClick={clearTicks}>
                <X aria-hidden />
                Clear
              </AdminButton>
            </div>
          )}

          {error && !data ? (
            <p className="text-label text-danger">{error}</p>
          ) : !data ? (
            <Spinner label="Loading leads…" />
          ) : leads.length === 0 ? (
            isEmptyFilter(filter) ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-caption text-muted-foreground">No leads yet.</p>
                <AdminButton onClick={onAdd}>Add or upload leads</AdminButton>
              </div>
            ) : (
              <p className="text-caption text-muted-foreground">No one matches these filters.</p>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <div className={tableCls.wrap}>
                <table className={tableCls.table}>
                  <thead>
                    <tr>
                      <th className={`${tableCls.th} w-10`}>
                        <input type="checkbox" aria-label="Tick everyone on this page" checked={pageTicked} onChange={tickPage} className="h-4 w-4 accent-brand" />
                      </th>
                      <th className={tableCls.th}>Person</th>
                      {tableColumns.map((c) => (
                        <th key={c.key} className={tableCls.th}>
                          {c.label}
                        </th>
                      ))}
                      <th className={tableCls.th}>Lists</th>
                      <th className={tableCls.th}>Added</th>
                      <th className={tableCls.th}>Emails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className={tableCls.row}>
                        <td className={tableCls.td}>
                          <input
                            type="checkbox"
                            aria-label={`Tick ${lead.email}`}
                            checked={allMatching || ticked.has(lead.id)}
                            onChange={() => {
                              // Un-ticking one of "all that match": everyone on this page but them.
                              if (allMatching) change({ all: false, ticked: new Set(leads.filter((l) => l.id !== lead.id).map((l) => l.id)) })
                              else tick(lead.id)
                            }}
                            className="h-4 w-4 accent-brand"
                          />
                        </td>
                        <td className={tableCls.td}>
                          <button type="button" onClick={() => setOpen(lead.id)} aria-label={`Open ${lead.email}`} className="flex flex-col text-left hover:underline">
                            <span className="font-medium text-foreground">{lead.name ?? "—"}</span>
                            <span className="text-caption text-muted-foreground">{lead.email}</span>
                          </button>
                        </td>
                        {tableColumns.map((c) => (
                          <td key={c.key} className={`${tableCls.td} max-w-[12rem] truncate text-muted-foreground`}>
                            {lead.fields[c.key] ?? "—"}
                          </td>
                        ))}
                        <td className={`${tableCls.td} max-w-[14rem] truncate text-muted-foreground`}>{lead.lists.map((l) => l.name).join(", ") || "—"}</td>
                        <td className={`${tableCls.td} text-muted-foreground`}>{fmtDate(lead.createdAt)}</td>
                        <td className={tableCls.td}>
                          {lead.unsubscribedAt ? (
                            <span className="inline-flex rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                              {STOPPED[lead.stopReason ?? "unsubscribed"] ?? "Unsubscribed"}
                            </span>
                          ) : lead.emailCount > 0 ? (
                            <span className="flex flex-col text-muted-foreground">
                              <span>
                                {lead.emailCount} sent{lead.lastEmailedAt ? ` · last ${fmtDate(lead.lastEmailedAt)}` : ""}
                              </span>
                              {(lead.lastSeenAt || lead.lastClickedAt) && (
                                <span className="text-caption">
                                  {lead.lastSeenAt && <span className="text-success">Seen {fmtDate(lead.lastSeenAt)}</span>}
                                  {lead.lastSeenAt && lead.lastClickedAt && " · "}
                                  {lead.lastClickedAt && <span className="text-brand">Clicked {fmtDate(lead.lastClickedAt)}</span>}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not yet</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="flex items-center justify-end gap-2 text-caption text-muted-foreground">
                  <AdminButton variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft aria-hidden />
                    Back
                  </AdminButton>
                  <span>
                    Page {page} of {pages}
                  </span>
                  <AdminButton variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                    <ChevronRight aria-hidden />
                  </AdminButton>
                </div>
              )}
            </div>
          )}
        </div>
      </AdminCard>

      <LeadPanel id={open} onClose={() => setOpen(null)} onSaved={reload} />

      <Modal open={dialog === "add"} onClose={() => setDialog(null)} title={`Add ${count(chosen)} ${chosen === 1 ? "lead" : "leads"} to a list`}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void act("add")
          }}
        >
          <AdminSelect aria-label="Which list" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full">
            <option value={NEW}>New list…</option>
            {fixedLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({count(l.count)})
              </option>
            ))}
          </AdminSelect>
          {target === NEW && <AdminInput aria-label="New list name" autoFocus value={newName} maxLength={120} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Banks to email in May" />}
          <p className="text-caption text-muted-foreground">They stay on their other lists too. Smart lists fill themselves, so they aren&apos;t here.</p>
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" loading={busy} disabled={target === NEW && !newName.trim()}>
              Add to list
            </AdminButton>
          </div>
        </form>
      </Modal>

      <Modal open={dialog === "save"} onClose={() => setDialog(null)} title="Save as smart list">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void saveSmart()
          }}
        >
          <AdminInput aria-label="Smart list name" autoFocus value={newName} maxLength={120} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Clicked this month" />
          <p className="text-caption text-muted-foreground">
            Whoever matches <strong className="text-foreground">{describeFilter(savable(filter, lists), names)}</strong>, now and later: new leads who match join it by themselves. Send campaigns to it from &quot;Who it&apos;s for&quot;.
          </p>
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" loading={busy} disabled={!newName.trim()}>
              Save smart list
            </AdminButton>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        onConfirm={() => void act("remove")}
        loading={busy}
        title={`Take ${count(chosen)} off "${fixedShown?.name ?? ""}"?`}
        body="They stay saved, and on any other lists they're on."
        confirmLabel="Take off list"
      />
      <ConfirmModal
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={() => void act("delete")}
        loading={busy}
        title={`Delete ${count(chosen)} ${chosen === 1 ? "lead" : "leads"}?`}
        body="They're deleted from every list. Anyone who unsubscribed, bounced or marked an email as spam is kept, so they're never emailed again. Campaigns already made keep their people."
        confirmLabel="Delete leads"
      />
    </div>
  )
}
