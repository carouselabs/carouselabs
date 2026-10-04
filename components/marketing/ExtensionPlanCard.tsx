import type { ReactNode } from "react"
import { Check, Puzzle } from "lucide-react"
import { EXTENSION_PLAN } from "@/lib/plans"

// The Chrome extension's pricing box: a full-width card under the three web
// plans on both the marketing pricing section and the in-app billing page.
// Wide and set apart on purpose — it's a separate product, not a fourth tier,
// and the layout should say so before the copy does. The CTA is a slot, as
// with PlanCard, so each page supplies the right action.
type ExtensionPlan = {
  name: string
  price: number
  priceSuffix: string
  freeGenerations: number
  tagline: string
  features: readonly string[]
  note: string
}

export function ExtensionPlanCard({
  cta,
  status,
  showTrialNote = true,
  plan = EXTENSION_PLAN,
  tone = "purple",
}: {
  cta: ReactNode
  status?: ReactNode
  // Off for accounts that already pay, where "start free" would read oddly.
  showTrialNote?: boolean
  // The LinkedIn extension's plan by default; X_EXTENSION_PLAN for X, sold
  // separately and shown in X's black and white.
  plan?: ExtensionPlan
  tone?: "purple" | "black"
}) {
  return (
    <div
      id={tone === "black" ? "x-extension-plan" : "extension-plan"}
      className={`relative overflow-hidden rounded-3xl p-7 sm:p-10 text-white ${
        tone === "black"
          ? "bg-gradient-to-br from-[#18181B] via-[#0A0A0A] to-black shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
          : "bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4C1D95] shadow-[0_24px_70px_rgba(124,58,237,0.35)]"
      }`}
    >
      {/* Soft glow, purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-8 lg:gap-12 items-start">
        <div className="flex flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest">
            <Puzzle size={13} strokeWidth={2.2} />
            Chrome extension · Sold separately
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-[1.75rem] sm:text-[2rem] font-bold leading-tight tracking-[-0.01em]">
              {plan.name}
            </h3>
            <p className="text-[14.5px] leading-[1.65] text-white/80">{plan.tagline}</p>
          </div>

          <div className="flex items-end gap-1.5">
            <span className="text-[3.25rem] font-bold leading-none tracking-tight">${plan.price}</span>
            <span className="pb-2 text-[14px] text-white/70">{plan.priceSuffix}</span>
            <span className="mb-2 ml-2 rounded-full bg-[#FCD34D] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#4C1D95]">
              Unlimited
            </span>
          </div>

          {status}

          <div className="max-w-sm">{cta}</div>

          <p className="text-[12px] leading-snug text-white/65">
            {showTrialNote && `Start with ${plan.freeGenerations} free generations — no card needed. `}
            {plan.note}
          </p>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 rounded-2xl bg-white/10 p-6 ring-1 ring-white/15">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                <Check size={12} strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// White-on-purple button that sits inside the card.
export function ExtensionCTA({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#F5F3FF] text-[14px] font-bold text-[#6D28D9] transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
    >
      {label}
    </a>
  )
}
