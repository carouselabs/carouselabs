"use client"

import { useEffect, useState } from "react"
import { Copy, Check, Users, TrendingUp, Wallet, DollarSign, Info } from "lucide-react"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import { SavedToast } from "@/components/settings/SavedToast"

interface ReferralPayoutRow {
  id: string
  amount: number
  method: string | null
  createdAt: string
}

interface ReferralStats {
  referralCode: string
  referralLink: string
  totalReferred: number
  convertedToPaid: number
  stayedFree: number
  pendingBalance: number
  totalLifetimeEarned: number
  payoutMethod: string | null
  payoutDetails: string | null
  payouts: ReferralPayoutRow[]
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC]">
      <div className="flex items-center gap-2 text-[#9CA3AF]">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-[22px] font-bold text-[#0A0A0A] tabular-nums leading-none">{value}</p>
      {hint && <p className="text-[11px] text-[#9CA3AF]">{hint}</p>}
    </div>
  )
}

export default function ReferralsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)

  // Payout details form — seeded from stats once loaded, edited independently.
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "paypal">("paypal")
  const [payoutDetails, setPayoutDetails] = useState("")
  const [savingPayout, setSavingPayout] = useState(false)
  const [payoutError, setPayoutError] = useState<string | null>(null)
  const [payoutSaved, setPayoutSaved] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/referrals/me")
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load")
        if (!active) return
        const s = data as ReferralStats
        setStats(s)
        if (s.payoutMethod === "bank" || s.payoutMethod === "paypal") setPayoutMethod(s.payoutMethod)
        setPayoutDetails(s.payoutDetails ?? "")
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleCopy() {
    if (!stats) return
    await navigator.clipboard.writeText(stats.referralLink)
    setCopied(true)
  }

  async function handleSavePayoutDetails() {
    if (!payoutDetails.trim() || savingPayout) return
    setSavingPayout(true)
    setPayoutError(null)
    try {
      const res = await fetch("/api/referrals/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutMethod, payoutDetails: payoutDetails.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to save")
      setStats((prev) => (prev ? { ...prev, payoutMethod, payoutDetails: payoutDetails.trim() } : prev))
      setPayoutSaved(true)
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSavingPayout(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[64px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse" />
          ))}
        </div>
      ) : (
        stats && (
          <div className="flex flex-col gap-8">
            {/* Referral link */}
            <div className="flex flex-col gap-2">
              <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Your Referral Link</h2>
              <p className="text-[12.5px] text-[#9CA3AF]">
                Share this link — anyone who signs up through it gets attributed to you.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={stats.referralLink}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] truncate focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#000000] text-[13px] font-semibold text-white transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatTile
                icon={<Users size={14} strokeWidth={2} />}
                label="Total Referred"
                value={String(stats.totalReferred)}
              />
              <StatTile
                icon={<TrendingUp size={14} strokeWidth={2} />}
                label="Converted to Paid"
                value={String(stats.convertedToPaid)}
              />
              <StatTile
                icon={<Users size={14} strokeWidth={2} />}
                label="Stayed Free"
                value={String(stats.stayedFree)}
              />
              <StatTile
                icon={<Wallet size={14} strokeWidth={2} />}
                label="Pending Balance"
                value={fmtMoney(stats.pendingBalance)}
                hint="Awaiting payout"
              />
              <StatTile
                icon={<DollarSign size={14} strokeWidth={2} />}
                label="Lifetime Earned"
                value={fmtMoney(stats.totalLifetimeEarned)}
                hint="Paid + pending"
              />
            </div>

            {/* How payouts work */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(124,58,237,0.04)] border border-[rgba(124,58,237,0.18)]">
              <Info size={16} className="text-[#7C3AED] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[12.5px] text-[#4B5563] leading-[1.6]">
                <strong className="text-[#0A0A0A]">How payouts work:</strong> Once your pending
                commission reaches a reasonable amount, our team will reach out to arrange payment
                via bank transfer or PayPal. Payouts are processed manually — if you have questions
                about your balance, contact us.
              </p>
            </div>

            {/* Payout details */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Payout Details</h2>
                <p className="text-[12.5px] text-[#9CA3AF]">
                  {stats.pendingBalance > 0 && !stats.payoutDetails
                    ? "You have a pending balance — add your payout details so we know where to send it."
                    : "Optional — tell us how you'd like to be paid when it's time."}
                </p>
              </div>

              <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                    Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as "bank" | "paypal")}
                    className="w-full sm:w-48 px-3.5 py-2.5 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#0A0A0A] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                    {payoutMethod === "paypal" ? "PayPal Email" : "Bank Account Details"}
                  </label>
                  <textarea
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    rows={payoutMethod === "paypal" ? 1 : 3}
                    maxLength={2000}
                    placeholder={
                      payoutMethod === "paypal"
                        ? "you@example.com"
                        : "Account holder name, account/IBAN number, bank name, SWIFT/routing code…"
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E3DE] bg-white text-[13px] text-[#374151] leading-[1.55] resize-y placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
                  />
                </div>

                {payoutError && (
                  <p className="text-[12px] text-[rgba(239,68,68,0.9)]">{payoutError}</p>
                )}

                <button
                  onClick={handleSavePayoutDetails}
                  disabled={!payoutDetails.trim() || savingPayout}
                  className="self-start px-4 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#000000] text-[12px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingPayout ? "Saving…" : "Save"}
                </button>
                <p className="text-[11px] text-[#ADA99F]">
                  Only our team can see this — used solely to arrange your payout.
                </p>
              </div>
            </div>

            {/* Payout history */}
            <div className="flex flex-col gap-3">
              <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Payout History</h2>
              {stats.payouts.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF]">No payouts recorded yet.</p>
              ) : (
                <div className="rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] divide-y divide-[#E9E7E1]">
                  {stats.payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-[#0A0A0A]">{fmtMoney(p.amount)}</span>
                        <span className="text-[11px] text-[#9CA3AF]">
                          {fmtDate(p.createdAt)}
                          {p.method ? ` · ${p.method}` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      <SavedToast open={copied} onClose={() => setCopied(false)} message="Link copied!" />
      <SavedToast
        open={payoutSaved}
        onClose={() => setPayoutSaved(false)}
        message="Payout details saved"
      />
    </div>
  )
}
