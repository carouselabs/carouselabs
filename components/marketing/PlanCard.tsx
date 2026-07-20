import type { ReactNode } from "react"
import { Check, X } from "lucide-react"
import type { PlanDef } from "@/lib/plans"

// Shared pricing card used by both the marketing pricing section and the
// in-app billing page's comparison grid. The CTA is a slot so each caller
// can supply the right action (a plain link on marketing, a checkout button
// or "Current Plan" state on the billing page) without duplicating layout.
export function PlanCard({
  plan,
  cta,
  isCurrent = false,
}: {
  plan: PlanDef
  cta: ReactNode
  isCurrent?: boolean
}) {
  const isDark = plan.theme === "dark"
  const isPro = plan.highlighted

  return (
    // No pt-4/scale spacer here — every card must end up the same height, so
    // the "Most Popular" badge floats via a negative top offset instead of
    // reserving layout space that would shrink just this card.
    <div className="relative h-full">
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-[11px] font-semibold text-white uppercase tracking-wide shadow-[0_4px_20px_rgba(124,58,237,0.4)]">
            ⭐ {plan.badge}
          </span>
        </div>
      )}

      <div
        className={[
          "flex flex-col gap-7 h-full p-7 sm:p-8 rounded-3xl transition-all duration-300",
          isDark
            ? "bg-[#0F0F0F] border-2 border-[#F59E0B]/40 hover:border-[#F59E0B]/70 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            : isPro
              ? "bg-white border-2 border-[#7C3AED] shadow-[0_20px_60px_rgba(124,58,237,0.18)] hover:shadow-[0_24px_70px_rgba(124,58,237,0.26)]"
              : "bg-white border border-[#E5E3DE] hover:border-[#D1CFC8]",
          isCurrent && !isDark ? "ring-2 ring-offset-2 ring-[#7C3AED]/40" : "",
          isCurrent && isDark ? "ring-2 ring-offset-2 ring-offset-[#0F0F0F] ring-[#F59E0B]/50" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p
              className={[
                "text-[13px] font-bold uppercase tracking-widest",
                isDark ? "text-[#F59E0B]" : isPro ? "text-[#7C3AED]" : "text-[#6B7280]",
              ].join(" ")}
            >
              {plan.name}
            </p>
            {isCurrent && (
              <span
                className={[
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  isDark ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#7C3AED]/10 text-[#7C3AED]",
                ].join(" ")}
              >
                Current Plan
              </span>
            )}
          </div>

          <div className="flex items-end gap-1.5 mt-2">
            <span
              className={[
                "text-[3rem] sm:text-[3.25rem] font-bold leading-none tracking-tight",
                isDark ? "text-white" : "text-[#0A0A0A]",
              ].join(" ")}
            >
              ${plan.price % 1 === 0 ? plan.price : plan.price.toFixed(2)}
            </span>
            <span className={`text-[14px] pb-2 ${isDark ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
              {plan.priceSuffix}
            </span>
          </div>
          <p className={`text-[12.5px] mt-1 font-medium ${isDark ? "text-[#D1D5DB]" : "text-[#374151]"}`}>
            {plan.credits}
          </p>
        </div>

        <div>{cta}</div>

        <ul className="flex flex-col gap-3">
          {plan.features.map((f) => {
            const included = f.included ?? true
            return (
              <li key={f.label} className="flex items-start gap-2.5">
                {included ? (
                  <Check
                    size={14}
                    className={`mt-0.5 flex-shrink-0 ${isDark ? "text-[#F59E0B]" : isPro ? "text-[#7C3AED]" : "text-emerald-600"}`}
                    strokeWidth={2.5}
                  />
                ) : (
                  <X size={14} className="text-[#B0AEA8] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                )}
                <span
                  className={[
                    "text-[13px] leading-snug",
                    included ? (isDark ? "text-[#E5E7EB]" : "text-[#374151]") : "text-[#9CA3AF]",
                  ].join(" ")}
                >
                  {f.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
