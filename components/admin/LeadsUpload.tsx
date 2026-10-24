"use client"

// Admin → Broadcasts → Leads → Upload leads: pick a CSV, say which column is
// the email (and the name; every other column can become a merge field, so
// "Company" is {{company}} in the email), name the list, save. The file is
// read here in the browser (lib/leadRules.ts) and sent in parts of
// LEAD_IMPORT_CHUNK rows, so a big file never times out.
import { useRef, useState } from "react"
import Link from "next/link"
import { FileUp, Sparkles, X } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, AdminSelect, tableCls } from "@/components/admin/ui"
import {
  LEAD_IMPORT_CHUNK,
  LEAD_IMPORT_MAX_ROWS,
  autoMapping,
  buildLeads,
  mappingProblem,
  parseCsv,
  type ColumnMapping,
  type ColumnRole,
} from "@/lib/leadRules"

const ROLES: { role: ColumnRole; label: string }[] = [
  { role: "email", label: "Email address" },
  { role: "firstName", label: "First name" },
  { role: "lastName", label: "Last name" },
  { role: "name", label: "Full name" },
  { role: "field", label: "Merge field" },
  { role: "skip", label: "Don't import" },
]

type ImportTotals = { added: number; alreadySaved: number; alreadyUsers: number; unsubscribed: number; invalid: number; duplicates: number }
type FileRead = { name: string; headers: string[]; rows: string[][] }

