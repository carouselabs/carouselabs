// lib/plans.ts
// Shared pricing data for the marketing pricing section and the in-app
// billing page, so both stay in sync instead of duplicating feature lists.
//
// Growth is a full plan tier: Prisma's `Plan` enum has FREE/PRO/GROWTH, and
// it checks out through its own Lemon Squeezy variant — see
// NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL / LEMONSQUEEZY_GROWTH_VARIANT_ID.

export type PlanFeature = {
  label: string
  included?: boolean // defaults to true; set false for Free's "No X" rows
}

export type PlanId = "free" | "pro" | "growth"

export interface PlanDef {
  id: PlanId
  name: string
  price: number
  priceSuffix: string
  credits: string
  badge?: string
  features: PlanFeature[]
  ctaLabel: string
  theme: "light" | "dark"
  highlighted?: boolean
}

export const FREE_PLAN: PlanDef = {
  id: "free",
  name: "Free",
  price: 0,
  priceSuffix: "forever",
  credits: "25 lifetime credits",
  theme: "light",
  ctaLabel: "Get Started Free",
  features: [
    { label: "25 lifetime credits" },
    { label: "Caption Only" },
    { label: "Image + Caption" },
    { label: "AI-powered captions" },
    { label: "Basic idea generation" },
    { label: "No carousel access", included: false },
    { label: "No LinkedIn posting", included: false },
    { label: "No voice guidelines", included: false },
    { label: "Community support" },
  ],
}

export const PRO_PLAN: PlanDef = {
  id: "pro",
  name: "Pro",
  price: 24.99,
  priceSuffix: "/month",
  credits: "1,000 credits/month",
  badge: "Most Popular",
  theme: "light",
  highlighted: true,
  ctaLabel: "Start Creating",
  features: [
    { label: "Everything in Free" },
    { label: "1,000 credits per month" },
    { label: "Caption Only" },
    { label: "Image + Caption" },
    { label: "Carousel — 7-8 slides" },
    { label: "LinkedIn one-click posting" },
    { label: "Reference image style matching" },
    { label: "Voice guidelines & presets" },
    { label: "AI trending post ideas daily" },
    { label: "Caption, image & slide regeneration" },
    { label: "Priority support" },
  ],
}

export const GROWTH_PLAN: PlanDef = {
  id: "growth",
  name: "Growth",
  price: 45.99,
  priceSuffix: "/month",
  credits: "2,000 credits/month",
  theme: "dark",
  ctaLabel: "Go Growth",
  features: [
    { label: "Everything in Pro" },
    { label: "2,000 credits per month" },
    { label: "2x more content per month" },
    { label: "Perfect for agencies & power users" },
    { label: "Priority support" },
  ],
}

export const PLANS: PlanDef[] = [FREE_PLAN, PRO_PLAN, GROWTH_PLAN]

// ── The Chrome extension (CarouseLabs Comment) ────────────────────────────
// A separate $15/month product, NOT a fourth web plan: buying it unlocks the
// extension only (no caption/image/carousel credits), and no web plan
// includes it. Billing lives apart from the web Subscription — see
// lib/extensionBilling.ts. The price must match the Lemon Squeezy product
// behind LEMONSQUEEZY_EXTENSION_CHECKOUT_URL.
export const EXTENSION_PLAN = {
  name: "Extension Tool",
  price: 15,
  priceSuffix: "/month",
  freeGenerations: 10,
  tagline: "Unlimited LinkedIn comments, replies, connection notes and conversations — written in your voice.",
  features: [
    "Unlimited generations — write as many as you want",
    "LinkedIn comments in your own voice",
    "Replies that read the whole comment thread",
    "Conversation Assistant: reads the chat and writes the next message",
    "Keep conversations going and turn them into leads",
    "Connection request notes that get accepted",
    "Tones, voice profiles and Shorter/Longer rewrites",
    "Insert straight into LinkedIn — nothing is ever posted or sent for you",
  ],
  // Shown next to the price so nobody expects web credits from it.
  note: "Extension only — no caption, image or carousel credits included.",
} as const

// Chrome Web Store listing for the extension. null until it's set: the
// Toolkit then shows no Install button rather than a broken link.
export const EXTENSION_STORE_URL: string | null = null

// Where every "Buy the extension" button points. Signed-out visitors go to
// sign-up first and come straight back here (app/checkout/extension).
export const EXTENSION_CHECKOUT_PATH = "/checkout/extension"

export const CREDIT_COST_LINES = [
  "Caption Only = 5 credits · Image + Caption = 15 credits · Carousel = 40 credits",
  "Regenerate caption = 1 credit · Regenerate image = 8 credits · Regenerate slide = 8 credits",
  "Credits reset every month. Unused credits don't roll over.",
]

export const PRICING_FAQ: { question: string; answer: string }[] = [
  {
    question: "Is the Chrome extension included in Pro or Growth?",
    answer:
      "No. The CarouseLabs extension is its own $15/month plan, bought separately. It isn't part of Free, Pro or Growth, and buying it doesn't add any caption, image or carousel credits — it unlocks the extension only.",
  },
  {
    question: "What does the $15 extension plan include?",
    answer:
      "Unlimited generations in the extension: LinkedIn comments, replies, connection request notes, and the Conversation Assistant that reads a chat and writes your next message. Every account gets 10 free generations to try it first, no card needed.",
  },
  {
    question: "Is the extension really unlimited?",
    answer:
      "Yes, for normal use. To keep your LinkedIn account safe, the extension pauses for a while if you generate an unusually large amount in a single day, then comes back gradually.",
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer:
      "Yes, you can change your plan at any time. Changes take effect at your next billing cycle.",
  },
  {
    question: "What happens when I run out of credits?",
    answer:
      "You'll see a notification when you're running low. Your account won't be charged extra — generation will pause until your credits reset next month.",
  },
  {
    question: "Do unused credits roll over?",
    answer: "Credits reset at the start of each billing cycle and don't roll over. Make sure to use them!",
  },
]
