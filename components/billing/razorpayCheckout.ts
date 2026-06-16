// components/billing/razorpayCheckout.ts
// Client-only helper to load the Razorpay Checkout script and open it.

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_signature: string
}

export interface RazorpayOptions {
  key: string
  subscription_id?: string
  order_id?: string
  amount?: number
  currency?: string
  name?: string
  description?: string
  prefill?: { email?: string }
  theme?: { color?: string }
  handler: (response: RazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}

type RazorpayCtor = new (options: RazorpayOptions) => { open: () => void }

declare global {
  interface Window {
    Razorpay?: RazorpayCtor
  }
}

export function loadRazorpay(): Promise<RazorpayCtor> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay)
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load"))
    script.onerror = () => reject(new Error("Could not load Razorpay"))
    document.body.appendChild(script)
  })
}
