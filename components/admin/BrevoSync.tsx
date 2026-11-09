"use client"

// Leads → (another account) → Brevo sync & setup: "Sync from Brevo"
// (lib/brevoSync.ts, /api/admin/leads/brevo-sync). Every Brevo list of the
// account (and "All Brevo contacts") with how many contacts it has and the
// lead list it was copied into; Sync copies it a page at a time, showing how
// far it is, and can be pressed again to bring in whoever was added since.
// Anyone Brevo has blocklisted or unsubscribed is stopped here too.
import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { AdminButton, AdminCard, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { ACCOUNTS } from "@/lib/leadAccounts"
import { useLeadAccount, withAccount } from "./leadAccountContext"
import { count } from "./leadTypes"

type BrevoList = {
  brevoListId: number
  name: string
  contacts: number
  blocklisted: number
  synced: { listId: string; name: string; members: number } | null
}
type Page = { added: number; alreadySaved: number; stopped: number; invalid: number; nextOffset: number | null; total: number; listName: string }
type Progress = { brevoListId: number; done: number; total: number }

export function BrevoSync({ onSynced }: { onSynced?: () => void }) {
  const account = useLeadAccount()
  const info = ACCOUNTS[account]
  const { toast } = useToast()
  const [lists, setLists] = useState<BrevoList[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(withAccount("/api/admin/leads/brevo-sync", account), { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't read your Brevo lists")
      setLists(body.lists ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read your Brevo lists")
    }
  }, [account])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
  useEffect(() => void load(), [load])

  // One Brevo list, page by page; answers what it brought in.
  async function syncOne(list: BrevoList): Promise<{ added: number; alreadySaved: number; stopped: number }> {
    const totals = { added: 0, alreadySaved: 0, stopped: 0 }
    let offset: number | null = 0
    setProgress({ brevoListId: list.brevoListId, done: 0, total: list.contacts })
    while (offset !== null) {
      const res = await fetch("/api/admin/leads/brevo-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, brevoListId: list.brevoListId, offset }),
      })
      const page = (await res.json().catch(() => ({}))) as Page & { error?: string }
      if (!res.ok) throw new Error(page.error ?? "Brevo didn't answer")
      totals.added += page.added
      totals.alreadySaved += page.alreadySaved
      totals.stopped += page.stopped
      const done: number = page.nextOffset ?? page.total
      setProgress({ brevoListId: list.brevoListId, done, total: page.total })
      offset = page.nextOffset
    }
    return totals
  }

  async function sync(which: BrevoList[]) {
    const totals = { added: 0, alreadySaved: 0, stopped: 0 }
    try {
      for (const list of which) {
        const t = await syncOne(list)
        totals.added += t.added
        totals.alreadySaved += t.alreadySaved
        totals.stopped += t.stopped
      }
      const stopped = totals.stopped ? `, ${count(totals.stopped)} stopped (unsubscribed or blocklisted in Brevo)` : ""
      toast(`Synced: ${count(totals.added)} new leads, ${count(totals.alreadySaved)} already here${stopped}.`, "success")
      onSynced?.()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't sync from Brevo", "error")
    } finally {
      setProgress(null)
      void load()
    }
  }

  const busy = progress !== null
  return (
    <AdminCard
      title={`Sync from Brevo (${info.domain})`}
      actions={
        lists &&
        lists.length > 0 && (
          <AdminButton variant="secondary" loading={busy} onClick={() => void sync(lists.filter((l) => l.contacts > 0))}>
            <RefreshCw aria-hidden />
            Sync all
          </AdminButton>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-caption text-muted-foreground">
          Copies {info.label}&apos;s contacts from the {info.domain} Brevo account into these leads: each Brevo list becomes a list here, with the same name.
          Sync again any time to bring in whoever was added since. Nothing in Brevo is changed, and anyone Brevo has unsubscribed or blocklisted is never
          emailed from here.
        </p>
        {!lists && !error && <p className="text-caption text-muted-foreground">Reading your Brevo lists…</p>}
        {error && <p className="text-caption text-danger">{error}</p>}
        {lists && (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Brevo list</th>
                  <th className={tableCls.th}>Contacts</th>
                  <th className={tableCls.th}>Copied into</th>
                  <th className={tableCls.th}>
                    <span className="sr-only">Sync</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => {
                  const here = progress?.brevoListId === l.brevoListId
                  return (
                    <tr key={l.brevoListId} className={tableCls.row}>
                      <td className={tableCls.td}>{l.name}</td>
                      <td className={tableCls.td}>
                        {count(l.contacts)}
                        {l.blocklisted > 0 && <span className="text-muted-foreground"> ({count(l.blocklisted)} blocklisted)</span>}
                      </td>
                      <td className={tableCls.td}>
                        {here ? (
                          <span className="text-muted-foreground">
                            Syncing… {count(Math.min(progress.done, progress.total))} of {count(progress.total)}
                          </span>
                        ) : l.synced ? (
                          <span>
                            {l.synced.name} <span className="text-muted-foreground">({count(l.synced.members)} leads)</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not synced yet</span>
                        )}
                      </td>
                      <td className={`${tableCls.td} text-right`}>
                        <AdminButton variant="secondary" disabled={busy || l.contacts === 0} loading={here} onClick={() => void sync([l])}>
                          {l.synced ? "Sync again" : "Sync"}
                        </AdminButton>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminCard>
  )
}
