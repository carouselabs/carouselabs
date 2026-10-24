"use client"

// Leads → Add & upload: add one lead by hand (email, name, any column), or
// paste many (one per line), into a static list or a new one; or upload a
// CSV (LeadsUpload). All go through the same save as an upload
// (/api/admin/leads, lib/leads.ts importLeads): nobody twice, CarouseLabs
// users and broken addresses left out.
import { useState } from "react"
import { UserPlus, ClipboardPaste } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, AdminSelect } from "@/components/admin/ui"
import { LEAD_IMPORT_CHUNK, parsePastedLeads, type LeadColumn, type LeadInput } from "@/lib/leadRules"
import { LeadsUpload } from "./LeadsUpload"
import { isSmart, type LeadListInfo } from "./leadTypes"

type ListOption = Pick<LeadListInfo, "id" | "name" | "kind" | "count">
type Saved = { added: number; alreadySaved: number; alreadyUsers: number; unsubscribed: number; invalid: number }

const NEW = "__new__"
const label = "text-caption font-semibold text-muted-foreground"

// Which list they go on: one of the static lists, or a new one named here.
function ListChoice({ lists, value, onChange, name, onName, id }: { lists: ListOption[]; value: string; onChange: (v: string) => void; name: string; onName: (v: string) => void; id: string }) {
  const statics = lists.filter((l) => !isSmart(l))
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>
        Add to list
      </label>
      <div className="flex flex-wrap gap-2">
        <AdminSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-[12rem]">
          <option value={NEW}>New list…</option>
          {statics.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.count})
            </option>
          ))}
        </AdminSelect>
        {value === NEW && <AdminInput aria-label="New list name" value={name} maxLength={120} onChange={(e) => onName(e.target.value)} placeholder="e.g. Met at the Delhi meetup" className="min-w-[14rem] flex-1" />}
      </div>
    </div>
  )
}

async function save(leads: LeadInput[], columns: LeadColumn[], list: { id: string | null; name: string }): Promise<Saved & { listId: string }> {
  const totals: Saved = { added: 0, alreadySaved: 0, alreadyUsers: 0, unsubscribed: 0, invalid: 0 }
  let listId = list.id ?? undefined
  for (let i = 0; i < leads.length; i += LEAD_IMPORT_CHUNK) {
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, listName: list.name, columns, leads: leads.slice(i, i + LEAD_IMPORT_CHUNK) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Couldn't save them")
    listId = data.listId
    for (const k of Object.keys(totals) as (keyof Saved)[]) totals[k] += data[k] ?? 0
  }
  return { ...totals, listId: listId! }
}

export function savedMessage(s: Saved): string {
  const parts = [`${s.added} added`]
  if (s.alreadySaved) parts.push(`${s.alreadySaved} already saved (now on this list too)`)
  if (s.alreadyUsers) parts.push(`${s.alreadyUsers} already use CarouseLabs (left out)`)
  if (s.invalid) parts.push(`${s.invalid} without a real email (left out)`)
  if (s.unsubscribed) parts.push(`${s.unsubscribed} unsubscribed before (won't be emailed)`)
  return parts.join(" · ")
}

