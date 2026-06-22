"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"
import { loadRazorpay } from "./razorpayCheckout"

export function UpgradeButton({ email }: { email?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const Razorpay = await loadRazorpay()
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!key) throw new Error("Payments are not configured")

      const res = await fetch("/api/billing/create-subscription", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to start checkout")

      const rzp = new Razorpay({
        key,
        subscription_id: data.subscriptionId,
        name: "CarouseLabs Pro",
        description: "$24/month — 30 credits",
        theme: { color: "#1A1A1A" },
        prefill: email ? { email } : undefined,
        handler: async (response) => {
          const verify = await fetch("/api/billing/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          })
          if (verify.ok) {
            router.refresh()
          } else {
            setError("Payment couldn't be verified. Contact support if you were charged.")
            setLoading(false)
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
    <div className="flex flex-col gap-2">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={2} />}
        Upgrade to Pro · $24/mo
      </button>
      {error && <p className="text-[12px] text-[rgba(239,68,68,0.9)]">{error}</p>}
    </div>
  )
}
