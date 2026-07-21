"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { Loader2, Zap } from "lucide-react"

const MIN_CREDITS = 100
const MAX_CREDITS = 5000
const DOLLARS_PER_100 = 2
const QUICK_AMOUNTS = [100, 200, 300, 500, 1000, 2000, 5000]

function validate(credits: number): string | null {
  if (credits < MIN_CREDITS) return "Minimum top-up is 100 credits ($2)"
  if (credits > MAX_CREDITS) return "Maximum top-up is 5,000 credits ($100)"
  if (credits % 100 !== 0) return "Amount must be a multiple of 100 (e.g. 100, 200, 300...)"
  return null
}

// Credit top-up purchase via the Lemon Squeezy "Pay What You Want" product,
// opened as an overlay modal (same lemon.js pattern as LemonSqueezyButton —
// the window.LemonSqueezy global is declared there). The chosen amount
// pre-fills the checkout's suggested price; the webhook derives the credits
// to grant from the amount actually paid, so the checkout price — not this
// UI — is authoritative.
export function TopUpCredits({
  extraCredits,
  extraCreditsExpiry,
  userId,
  plan,
}: {
  extraCredits: number
  extraCreditsExpiry: string | null // ISO date
  userId: string
  plan: "FREE" | "PRO" | "GROWTH"
}) {
  const router = useRouter()
  const [input, setInput] = useState("500")
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // The credits actually granted arrive via the order_created webhook, which
  // can land seconds after lemon.js fires Checkout.Success. A single delayed
  // router.refresh() races the webhook and loses whenever delivery is slow,
  // leaving a stale balance on screen. Instead, poll /api/me until the extra
  // balance changes from what this page rendered, then refresh once.
  //
  // Baseline lives in a ref (not the Setup() closure) so repeat top-ups in
  // one session compare against the latest rendered balance, normalized with
  // the same expiry rule /api/me applies so the values are comparable.
  const validExtras =
    extraCreditsExpiry && new Date(extraCreditsExpiry).getTime() <= Date.now() ? 0 : extraCredits
  const baselineExtras = useRef(validExtras)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    baselineExtras.current = validExtras
  }, [validExtras])
  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current)
    },
    []
  )

  function pollForGrantedCredits(attempt = 0) {
    const MAX_ATTEMPTS = 15 // ~30s of polling before giving up
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ extraCredits: number }>) : null))
      .then((me) => {
        if (me && me.extraCredits !== baselineExtras.current) {
          router.refresh()
          return
        }
        if (attempt >= MAX_ATTEMPTS) {
          // Webhook never showed up in time — refresh anyway so at least any
          // other server-side changes appear.
          router.refresh()
          return
        }
        pollTimer.current = setTimeout(() => pollForGrantedCredits(attempt + 1), 2000)
      })
      .catch(() => {
        if (attempt < MAX_ATTEMPTS) {
          pollTimer.current = setTimeout(() => pollForGrantedCredits(attempt + 1), 2000)
        }
      })
  }

  // Top-ups only make sense on top of a paid monthly allowance.
  if (plan !== "PRO" && plan !== "GROWTH") return null

  const credits = /^\d+$/.test(input.trim()) ? parseInt(input.trim(), 10) : NaN
  const error = Number.isNaN(credits)
    ? input.trim() === ""
      ? null
      : "Enter a number of credits (multiples of 100)"
    : validate(credits)
  const isValid = !Number.isNaN(credits) && error === null
  const priceDollars = isValid ? (credits / 100) * DOLLARS_PER_100 : null

  const expiry = extraCreditsExpiry ? new Date(extraCreditsExpiry) : null
  const hasValidExtras = extraCredits > 0 && (!expiry || expiry.getTime() > Date.now())

  function handleTopUp() {
    if (!isValid) return
    setCheckoutError(null)
    const base = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TOPUP_CHECKOUT_URL
    if (!base) {
      setCheckoutError("Payments are not configured")
      return
    }
    const ls = window.LemonSqueezy
    if (!ready || !ls) {
      setCheckoutError("Checkout is still loading, try again")
      return
    }
    const priceInCents = (credits / 100) * DOLLARS_PER_100 * 100
    // embed=1 → overlay; media=0&logo=0 → minimal chrome.
    const checkoutUrl = `${base}?embed=1&media=0&logo=0&checkout[custom][user_id]=${userId}&checkout[suggested_price]=${priceInCents}`
    setLoading(true)
    ls.Url.Open(checkoutUrl)
  }

  return (
    <div className="flex flex-col gap-3">
      <Script
        src="https://assets.lemonsqueezy.com/lemon.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.createLemonSqueezy?.()
          window.LemonSqueezy?.Setup({
            eventHandler: (event) => {
              if (event.event === "Checkout.Success") {
                setLoading(false)
                pollForGrantedCredits()
              }
              if (event.event === "Checkout.Closed") {
                setLoading(false)
                router.refresh()
              }
            },
          })
          setReady(true)
        }}
      />
      <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Top Up Credits</h2>
      <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5 flex flex-col gap-4">
        <p className="text-[12.5px] text-[#6B7280]">
          $2 per 100 credits · Expires 2 months after purchase
        </p>

        {hasValidExtras && (
          <div className="px-4 py-2.5 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/20 text-[12.5px] text-[#6D28D9]">
            You currently have <strong>{extraCredits.toLocaleString("en-US")}</strong> extra credits
            {expiry
              ? ` expiring on ${expiry.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`
              : ""}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setInput(String(amount))}
              className={[
                "px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold tabular-nums border transition-colors",
                credits === amount
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-[#E5E3DE] text-[#4B5563] hover:border-[#D1D5DB] hover:bg-[#F4F2EC]",
              ].join(" ")}
            >
              {amount.toLocaleString("en-US")}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="topup-amount" className="text-[12px] text-[#6B7280]">
            Enter amount (multiples of 100)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="topup-amount"
              type="text"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 500"
              className="w-32 px-3 py-2 rounded-lg border border-[#E5E3DE] bg-white text-[13px] tabular-nums text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
            {isValid && (
              <span className="text-[13px] text-[#4B5563] tabular-nums">
                {credits.toLocaleString("en-US")} credits ={" "}
                <strong className="text-[#0A0A0A]">${priceDollars!.toFixed(2)}</strong>
              </span>
            )}
          </div>
          {error && <p className="text-[12px] text-[rgba(239,68,68,0.9)]">{error}</p>}
        </div>

        <button
          onClick={handleTopUp}
          disabled={!isValid || loading}
          className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Top Up Now
        </button>
        {checkoutError && (
          <p className="text-[12px] text-[rgba(239,68,68,0.9)]">{checkoutError}</p>
        )}
        <p className="text-[11px] text-[#9CA3AF] leading-snug">
          Checkout opens right here — credits are added to your account automatically after
          payment.
        </p>
      </div>
    </div>
  )
}
