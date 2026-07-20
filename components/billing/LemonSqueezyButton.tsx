"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { Loader2, Sparkles } from "lucide-react"

// lemon.js attaches a global once loaded.
declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (opts: { eventHandler: (event: { event: string }) => void }) => void
      Url: { Open: (url: string) => void; Close: () => void }
    }
    createLemonSqueezy?: () => void
  }
}

export function LemonSqueezyButton({ email }: { email?: string }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildCheckoutUrl(): string {
    const base = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL
    if (!base) throw new Error("Payments are not configured")
    // embed=1 → overlay; media=0&logo=0 → minimal chrome.
    let url = `${base}?embed=1&media=0&logo=0`
    if (email) url += `&checkout[email]=${encodeURIComponent(email)}`
    return url
  }

  function handleUpgrade() {
    setError(null)
    try {
      const url = buildCheckoutUrl()
      const ls = window.LemonSqueezy
      if (!ready || !ls) throw new Error("Checkout is still loading, try again")
      setLoading(true)
      ls.Url.Open(url)
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
                // Webhook flips the plan to PRO; refresh to reflect it.
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
        className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} strokeWidth={2} />
        )}
        Upgrade to Pro · $24.99/mo
      </button>
      {error && <p className="text-[12px] text-[rgba(239,68,68,0.9)]">{error}</p>}
    </div>
  )
}
