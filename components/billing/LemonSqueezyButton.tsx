"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { Loader2, Sparkles } from "lucide-react"
import { PRO_PLAN, GROWTH_PLAN } from "@/lib/plans"

// lemon.js attaches a global once loaded.
declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (opts: { eventHandler: (event: { event: string }) => void }) => void
      Url: { Open: (url: string) => void; Close: () => void }
    }
    createLemonSqueezy?: () => void
    // X (Twitter) Ads pixel — attached by the base script in app/layout.tsx.
    twq: (...args: unknown[]) => void
  }
}

export function LemonSqueezyButton({
  label = "Upgrade to Pro · $24.99/mo",
  variant = "purple",
  plan = "pro",
}: {
  email?: string
  label?: string
  variant?: "purple" | "amber"
  // Defaults to the Pro checkout; pass NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL
  // to point this same button at the Growth variant instead.
  checkoutUrl?: string
  // Which plan this button purchases — determines the value reported on the
  // X Ads Purchase conversion event fired from Checkout.Success below.
  plan?: "pro" | "growth"
}) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const ls = window.LemonSqueezy
      if (!ready || !ls) throw new Error("Checkout is still loading, try again")
      const response = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: plan }), signal: AbortSignal.timeout(15000),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Checkout unavailable")
      ls.Url.Open(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Script
        src="https://assets.lemonsqueezy.com/lemon.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Initialise the overlay and refresh the page once payment succeeds.
          window.createLemonSqueezy?.()
          window.LemonSqueezy?.Setup({
            eventHandler: (event) => {
              if (event.event === "Checkout.Success") {
                // Fire the X Ads Purchase conversion right here — this is the
                // only client-side signal we get that checkout succeeded.
                // Plan activation itself still happens server-side via the
                // Lemon Squeezy webhook; this just reports the conversion.
                if (typeof window.twq === "function") {
                  window.twq("event", "tw-recx3-recxe", {
                    value: plan === "growth" ? GROWTH_PLAN.price : PRO_PLAN.price,
                    currency: "USD",
                  })
                }
                // Webhook flips the plan to PRO/GROWTH; refresh to reflect it.
                setTimeout(() => router.refresh(), 1500)
                setLoading(false)
              }
              if (event.event === "Checkout.Closed") setLoading(false)
            },
          })
          setReady(true)
        }}
      />
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={[
          "self-start inline-flex h-11 w-full items-center justify-center gap-2 rounded-control px-5 text-label font-semibold text-white transition-colors duration-(--motion-fast) disabled:opacity-60",
          variant === "amber"
            ? "bg-warning hover:bg-warning/90"
            : "bg-brand hover:bg-brand-hover",
        ].join(" ")}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Sparkles size={14} strokeWidth={2} aria-hidden />
        )}
        {label}
      </button>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  )
}
