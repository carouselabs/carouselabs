"use client"

// /admin/broadcasts/leads — people who don't use CarouseLabs yet (lib/leads.ts),
// in four tabs: All leads (everyone in one table, with filters, ticking and
// smart lists: AllLeads), Lists (fixed and smart: LeadLists), Add & upload
// (one by hand, pasted, or a CSV: LeadAddForms) and Brevo setup (what sends
// their emails: BrevoSetup). Emailing them is a campaign: in the AI writer or
// the composer, "Who it's for" → My leads.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MailX, Sparkles, Users } from "lucide-react"
import { AdminCard, Spinner, StatCard } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import type { LeadFilter } from "@/lib/leadFilters"
import { AllLeads } from "./AllLeads"
import { LeadLists } from "./LeadLists"
import { LeadAddForms } from "./LeadAddForms"
import { BrevoSetup } from "./BrevoSetup"
import { count, type LeadListInfo, type LeadsOverview } from "./leadTypes"

const TABS = [
  { key: "all", label: "All leads" },
  { key: "lists", label: "Lists" },
  { key: "add", label: "Add & upload" },
  { key: "brevo", label: "Brevo setup" },
] as const
type Tab = (typeof TABS)[number]["key"]

export function LeadsManager() {
  const { toast } = useToast()
  const [data, setData] = useState<LeadsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("all")
  const [filter, setFilter] = useState<LeadFilter>({})
  // The smart list whose filters are being changed in All leads.
  const [editing, setEditing] = useState<LeadListInfo | null>(null)
  // Bumped when leads change elsewhere (added, uploaded), so All leads loads again.
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/leads?only=lists", { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't load the leads")
      setData({ totals: body.totals, lists: body.lists ?? [], columns: body.columns ?? [] })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the leads")
    }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
  useEffect(() => void load(), [load])

  const changed = () => {
    setVersion((v) => v + 1)
    void load()
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        Broadcasts
      </Link>
      <Link
        href="/admin/broadcasts/writer"
        className="inline-flex items-center gap-1.5 rounded-control-sm bg-brand/15 px-3 py-1.5 text-caption font-semibold text-foreground transition-colors hover:bg-brand/25"
      >
        <Sparkles className="size-3.5 text-brand" aria-hidden />
        Write an email for your leads
      </Link>
    </div>
  )

  if (error && !data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <AdminCard>
          <p className="text-label text-danger">{error}</p>
        </AdminCard>
      </div>
    )
  }
  if (!data) return <Spinner label="Loading leads…" />

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Leads saved" value={count(data.totals.total)} icon={<Users />} />
        <StatCard label="Never emailed" value={count(data.totals.neverEmailed)} hint="No campaign has reached them yet" />
        <StatCard label="Stopped" value={count(data.totals.unsubscribed)} icon={<MailX />} hint="Unsubscribed, bounced or marked spam: never emailed again" />
        <StatCard label="Lists" value={count(data.lists.length)} />
      </div>

      <div className="flex flex-col gap-5">
        <div role="tablist" aria-label="Leads sections" className="flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`leads-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`leads-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-caption font-medium whitespace-nowrap transition-colors duration-(--motion-fast) ${
                tab === t.key ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`leads-panel-${tab}`} aria-labelledby={`leads-tab-${tab}`}>
          {tab === "all" && (
            <AllLeads
              key={version}
              lists={data.lists}
              columns={data.columns}
              filter={filter}
              onFilter={setFilter}
              editing={editing}
              onDoneEditing={() => setEditing(null)}
              onChanged={() => void load()}
              onAdd={() => setTab("add")}
            />
          )}
          {tab === "lists" && (
            <LeadLists
              lists={data.lists}
              columns={data.columns}
              onSeePeople={(l) => {
                setEditing(null)
                setFilter({ listId: l.id })
                setTab("all")
              }}
              onEditFilters={(l) => {
                setEditing(l)
                setFilter(l.filter ?? {})
                setTab("all")
              }}
              onNewSmart={() => {
                setEditing(null)
                setFilter({})
                setTab("all")
                toast("Set the filters, then press Save as smart list", "info")
              }}
              onChanged={changed}
            />
          )}
          {tab === "add" && <LeadAddForms lists={data.lists} columns={data.columns} onSaved={changed} />}
          {tab === "brevo" && <BrevoSetup />}
        </div>
      </div>
    </div>
  )
}
