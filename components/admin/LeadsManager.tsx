"use client"

// /admin/broadcasts/leads — people who don't use CarouseLabs yet (lib/leads.ts),
// in four tabs: All leads (everyone in one table, with filters, ticking and
// smart lists: AllLeads), Lists (fixed and smart: LeadLists), Add & upload
// (one by hand, pasted, or a CSV: LeadAddForms) and Brevo setup (what sends
// their emails: BrevoSetup). Emailing them is a campaign: in the AI writer or
// the composer, "Who it's for" → My leads. Two accounts' leads, kept apart
// (lib/leadAccounts.ts): CarouseLabs' and Anant Goyal's (synced from the
// anantgoyal.in Brevo account: BrevoSetup → BrevoSync). The switch at the top
// picks whose; every part of the page then works on that account's alone.
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
import { LeadAccountContext, withAccount } from "./leadAccountContext"
import { ACCOUNTS, DEFAULT_ACCOUNT, LEAD_ACCOUNTS, type LeadAccount } from "@/lib/leadAccounts"

const TABS = [
  { key: "all", label: "All leads" },
  { key: "lists", label: "Lists" },
  { key: "add", label: "Add & upload" },
  { key: "brevo", label: "Brevo setup" },
] as const
type Tab = (typeof TABS)[number]["key"]

export function LeadsManager() {
  const { toast } = useToast()
  const [account, setAccount] = useState<LeadAccount>(DEFAULT_ACCOUNT)
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
      const res = await fetch(withAccount("/api/admin/leads?only=lists", account), { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't load the leads")
      setData({ totals: body.totals, lists: body.lists ?? [], columns: body.columns ?? [] })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the leads")
    }
  }, [account])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
  useEffect(() => void load(), [load])

  const changed = () => {
    setVersion((v) => v + 1)
    void load()
  }

  // Another account's leads: nothing picked or filtered carries over.
  function switchAccount(next: LeadAccount) {
    if (next === account) return
    setAccount(next)
    setData(null)
    setError(null)
    setFilter({})
    setEditing(null)
  }

  const accountSwitch = (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Whose leads" className="inline-flex w-fit gap-1 rounded-control-sm border border-border bg-muted/40 p-1">
        {LEAD_ACCOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={account === a}
            onClick={() => switchAccount(a)}
            className={`rounded-control-sm px-3 py-1.5 text-caption font-semibold transition-colors duration-(--motion-fast) ${
              account === a ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {ACCOUNTS[a].label}
          </button>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">{ACCOUNTS[account].about}</p>
    </div>
  )

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
        {accountSwitch}
        <AdminCard>
          <p className="text-label text-danger">{error}</p>
        </AdminCard>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {accountSwitch}
        <Spinner label="Loading leads…" />
      </div>
    )
  }

  const brevoTab = account === DEFAULT_ACCOUNT ? "Brevo setup" : "Brevo sync & setup"
  return (
    <LeadAccountContext.Provider value={account}>
    <div key={account} className="flex flex-col gap-6">
      {header}
      {accountSwitch}

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
              {t.key === "brevo" ? brevoTab : t.label}
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
          {tab === "brevo" && <BrevoSetup onSynced={changed} />}
        </div>
      </div>
    </div>
    </LeadAccountContext.Provider>
  )
}
