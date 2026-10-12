"use client"

// Engage → Audit log: every Engage admin change, newest first, with what it
// was, what it became and why. Read-only.
import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminButton, AdminInput, fmtDateTime } from "@/components/admin/ui"
import { CsvLink, EmptyState, ErrorState, SkeletonBlock, fmtNumber, useAdminApi } from "./shared"

interface Entry {
  id: string
  adminEmail: string
  action: string
  targetUserId: string | null
  targetEmail: string | null
  details: string
  oldValue: unknown
  newValue: unknown
  reason: string | null
  ipAddress: string | null
  createdAt: string
}

function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  const text = typeof value === "object" ? JSON.stringify(value) : String(value)
  return <code className="break-all rounded bg-background px-1.5 py-0.5 font-mono text-caption text-foreground/90">{text === "{}" ? "none" : text}</code>
}

export function EngageAuditTable() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [q])
  const { data, error, loading, reload } = useAdminApi<{ total: number; page: number; pageSize: number; entries: Entry[] }>(
    `/api/admin/engage/audit?page=${page}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lead font-semibold tracking-tight text-foreground">Engage audit log</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">Every change an admin made to someone&apos;s Engage access. Entries can&apos;t be edited or deleted.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminInput aria-label="Filter by user email" className="w-[260px]" placeholder="Filter by user email" value={q} onChange={(e) => setQ(e.target.value)} />
          <CsvLink type="audit" query={query ? `q=${encodeURIComponent(query)}` : ""} />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonBlock key={i} className="h-12" />
          ))}
        </div>
      ) : data.entries.length === 0 ? (
        <EmptyState title={query ? "No changes for this user" : "No Engage changes yet"} />
      ) : (
        <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-caption">
            <thead className="bg-background text-caption text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-3 py-2.5 font-semibold">Change</th>
                <th className="px-3 py-2.5 font-semibold">User</th>
                <th className="px-3 py-2.5 font-semibold">Before → after</th>
                <th className="px-4 py-2.5 font-semibold">Admin</th>
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              {data.entries.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDateTime(e.createdAt)}</td>
                  <td className="max-w-[320px] px-3 py-2.5">
                    <div className="text-foreground">{e.details}</div>
                    {e.reason && <div className="text-caption text-muted-foreground">“{e.reason}”</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    {e.targetUserId ? (
                      <Link href={`/admin/engage/users/${e.targetUserId}`} className="hover:underline">
                        {e.targetEmail ?? e.targetUserId}
                      </Link>
                    ) : (
                      e.targetEmail ?? "—"
                    )}
                  </td>
                  <td className="max-w-[360px] px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Value value={e.oldValue} />
                      <span aria-hidden className="text-muted-foreground">
                        →
                      </span>
                      <span className="sr-only">became</span>
                      <Value value={e.newValue} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {e.adminEmail}
                    {e.ipAddress && <div className="text-caption text-muted-foreground">{e.ipAddress}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-caption text-muted-foreground">
            <span>{fmtNumber(data.total)} changes</span>
            <div className="flex gap-1">
              <AdminButton variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </AdminButton>
              <AdminButton variant="ghost" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
                Next
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
