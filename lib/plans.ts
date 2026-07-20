// lib/plans.ts
// Shared pricing data for the marketing pricing section and the in-app
// billing page, so both stay in sync instead of duplicating feature lists.
//
// NOTE: "Growth" is a pricing-page tier only right now — the Prisma `Plan`
// enum has just FREE/PRO, and Growth checkout uses the same Lemon Squeezy
// variant as Pro (see NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL usage below).
// There is no way to distinguish a "Growth" subscriber from a "Pro" one in
// the database yet.

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
  credits: "1 lifetime post",
  theme: "light",
  ctaLabel: "Get Started Free",
  features: [
    { label: "1 lifetime post" },
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

export const CREDIT_COST_LINES = [
  "Caption Only = 5 credits · Image + Caption = 15 credits · Carousel = 40 credits",
  "Regenerate caption = 1 credit · Regenerate image = 8 credits · Regenerate slide = 8 credits",
  "Credits reset every month. Unused credits don't roll over.",
]

export const PRICING_FAQ: { question: string; answer: string }[] = [
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
