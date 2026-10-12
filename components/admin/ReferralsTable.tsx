"use client"

// /admin/referrals — every referrer in a list, and the chosen one's full
// commission + payout history plus a "Record Payout" action in a detail panel
// beside it (below it on narrower screens).
import { useCallback, useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, Spinner, tableCls, fmtDate } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

interface ReferrerRow {
  id: string
  name: string | null
  email: string
  totalReferrals: number
  pendingCommission: number
  totalPaid: number
  hasPayoutDetails: boolean
}

interface CommissionRow {
  id: string
  sourceOrderId: string
  sourceEvent: string
  amount: number
  status: "pending" | "paid" | "reversed"
  createdAt: string
  paidAt: string | null
  reversedReason: string | null
}

interface PayoutRow {
  id: string
  amount: number
  method: string | null
  paidBy: string
  createdAt: string
}

interface ReferrerDetail {
  referrer: {
    id: string
    name: string | null
    email: string
    payoutMethod: string | null
    payoutDetails: string | null
  }
  pendingBalance: number
  commissions: CommissionRow[]
  payouts: PayoutRow[]
}

const PAYOUT_METHOD_LABEL: Record<string, string> = {
  bank: "Bank Transfer",
  paypal: "PayPal",
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`
}

const STATUS_STYLE: Record<CommissionRow["status"], string> = {
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  reversed: "bg-danger/15 text-danger",
}

export function ReferralsTable() {
  const { toast } = useToast()
  const [rows, setRows] = useState<ReferrerRow[] | null>(null)

  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ReferrerDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [payoutAmount, setPayoutAmount] = useState("")
  const [payoutMethod, setPayoutMethod] = useState("")
  const [recording, setRecording] = useState(false)

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/referrals")
      if (!res.ok) throw new Error()
      setRows((await res.json()).referrers)
    } catch {
      setRows([])
      toast("Failed to load referrers", "error")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // loadList is also called after a successful payout to refresh, so it
  // can't be inlined as a .then() chain without duplicating fetch logic.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadList(), [loadList])

  // Below the two-column layout the panel sits under the list — bring it into view.
  const detailRef = useRef<HTMLElement>(null)

  async function openDetail(userId: string) {
    setDetailUserId(userId)
    if (!window.matchMedia("(min-width: 80rem)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/referrals/${userId}`)
      if (!res.ok) throw new Error()
      const data: ReferrerDetail = await res.json()
      setDetail(data)
      setPayoutAmount(data.pendingBalance > 0 ? data.pendingBalance.toFixed(2) : "")
      setPayoutMethod("")
    } catch {
      toast("Failed to load referrer detail", "error")
      setDetailUserId(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeDetail() {
    setDetailUserId(null)
    setDetail(null)
  }

  async function recordPayout() {
    if (!detailUserId) return
    const amount = Number(payoutAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid payout amount", "error")
      return
    }
    setRecording(true)
    try {
      const res = await fetch(`/api/admin/referrals/${detailUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: payoutMethod || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to record payout")
      toast(`Recorded payout of ${fmtMoney(amount)}`, "success")
      await Promise.all([openDetail(detailUserId), loadList()])
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to record payout", "error")
    } finally {
      setRecording(false)
    }
  }

  if (rows === null) return <Spinner label="Loading referrers…" />

  return (
    <div className={`grid gap-6 ${detailUserId ? "xl:grid-cols-[minmax(0,1fr)_34rem]" : ""}`}>
      <AdminCard title={`Referrers (${rows.length})`} className="min-w-0 self-start">
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Name</th>
                <th className={tableCls.th}>Email</th>
                <th className={tableCls.th}>Referrals</th>
                <th className={tableCls.th}>Pending</th>
                <th className={tableCls.th}>Paid</th>
                <th className={tableCls.th}>Payout Info</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className={tableCls.td} colSpan={6}>
                    No referrals yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  aria-current={detailUserId === r.id || undefined}
                  className={`${tableCls.row} cursor-pointer ${detailUserId === r.id ? "bg-brand-soft/50" : ""}`}
                  onClick={() => void openDetail(r.id)}
                >
                  <td className={tableCls.td}>{r.name ?? "—"}</td>
                  <td className={tableCls.td}>
                    {/* The row opens on click; the email is its keyboard way in. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void openDetail(r.id)
                      }}
                      className="rounded-detail font-medium text-foreground underline-offset-4 hover:text-brand hover:underline"
                    >
                      {r.email}
                    </button>
                  </td>
                  <td className={`${tableCls.td} tabular-nums`}>{r.totalReferrals}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{fmtMoney(r.pendingCommission)}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{fmtMoney(r.totalPaid)}</td>
                  <td className={tableCls.td}>
                    {r.hasPayoutDetails ? (
                      <span className="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-caption font-semibold text-success">
                        On file
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-raised px-2 py-0.5 text-caption font-medium text-muted-foreground">
                        Not set
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {detailUserId && (
        <aside
          ref={detailRef}
          aria-labelledby="referrer-detail-title"
          className="min-w-0 self-start rounded-card border border-border bg-surface shadow-card xl:sticky xl:top-0 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto"
        >
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <h2 id="referrer-detail-title" className="text-body font-semibold text-foreground">
                {detail?.referrer.name ?? detail?.referrer.email ?? "Referrer"}
              </h2>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-control-sm text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {loadingDetail || !detail ? (
                <Spinner label="Loading detail…" />
              ) : (
                <>
                  <p className="text-caption text-muted-foreground">{detail.referrer.email}</p>

                  {/* Payout details the referrer self-reported (Settings > Referrals) */}
                  <div className="rounded-control-sm border border-border bg-background p-4 space-y-2">
                    <span className="text-caption font-semibold text-muted-foreground">
                      Payout Details
                    </span>
                    {detail.referrer.payoutMethod && detail.referrer.payoutDetails ? (
                      <div className="space-y-1">
                        <span className="inline-flex rounded-full bg-brand/15 px-2 py-0.5 text-caption font-semibold text-brand">
                          {PAYOUT_METHOD_LABEL[detail.referrer.payoutMethod] ?? detail.referrer.payoutMethod}
                        </span>
                        <p className="text-label text-foreground whitespace-pre-wrap break-words">
                          {detail.referrer.payoutDetails}
                        </p>
                      </div>
                    ) : (
                      <p className="text-caption text-muted-foreground/80">
                        Not provided yet — this referrer hasn&apos;t added payout details in Settings.
                      </p>
                    )}
                  </div>

                  {/* Record payout */}
                  <div className="rounded-control-sm border border-border bg-background p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-semibold text-muted-foreground">
                        Record Payout
                      </span>
                      <span className="text-caption text-muted-foreground">
                        Pending: {fmtMoney(detail.pendingBalance)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminInput
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Amount"
                        aria-label="Amount"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-32"
                      />
                      <AdminInput
                        placeholder="Method (e.g. PayPal, bank transfer)"
                        aria-label="Method (e.g. PayPal, bank transfer)"
                        value={payoutMethod}
                        onChange={(e) => setPayoutMethod(e.target.value)}
                        className="flex-1 min-w-[160px]"
                      />
                      <AdminButton onClick={() => void recordPayout()} loading={recording}>
                        Record Payout
                      </AdminButton>
                    </div>
                    <p className="text-caption text-muted-foreground/80">
                      Recording a payout marks ALL currently-pending commissions for this referrer as
                      paid, regardless of the amount entered here.
                    </p>
                  </div>

                  {/* Commission history */}
                  <div className="space-y-2">
                    <p className="text-caption font-semibold text-muted-foreground">
                      Commission History
                    </p>
                    <div className={tableCls.wrap}>
                      <table className={tableCls.table}>
                        <thead>
                          <tr>
                            <th className={tableCls.th}>Date</th>
                            <th className={tableCls.th}>Event</th>
                            <th className={tableCls.th}>Amount</th>
                            <th className={tableCls.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.commissions.length === 0 && (
                            <tr>
                              <td className={tableCls.td} colSpan={4}>
                                No commissions yet.
                              </td>
                            </tr>
                          )}
                          {detail.commissions.map((c) => (
                            <tr key={c.id} className={tableCls.row}>
                              <td className={tableCls.td}>{fmtDate(c.createdAt)}</td>
                              <td className={tableCls.td}>{c.sourceEvent}</td>
                              <td
                                className={`${tableCls.td} tabular-nums ${c.status === "reversed" ? "line-through text-muted-foreground/80" : ""}`}
                              >
                                {fmtMoney(c.amount)}
                              </td>
                              <td className={tableCls.td}>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-caption font-semibold ${STATUS_STYLE[c.status]}`}
                                  title={c.reversedReason ?? undefined}
                                >
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payout history */}
                  <div className="space-y-2">
                    <p className="text-caption font-semibold text-muted-foreground">
                      Payout History
                    </p>
                    <div className={tableCls.wrap}>
                      <table className={tableCls.table}>
                        <thead>
                          <tr>
                            <th className={tableCls.th}>Date</th>
                            <th className={tableCls.th}>Amount</th>
                            <th className={tableCls.th}>Method</th>
                            <th className={tableCls.th}>Recorded By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.payouts.length === 0 && (
                            <tr>
                              <td className={tableCls.td} colSpan={4}>
                                No payouts recorded yet.
                              </td>
                            </tr>
                          )}
                          {detail.payouts.map((p) => (
                            <tr key={p.id} className={tableCls.row}>
                              <td className={tableCls.td}>{fmtDate(p.createdAt)}</td>
                              <td className={`${tableCls.td} tabular-nums`}>{fmtMoney(p.amount)}</td>
                              <td className={tableCls.td}>{p.method ?? "—"}</td>
                              <td className={tableCls.td}>{p.paidBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