export function LeadAddForms({ lists, columns, onSaved }: { lists: ListOption[]; columns: LeadColumn[]; onSaved: () => void }) {
  // One lead.
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [oneList, setOneList] = useState(NEW)
  const [oneListName, setOneListName] = useState("Added by hand")
  const [oneBusy, setOneBusy] = useState(false)
  const [oneResult, setOneResult] = useState<{ ok: boolean; text: string } | null>(null)
  // Many, pasted.
  const [pasted, setPasted] = useState("")
  const [manyList, setManyList] = useState(NEW)
  const [manyListName, setManyListName] = useState("")
  const [manyBusy, setManyBusy] = useState(false)
  const [manyResult, setManyResult] = useState<{ ok: boolean; text: string } | null>(null)

  const listOf = (value: string, name: string) => (value === NEW ? { id: null, name: name.trim() } : { id: value, name: lists.find((l) => l.id === value)?.name ?? "List" })

  async function addOne() {
    setOneBusy(true)
    setOneResult(null)
    try {
      const used = columns.filter((c) => fields[c.key]?.trim())
      const lead: LeadInput = {
        email: email.trim(),
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        name: null,
        fields: Object.fromEntries(used.map((c) => [c.key, fields[c.key].trim()])),
      }
      const saved = await save([lead], used, listOf(oneList, oneListName))
      setOneResult({ ok: saved.added + saved.alreadySaved > 0, text: saved.added ? `Added ${email.trim()}.` : savedMessage(saved) })
      if (saved.added + saved.alreadySaved > 0) {
        setEmail("")
        setFirstName("")
        setLastName("")
        setFields({})
        setOneList(saved.listId)
        onSaved()
      }
    } catch (e) {
      setOneResult({ ok: false, text: e instanceof Error ? e.message : "Couldn't add them" })
    } finally {
      setOneBusy(false)
    }
  }

  const parsed = parsePastedLeads(pasted)
  async function addMany() {
    setManyBusy(true)
    setManyResult(null)
    try {
      const saved = await save(parsed.leads, [], listOf(manyList, manyListName))
      setManyResult({ ok: true, text: savedMessage({ ...saved, invalid: saved.invalid + parsed.invalid }) })
      setPasted("")
      setManyList(saved.listId)
      onSaved()
    } catch (e) {
      setManyResult({ ok: false, text: e instanceof Error ? e.message : "Couldn't add them" })
    } finally {
      setManyBusy(false)
    }
  }

  const oneReady = !!email.trim() && (oneList !== NEW || !!oneListName.trim())
  const manyReady = parsed.leads.length > 0 && (manyList !== NEW || !!manyListName.trim())
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Add one lead">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (oneReady) void addOne()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-email" className={label}>
                Email
              </label>
              <AdminInput id="lead-email" type="email" required value={email} maxLength={320} onChange={(e) => setEmail(e.target.value)} placeholder="asha@acme.com" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lead-first" className={label}>
                  First name
                </label>
                <AdminInput id="lead-first" value={firstName} maxLength={100} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lead-last" className={label}>
                  Last name
                </label>
                <AdminInput id="lead-last" value={lastName} maxLength={100} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            {columns.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {columns.map((c) => (
                  <div key={c.key} className="flex flex-col gap-1.5">
                    <label htmlFor={`lead-field-${c.key}`} className={label}>
                      {c.label} <span className="font-mono font-normal">{`{{${c.key}}}`}</span>
                    </label>
                    <AdminInput id={`lead-field-${c.key}`} value={fields[c.key] ?? ""} maxLength={500} onChange={(e) => setFields((f) => ({ ...f, [c.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}
            <ListChoice id="one-list" lists={lists} value={oneList} onChange={setOneList} name={oneListName} onName={setOneListName} />
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton type="submit" loading={oneBusy} disabled={!oneReady}>
                <UserPlus aria-hidden />
                Add lead
              </AdminButton>
              {oneResult && <span className={`text-caption ${oneResult.ok ? "text-success" : "text-danger"}`}>{oneResult.text}</span>}
            </div>
          </form>
        </AdminCard>

        <AdminCard title="Paste many">
          <div className="flex flex-col gap-3">
            <textarea
              aria-label="Leads, one per line"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={7}
              placeholder={"asha@acme.com\nRavi Kumar <ravi@globex.com>\nPriya Shah, priya@initech.com"}
              className="w-full rounded-control-sm border border-border bg-background p-3 font-mono text-caption text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-brand"
            />
            <p className="text-caption text-muted-foreground">
              One per line: an email, or a name with it. {parsed.leads.length > 0 && `${parsed.leads.length} to add`}
              {parsed.invalid > 0 && ` · ${parsed.invalid} without a real email (left out)`}
              {parsed.duplicates > 0 && ` · ${parsed.duplicates} twice (added once)`}
            </p>
            <ListChoice id="many-list" lists={lists} value={manyList} onChange={setManyList} name={manyListName} onName={setManyListName} />
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton onClick={() => void addMany()} loading={manyBusy} disabled={!manyReady}>
                <ClipboardPaste aria-hidden />
                Add {parsed.leads.length || ""} leads
              </AdminButton>
              {manyResult && <span className={`text-caption ${manyResult.ok ? "text-success" : "text-danger"}`}>{manyResult.text}</span>}
            </div>
          </div>
        </AdminCard>
      </div>

      <LeadsUpload onSaved={onSaved} />
    </div>
  )
}
