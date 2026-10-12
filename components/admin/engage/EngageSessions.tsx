"use client"

// Engage → Sessions: every browser signed in to an extension, across all
// users (/api/admin/engage/sessions): who, which extension and version, when
// it signed in and was last used. Sign one out with a reason (audited); they
// can sign in again, so pause their access to stop that.
import { useState } from "react"
import Link from "next/link"
import { AdminButton, AdminInput, AdminSelect, Modal, fmtDate, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { PLATFORM_LABELS } from "@/lib/engage/features"
import type { SessionRow } from "@/lib/engage/sessionQueries"
import { EmptyState, ErrorState, Pill, SkeletonBlock, adminSend, fmtNumber, fmtRelative, useAdminApi } from "./shared"

interface Page {
  rows: SessionRow[]
  total: number
  page: number
  pageSize: number
}

export function EngageSessions() {
  const { toast } = useToast()
  const [status, setStatus] = useState("active")
  const [platform, setPlatform] = useState("any")
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [signingOut, setSigningOut] = useState<SessionRow | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const params = new URLSearchParams({ status, platform, page: String(page) })
  if (search) params.set("q", search)
  const { data, error, loading, reload } = useAdminApi<Page>(`/api/admin/engage/sessions?${params}`)

  async function signOut() {
    if (!signingOut) return
    setBusy(true)
    setDialogError(null)
    try {
      await adminSend(`/api/admin/engage/sessions/${signingOut.id}`, "DELETE", { reason: reason.trim() })
      toast(`Signed out ${signingOut.email}'s browser`, "success")
      setSigningOut(null)
      setReason("")
      reload()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Couldn't sign it out")
    } finally {
      setBusy(false)
    }
  }

  const from = data ? (data.page - 1) * data.pageSize + 1 : 0
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div>
        <h2 className="text-lead font-semibold tracking-tight text-foreground">Sessions</h2>
        <p className="mt-0.5 text-caption text-muted-foreground">Every browser signed in to CarouseLabs Engage, for LinkedIn or X.</p>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setSearch(q.trim())
        }}
      >
        <AdminInput aria-label="Search by email" placeholder="Search by email" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-[240px]" />
        <AdminSelect
          aria-label="Status"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="active">Signed in</option>
          <option value="signed_out">Signed out</option>
          <option value="all">All</option>
        </AdminSelect>
        <AdminSelect
          aria-label="Extension"
          value={platform}
          onChange={(e) => {
            setPage(1)
            setPlatform(e.target.value)
          }}
        >
          <option value="any">Any extension</option>
          <option value="linkedin">LinkedIn</option>
          <option value="x">X</option>
        </AdminSelect>
        <AdminButton type="submit" variant="secondary">
          Search
        </AdminButton>
      </form>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || loading ? (
        <SkeletonBlock className="h-[300px]" />
      ) : data.rows.length === 0 ? (
        <EmptyState title="No sessions match" />
      ) : (
        <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-caption" aria-label="Sessions">
            <thead>
              <tr className="text-caption font-semibold text-muted-foreground">
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Extension</th>
                <th className="px-4 py-2.5">Browser</th>
                <th className="px-4 py-2.5">Signed in</th>
                <th className="px-4 py-2.5">Last used</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              {data.rows.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/engage/users/${s.userId}`} className="text-brand hover:underline">
                      {s.email}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {PLATFORM_LABELS[s.platform]} <span className="tabular-nums text-muted-foreground">{s.version ?? ""}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.device ?? "Browser"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(s.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground" title={fmtDateTime(s.lastUsedAt)}>
                    {fmtRelative(s.lastUsedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {s.revokedAt ? (
                      <Pill>Signed out {fmtDate(s.revokedAt)}</Pill>
                    ) : (
                      <AdminButton
                        variant="ghost"
                        onClick={() => {
                          setSigningOut(s)
                          setReason("")
                          setDialogError(null)
                        }}
                      >
                        Sign out
                      </AdminButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-caption text-muted-foreground">
            <span className="tabular-nums">
              {fmtNumber(from)}–{fmtNumber(to)} of {fmtNumber(data.total)}
            </span>
            <div className="flex gap-1">
              <AdminButton variant="ghost" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>
                Previous
              </AdminButton>
              <AdminButton variant="ghost" disabled={to >= data.total} onClick={() => setPage(data.page + 1)}>
                Next
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      <Modal open={signingOut !== null} onClose={() => !busy && setSigningOut(null)} title="Sign out this browser?">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (reason.trim().length >= 3) void signOut()
          }}
        >
          <p className="text-caption leading-relaxed text-muted-foreground">
            {signingOut?.email}&apos;s {signingOut ? PLATFORM_LABELS[signingOut.platform] : ""} extension in {signingOut?.device ?? "this browser"} is signed
            out at once. They can sign in again; pause their access to stop that.
          </p>
          <label className="block space-y-1">
            <span className="block text-caption text-muted-foreground">Reason (for the audit log)</span>
            <AdminInput className="w-full" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lost laptop" />
          </label>
          {dialogError && (
            <p role="alert" className="text-caption text-danger">
              {dialogError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <AdminButton type="button" variant="secondary" onClick={() => setSigningOut(null)} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="danger" loading={busy} disabled={reason.trim().length < 3}>
              Sign out
            </AdminButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
