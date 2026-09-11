"use client"

// /admin/referrals — list every referrer, and (in a detail overlay) their
// full commission + payout history plus a "Record Payout" action. Built as
// its own wider overlay rather than the shared Modal (max-w-md) so the
// commission table has room to breathe.
import { useCallback, useEffect, useState } from "react"
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
  pending: "bg-amber-500/15 text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  reversed: "bg-red-500/15 text-red-400",
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

  async function openDetail(userId: string) {
    setDetailUserId(userId)
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
    <div className="space-y-6">
      <AdminCard title={`Referrers (${rows.length})`}>
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
                  className={`${tableCls.row} cursor-pointer`}
                  onClick={() => void openDetail(r.id)}
                >
                  <td className={tableCls.td}>{r.name ?? "—"}</td>
                  <td className={tableCls.td}>{r.email}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{r.totalReferrals}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{fmtMoney(r.pendingCommission)}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{fmtMoney(r.totalPaid)}</td>
                  <td className={tableCls.td}>
                    {r.hasPayoutDetails ? (
                      <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                        On file
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[11px] font-medium text-[#8A8A8A]">
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
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          onClick={closeDetail}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3.5">
              <h3 className="text-[14px] font-semibold text-white">
                {detail?.referrer.name ?? detail?.referrer.email ?? "Referrer"}
              </h3>
              <button onClick={closeDetail} className="text-[#8A8A8A] hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {loadingDetail || !detail ? (
                <Spinner label="Loading detail…" />
              ) : (
                <>
                  <p className="text-[12.5px] text-[#8A8A8A]">{detail.referrer.email}</p>

                  {/* Payout details the referrer self-reported (Settings > Referrals) */}
                  <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4 space-y-2">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                      Payout Details
                    </span>
                    {detail.referrer.payoutMethod && detail.referrer.payoutDetails ? (
                      <div className="space-y-1">
                        <span className="inline-flex rounded-full bg-[#7C3AED]/15 px-2 py-0.5 text-[11px] font-semibold text-[#A78BFA]">
                          {PAYOUT_METHOD_LABEL[detail.referrer.payoutMethod] ?? detail.referrer.payoutMethod}
                        </span>
                        <p className="text-[13px] text-white whitespace-pre-wrap break-words">
                          {detail.referrer.payoutDetails}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[12.5px] text-[#6A6A6A]">
                        Not provided yet — this referrer hasn&apos;t added payout details in Settings.
                      </p>
                    )}
                  </div>

                  {/* Record payout */}
                  <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                        Record Payout
                      </span>
                      <span className="text-[12.5px] text-[#B0B0B0]">
                        Pending: {fmtMoney(detail.pendingBalance)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminInput
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Amount"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-32"
                      />
                      <AdminInput
                        placeholder="Method (e.g. PayPal, bank transfer)"
                        value={payoutMethod}
                        onChange={(e) => setPayoutMethod(e.target.value)}
                        className="flex-1 min-w-[160px]"
                      />
                      <AdminButton onClick={() => void recordPayout()} loading={recording}>
                        Record Payout
                      </AdminButton>
                    </div>
                    <p className="text-[11px] text-[#6A6A6A]">
                      Recording a payout marks ALL currently-pending commissions for this referrer as
                      paid, regardless of the amount entered here.
                    </p>
                  </div>

                  {/* Commission history */}
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
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
                                className={`${tableCls.td} tabular-nums ${c.status === "reversed" ? "line-through text-[#6A6A6A]" : ""}`}
                              >
                                {fmtMoney(c.amount)}
                              </td>
                              <td className={tableCls.td}>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[c.status]}`}
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
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
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
        </div>
      )}
    </div>
  )
}
