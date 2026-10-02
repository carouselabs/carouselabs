"use client"

// Engage → Audit log: every Engage admin change, newest first, with what it
// was, what it became and why. Read-only.
import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminButton, AdminInput, fmtDateTime } from "@/components/admin/ui"
import { EmptyState, ErrorState, SkeletonBlock, fmtNumber, useAdminApi } from "./shared"

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
  if (value === null || value === undefined) return <span className="text-[#8A8A8A]">—</span>
  const text = typeof value === "object" ? JSON.stringify(value) : String(value)
  return <code className="break-all rounded bg-[#141414] px-1.5 py-0.5 font-mono text-[11px] text-[#D0D0D0]">{text === "{}" ? "none" : text}</code>
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
          <h1 className="text-[18px] font-semibold tracking-tight text-white">Engage audit log</h1>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">Every change an admin made to someone&apos;s Engage access. Entries can&apos;t be edited or deleted.</p>
        </div>
        <AdminInput aria-label="Filter by user email" className="w-[260px]" placeholder="Filter by user email" value={q} onChange={(e) => setQ(e.target.value)} />
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
        <div className="overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-[#161616] text-[11px] uppercase tracking-wide text-[#8A8A8A]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-3 py-2.5 font-semibold">Change</th>
                <th className="px-3 py-2.5 font-semibold">User</th>
                <th className="px-3 py-2.5 font-semibold">Before → after</th>
                <th className="px-4 py-2.5 font-semibold">Admin</th>
              </tr>
            </thead>
            <tbody className="text-[#D0D0D0]">
              {data.entries.map((e) => (
                <tr key={e.id} className="border-t border-[#232323] align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[#B0B0B0]">{fmtDateTime(e.createdAt)}</td>
                  <td className="max-w-[320px] px-3 py-2.5">
                    <div className="text-white">{e.details}</div>
                    {e.reason && <div className="text-[11.5px] text-[#8A8A8A]">“{e.reason}”</div>}
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
                      <span aria-hidden className="text-[#8A8A8A]">
                        →
                      </span>
                      <span className="sr-only">became</span>
                      <Value value={e.newValue} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[#B0B0B0]">
                    {e.adminEmail}
                    {e.ipAddress && <div className="text-[11.5px] text-[#8A8A8A]">{e.ipAddress}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-2.5 text-[12px] text-[#8A8A8A]">
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
