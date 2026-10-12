"use client"

import { useEffect, useState } from "react"
import { Copy, Check, Users, TrendingUp, Wallet, DollarSign, Info } from "lucide-react"
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { SettingsSection } from "@/components/settings/SettingsSection"
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
    <div className="flex flex-col gap-2 p-4 rounded-control border border-border bg-surface">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-caption font-medium">{label}</span>
      </div>
      <p className="text-title-sm font-bold text-foreground tabular-nums leading-none">{value}</p>
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <SettingsHeader />

      {error && (
        <div className="px-4 py-3 rounded-control bg-danger-soft border border-danger/25 text-label text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[64px] rounded-control bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        stats && (
          <div className="flex flex-col gap-8">
            {/* Referral link */}
            <SettingsSection title="Your Referral Link" description="Share this link — anyone who signs up through it gets attributed to you.">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={stats.referralLink}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-control border border-border bg-surface text-label text-foreground truncate focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-control bg-primary hover:bg-primary-hover text-label font-semibold text-white transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </SettingsSection>

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
            <div className="flex items-start gap-3 p-4 rounded-control bg-brand-soft border border-brand/25">
              <Info size={16} className="text-brand flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-caption text-muted-foreground leading-[1.6]">
                <strong className="text-foreground">How payouts work:</strong> Once your pending
                commission reaches a reasonable amount, our team will reach out to arrange payment
                via bank transfer or PayPal. Payouts are processed manually — if you have questions
                about your balance, contact us.
              </p>
            </div>

            {/* Payout details */}
            <SettingsSection title="Payout Details" description={stats.pendingBalance > 0 && !stats.payoutDetails
                    ? "You have a pending balance — add your payout details so we know where to send it."
                    : "Optional — tell us how you'd like to be paid when it's time."}>
              <div className="flex flex-col gap-3 p-4 rounded-control border border-border bg-surface">
                <div className="flex flex-col gap-1.5">
                  <label className="text-caption font-medium text-muted-foreground">
                    Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as "bank" | "paypal")}
                    className="w-full sm:w-48 px-3.5 py-2.5 rounded-control-sm border border-border bg-surface-raised text-label text-foreground focus:outline-none focus:border-foreground transition-colors"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-caption font-medium text-muted-foreground">
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
                    className="w-full px-3.5 py-2.5 rounded-control-sm border border-border bg-surface-raised text-label text-foreground leading-[1.55] resize-y placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>

                {payoutError && (
                  <p className="text-caption text-danger">{payoutError}</p>
                )}

                <button
                  onClick={handleSavePayoutDetails}
                  disabled={!payoutDetails.trim() || savingPayout}
                  className="self-start px-4 py-2 rounded-control-sm bg-primary hover:bg-primary-hover text-caption font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingPayout ? "Saving…" : "Save"}
                </button>
                <p className="text-caption text-muted-foreground">
                  Only our team can see this — used solely to arrange your payout.
                </p>
              </div>
            </SettingsSection>

            {/* Payout history */}
            <SettingsSection title="Payout History">
{stats.payouts.length === 0 ? (
                <p className="text-label text-muted-foreground">No payouts recorded yet.</p>
              ) : (
                <div className="rounded-control border border-border bg-surface divide-y divide-border">
                  {stats.payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-label font-medium text-foreground">{fmtMoney(p.amount)}</span>
                        <span className="text-caption text-muted-foreground">
                          {fmtDate(p.createdAt)}
                          {p.method ? ` · ${p.method}` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SettingsSection>
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
