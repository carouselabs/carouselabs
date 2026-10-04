"use client"

// Engage → Free access: every grant an admin has made. Answers "who did I
// give access to, and until when?" — expiring soon first in its own tab.
import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { AdminButton, fmtDate } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { GRANT_PLATFORM_LABELS, type GrantPlatform } from "@/lib/engage/grants"
import { GrantAccessModal } from "./GrantAccessForm"
import { EmptyState, ErrorState, Pill, SkeletonBlock, Tabs, adminSend, fmtNumber, useAdminApi } from "./shared"

type Status = "active" | "expiring" | "pending" | "expired" | "revoked" | "all"

interface GrantRow {
  id: string
  email: string
  userId: string | null
  name: string | null
  startsAt: string
  endsAt: string | null
  reason: string
  grantedBy: string
  // Which extension it unlocks (absent from an older server: both).
  platform?: GrantPlatform
  createdAt: string
  revokedAt: string | null
  revokedBy: string | null
  revokeReason: string | null
  state: "active" | "scheduled" | "expired" | "revoked"
  pending: boolean
}

const TABS: { value: Status; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "expiring", label: "Ending in 14 days" },
  { value: "pending", label: "Waiting for sign-up" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
  { value: "all", label: "All" },
]

export function EngageGrantsTable() {
  const { toast } = useToast()
  const [status, setStatus] = useState<Status>("active")
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [revoking, setRevoking] = useState<GrantRow | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const { data, error, loading, reload } = useAdminApi<{ total: number; page: number; pageSize: number; grants: GrantRow[] }>(
    `/api/admin/engage/grants?status=${status}&page=${page}`,
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-white">Free access</h1>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">Unlimited Engage given by an admin, outside Lemon Squeezy.</p>
        </div>
        <AdminButton onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add user
        </AdminButton>
      </div>

      <Tabs<Status>
        label="Grant status"
        tabs={TABS}
        value={status}
        onChange={(s) => {
          setStatus(s)
          setPage(1)
        }}
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="h-11" />
          ))}
        </div>
      ) : data.grants.length === 0 ? (
        <EmptyState
          title={status === "active" ? "Nobody has free access right now" : "Nothing here"}
          body={status === "active" ? "Use Add user, or Grant free access on a user's page." : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-[#161616] text-[11px] uppercase tracking-wide text-[#8A8A8A]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Person</th>
                <th className="px-3 py-2.5 font-semibold">Until</th>
                <th className="px-3 py-2.5 font-semibold">Reason</th>
                <th className="px-3 py-2.5 font-semibold">Granted</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="text-[#D0D0D0]">
              {data.grants.map((g) => (
                <tr key={g.id} className="border-t border-[#232323] align-top">
                  <td className="px-4 py-2.5">
                    {g.userId ? (
                      <Link href={`/admin/engage/users/${g.userId}`} className="font-medium text-white hover:underline">
                        {g.name ?? g.email}
                      </Link>
                    ) : (
                      <span className="font-medium text-white">{g.email}</span>
                    )}
                    {g.name && <div className="text-[11.5px] text-[#8A8A8A]">{g.email}</div>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Pill>{GRANT_PLATFORM_LABELS[g.platform ?? "both"]}</Pill>
                      {g.pending && g.state === "active" && <Pill tone="amber">Waiting for sign-up</Pill>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {g.state === "revoked" ? (
                      <Pill tone="red">Revoked {fmtDate(g.revokedAt)}</Pill>
                    ) : g.state === "expired" ? (
                      <Pill>Ended {fmtDate(g.endsAt)}</Pill>
                    ) : g.endsAt ? (
                      fmtDate(g.endsAt)
                    ) : (
                      <Pill tone="violet">Lifetime</Pill>
                    )}
                  </td>
                  <td className="max-w-[340px] px-3 py-2.5 text-[#B0B0B0]">
                    {g.reason}
                    {g.revokeReason && <div className="text-[11.5px] text-red-300">Revoked: {g.revokeReason}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#B0B0B0]">
                    {fmtDate(g.createdAt)}
                    <div className="text-[11.5px] text-[#8A8A8A]">{g.grantedBy}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {g.state === "active" && (
                      <AdminButton variant="ghost" onClick={() => setRevoking(g)}>
                        Revoke
                      </AdminButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > data.pageSize && (
            <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-2.5 text-[12px] text-[#8A8A8A]">
              <span>{fmtNumber(data.total)} grants</span>
              <div className="flex gap-1">
                <AdminButton variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </AdminButton>
                <AdminButton variant="ghost" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
                  Next
                </AdminButton>
              </div>
            </div>
          )}
        </div>
      )}

      <GrantAccessModal
        open={adding}
        onClose={() => setAdding(false)}
        onDone={(message) => {
          setAdding(false)
          toast(message, "success")
          reload()
        }}
      />

      {revoking && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={() => setRevoking(null)}>
          <form
            role="dialog"
            aria-label="Revoke free access"
            className="w-full max-w-md space-y-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                await adminSend(`/api/admin/engage/grants/${revoking.id}`, "PATCH", { action: "revoke", reason })
                toast(`Free access for ${revoking.email} revoked`, "success")
                setRevoking(null)
                setReason("")
                reload()
              } catch (err) {
                toast(err instanceof Error ? err.message : "Couldn't revoke", "error")
              } finally {
                setBusy(false)
              }
            }}
          >
            <h3 className="text-[14px] font-semibold text-white">Revoke free access for {revoking.email}?</h3>
            <p className="text-[12.5px] text-[#B0B0B0]">It ends immediately. If they don&apos;t pay, they go back to the free plan.</p>
            <input
              required
              minLength={3}
              autoFocus
              aria-label="Reason"
              placeholder="Reason (kept in the audit log)"
              className="h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 text-[13px] text-white outline-none focus:border-[#7C3AED]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <AdminButton variant="secondary" onClick={() => setRevoking(null)}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" variant="danger" loading={busy}>
                Revoke now
              </AdminButton>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
