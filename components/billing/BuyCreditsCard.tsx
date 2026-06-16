"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { loadRazorpay } from "./razorpayCheckout"

const MIN_CREDITS = 5
const PRICE_PER_CREDIT = 2 // $

export function BuyCreditsCard({ email }: { email?: string }) {
  const router = useRouter()
  const [credits, setCredits] = useState(MIN_CREDITS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const total = credits * PRICE_PER_CREDIT

  async function handleBuy() {
    if (credits < MIN_CREDITS) {
      setError(`Minimum ${MIN_CREDITS} credits`)
      return
    }
    setLoading(true)
    setError(null)
    setDone(false)
    try {
      const Razorpay = await loadRazorpay()
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!key) throw new Error("Payments are not configured")

      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to start checkout")

      const rzp = new Razorpay({
        key,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "CarouseLabs",
        description: `${credits} extra credits`,
        theme: { color: "#1A1A1A" },
        prefill: email ? { email } : undefined,
        handler: async (response) => {
          const verify = await fetch("/api/billing/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          })
          setLoading(false)
          if (verify.ok) {
            // Credits are granted by the webhook — refresh shortly after.
            setDone(true)
            setTimeout(() => router.refresh(), 1500)
          } else {
            setError("Payment couldn't be verified. Contact support if you were charged.")
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC]">
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-medium text-[#1A1A1A]">Buy extra credits</p>
        <p className="text-[12px] text-[#9CA3AF]">
          ${PRICE_PER_CREDIT} per credit · minimum {MIN_CREDITS}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="number"
          min={MIN_CREDITS}
          value={credits}
          onChange={(e) => setCredits(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="w-24 px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F1EFE9] text-[14px] text-[#0A0A0A] tabular-nums focus:outline-none focus:border-[rgba(26,26,26,0.5)]"
        />
        <span className="text-[13px] text-[#6B7280]">
          = <span className="font-semibold text-[#0A0A0A]">${total.toLocaleString("en-US")}</span>
        </span>
        <button
          onClick={handleBuy}
          disabled={loading || credits < MIN_CREDITS}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.4} />}
          Buy credits
        </button>
      </div>

      {error && <p className="text-[12px] text-[rgba(239,68,68,0.9)]">{error}</p>}
      {done && (
        <p className="text-[12px] text-[#059669]">
          Payment successful! Your credits will appear in a moment.
        </p>
      )}
    </div>
  )
}
