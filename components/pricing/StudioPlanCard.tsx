import type { ReactNode } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PlanDef } from "@/lib/plans"

/**
 * A web-app plan (Free, Pro, Growth). Every value comes from lib/plans.ts.
 * The highlighted plan (Pro) gets the brand border; the rest stay neutral.
 * Used by the landing page and Settings → Billing.
 */
export function StudioPlanCard({ plan, cta, isCurrent = false }: { plan: PlanDef; cta: ReactNode; isCurrent?: boolean }) {
  const highlighted = Boolean(plan.highlighted)
  return (
    <div
      className={cn(
        "relative flex h-full flex-col gap-6 rounded-showcase border bg-surface p-6 sm:p-7",
        highlighted ? "border-brand shadow-[inset_0_0_0_1px_var(--brand)]" : "border-border"
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <p className={cn("text-label font-semibold", highlighted ? "text-brand" : "text-foreground")}>{plan.name}</p>
          {plan.badge && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-medium text-brand">⭐ {plan.badge}</span>}
          {isCurrent && <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-medium">Current Plan</span>}
        </div>
        <p className="flex items-baseline gap-1.5">
          <span className="text-[2.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
            ${plan.price % 1 === 0 ? plan.price : plan.price.toFixed(2)}
          </span>
          <span className="text-label text-muted-foreground">{plan.priceSuffix}</span>
        </p>
        <p className="text-label font-medium text-foreground">{plan.credits}</p>
      </div>
      <div>{cta}</div>
      <ul className="flex flex-col gap-2.5 border-t border-border pt-5">
        {plan.features.map((f) => {
          const included = f.included ?? true
          return (
            <li key={f.label} className="flex items-start gap-2.5 text-label">
              {included ? (
                <Check className={cn("mt-0.5 size-4 shrink-0", highlighted ? "text-brand" : "text-success")} strokeWidth={2.4} aria-hidden />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.4} aria-hidden />
              )}
              <span className={included ? "text-foreground" : "text-muted-foreground"}>
                {!included && <span className="sr-only">Not included: </span>}
                {f.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