const count = (n: number) => n.toLocaleString("en-US")
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`

export function LeadsUpload({ onSaved }: { onSaved: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<FileRead | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping[]>([])
  const [listName, setListName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ listName: string; totals: ImportTotals } | null>(null)
  const [dragging, setDragging] = useState(false)

  async function read(picked: File | undefined) {
    if (!picked) return
    setError(null)
    setResult(null)
    if (/\.(xlsx?|numbers)$/i.test(picked.name)) {
      setError("Save the sheet as a CSV file first (File → Download or Save as → CSV), then upload that.")
      return
    }
    const rows = parseCsv(await picked.text())
    if (rows.length < 2) {
      setError("That file has no rows under its header. Check it's a CSV with one person per row.")
      return
    }
    if (rows.length - 1 > LEAD_IMPORT_MAX_ROWS) {
      setError(`That file has ${count(rows.length - 1)} rows. Upload up to ${count(LEAD_IMPORT_MAX_ROWS)} at a time.`)
      return
    }
    const [headers, ...body] = rows
    setFile({ name: picked.name, headers, rows: body })
    setMapping(autoMapping(headers))
    setListName(picked.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120))
  }

  function reset() {
    setFile(null)
    setMapping([])
    setListName("")
    setError(null)
    if (input.current) input.current.value = ""
  }

  const setColumn = (index: number, change: Partial<ColumnMapping>) =>
    setMapping((all) =>
      all.map((m, i) => {
        if (i === index) return { ...m, ...change }
        // One column per email or name part: picking it elsewhere frees this one.
        if (change.role && change.role !== "field" && change.role !== "skip" && m.role === change.role) return { ...m, role: change.role === "email" ? "skip" : "field" }
        return m
      }),
    )

  const problem = file ? mappingProblem(mapping) : null
  const built = file && !problem ? buildLeads(file.rows, mapping) : null

  async function save() {
    if (!file || !built || built.leads.length === 0 || !listName.trim()) return
    const columns = mapping.filter((m) => m.role === "field").map((m) => ({ key: m.key, label: m.label }))
    const totals: ImportTotals = { added: 0, alreadySaved: 0, alreadyUsers: 0, unsubscribed: 0, invalid: built.invalid, duplicates: built.duplicates }
    let listId: string | undefined
    setError(null)
    setSaving({ done: 0, total: built.leads.length })
    try {
      for (let i = 0; i < built.leads.length; i += LEAD_IMPORT_CHUNK) {
        const part = built.leads.slice(i, i + LEAD_IMPORT_CHUNK)
        const res = await fetch("/api/admin/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, listName: listName.trim(), fileName: file.name, columns, leads: part }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Couldn't save these leads")
        listId = data.listId
        totals.added += data.added
        totals.alreadySaved += data.alreadySaved
        totals.alreadyUsers += data.alreadyUsers
        totals.unsubscribed += data.unsubscribed
        totals.invalid += data.invalid
        setSaving({ done: i + part.length, total: built.leads.length })
      }
      setResult({ listName: listName.trim(), totals })
      reset()
      onSaved()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't save these leads"
      // Uploading again is safe: nobody is saved twice.
      setError(listId ? `${message.replace(/\.$/, "")}. Part of the file was saved; upload it again to add the rest.` : message)
    } finally {
      setSaving(null)
    }
  }

  const fields = mapping.filter((m) => m.role === "field")

  return (
    <AdminCard
      title="Upload leads"
      actions={
        file && !saving ? (
          <AdminButton variant="ghost" onClick={reset}>
            <X aria-hidden />
            Choose another file
          </AdminButton>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {result && (
          <div role="status" className="flex flex-col gap-2 rounded-control border border-success/30 bg-success-soft p-4 text-label text-foreground">
            <p className="font-semibold">
              Saved &ldquo;{result.listName}&rdquo;: {plural(result.totals.added, "new lead")}
              {result.totals.alreadySaved > 0 && `, ${count(result.totals.alreadySaved)} you already had`}.
            </p>
            {(result.totals.alreadyUsers > 0 || result.totals.invalid > 0 || result.totals.duplicates > 0 || result.totals.unsubscribed > 0) && (
              <ul className="list-disc pl-5 text-caption text-muted-foreground">
                {result.totals.alreadyUsers > 0 && <li>{plural(result.totals.alreadyUsers, "person", "people")} already use CarouseLabs, so they weren&apos;t added.</li>}
                {result.totals.invalid > 0 && <li>{plural(result.totals.invalid, "row")} had no real email address and were left out.</li>}
                {result.totals.duplicates > 0 && <li>{plural(result.totals.duplicates, "address", "addresses")} were in the file twice and were saved once.</li>}
                {result.totals.unsubscribed > 0 && <li>{plural(result.totals.unsubscribed, "lead")} unsubscribed before, so they won&apos;t be emailed.</li>}
              </ul>
            )}
            <Link href="/admin/broadcasts/writer" className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-brand hover:underline">
              <Sparkles className="size-3.5" aria-hidden />
              Write an email for them
            </Link>
          </div>
        )}

        {!file && (
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              void read(e.dataTransfer.files[0])
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-control border border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-brand bg-brand/5" : "border-border hover:border-brand/60"}`}
          >
            <FileUp className="size-6 text-muted-foreground" aria-hidden />
            <span className="text-label font-semibold text-foreground">Choose a CSV file, or drop it here</span>
            <span className="text-caption text-muted-foreground">One person per row, with a header row. Up to {count(LEAD_IMPORT_MAX_ROWS)} people a file.</span>
            <input ref={input} type="file" accept=".csv,text/csv" aria-label="CSV file" className="sr-only" onChange={(e) => void read(e.target.files?.[0])} />
          </label>
        )}

        {file && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="lead-list-name" className="text-caption font-semibold text-muted-foreground">
                Name this list
              </label>
              <AdminInput id="lead-list-name" value={listName} maxLength={120} onChange={(e) => setListName(e.target.value)} placeholder="e.g. Delhi founders, 24 Oct" className="w-full sm:w-96" />
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-caption font-semibold text-muted-foreground">
                What each column is <span className="font-normal">({file.name}, {plural(file.rows.length, "row")})</span>
              </p>
              <div className={tableCls.wrap}>
                <table className={tableCls.table}>
                  <thead>
                    <tr>
                      <th className={tableCls.th}>Column</th>
                      <th className={tableCls.th}>First rows</th>
                      <th className={tableCls.th}>Use as</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((m, i) => (
                      <tr key={i} className={tableCls.row}>
                        <td className={`${tableCls.td} font-medium`}>{m.label}</td>
                        <td className={`${tableCls.td} max-w-[16rem] truncate text-muted-foreground`}>
                          {file.rows
                            .slice(0, 3)
                            .map((r) => r[i])
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td className={tableCls.td}>
                          <div className="flex flex-wrap items-center gap-2">
                            <AdminSelect aria-label={`Use ${m.label} as`} value={m.role} onChange={(e) => setColumn(i, { role: e.target.value as ColumnRole })}>
                              {ROLES.map((r) => (
                                <option key={r.role} value={r.role}>
                                  {r.label}
                                </option>
                              ))}
                            </AdminSelect>
                            {m.role === "field" && (
                              <span className="inline-flex items-center gap-0.5 font-mono text-caption text-muted-foreground">
                                {"{{"}
                                <AdminInput
                                  aria-label={`Merge field for ${m.label}`}
                                  value={m.key}
                                  maxLength={40}
                                  onChange={(e) => setColumn(i, { key: e.target.value.replace(/[^A-Za-z0-9]/g, "") })}
                                  className="h-8 w-36 px-2 font-mono"
                                />
                                {"}}"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fields.length > 0 && !problem && (
                <p className="text-caption text-muted-foreground/80">
                  In the email, {fields.map((f) => `{{${f.key}}}`).join(", ")} become{fields.length === 1 ? "s" : ""} each person&apos;s value. Someone with that cell empty gets nothing there.
                </p>
              )}
            </div>

            {problem && <p className="text-caption text-danger">{problem}</p>}
            {built && (
              <p className="text-caption text-muted-foreground">
                {plural(built.leads.length, "person", "people")} to save
                {built.invalid > 0 && ` · ${plural(built.invalid, "row")} without a real email (left out)`}
                {built.duplicates > 0 && ` · ${plural(built.duplicates, "duplicate")} (saved once)`}. Anyone who already uses CarouseLabs is left out.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <AdminButton onClick={() => void save()} loading={!!saving} disabled={!built || built.leads.length === 0 || !listName.trim()}>
                {saving ? `Saving ${count(saving.done)} of ${count(saving.total)}…` : `Save ${built ? plural(built.leads.length, "lead") : "leads"}`}
              </AdminButton>
              {!listName.trim() && <span className="text-caption text-muted-foreground">Name the list to save it.</span>}
            </div>
          </>
        )}

        {error && <p className="text-caption text-danger">{error}</p>}
      </div>
    </AdminCard>
  )
}
