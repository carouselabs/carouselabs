import type { ReactNode } from "react"
import { Check, Puzzle } from "lucide-react"

import { cn } from "@/lib/utils"
import { EXTENSION_PLAN } from "@/lib/plans"
import { formatUsd, type EngagePriceInfo } from "@/lib/engage/priceRules"
import { isDiscount, priceEndDate } from "@/components/extension/ExtensionPrice"

type EngagePlan = {
  name: string
  price: number
  priceSuffix: string
  freeGenerations: number
  tagline: string
  features: readonly string[]
  note: string
}

/**
 * One Chrome extension plan (Engage for LinkedIn or for X), sold separately
 * from the studio plans. Values from lib/plans.ts. Used by the landing page,
 * the extension's Plan & payments page and Settings → Billing
 * (components/extension/ExtensionPlanSection). `price`: what this account
 * pays, when it isn't the plan's usual price (a special price an admin set).
 */
export function EngagePlanCard({
  plan = EXTENSION_PLAN,
  cta,
  status,
  showTrialNote = true,
  className,
  price,
}: {
  plan?: EngagePlan
  cta: ReactNode
  status?: ReactNode
  showTrialNote?: boolean
  className?: string
  price?: EngagePriceInfo
}) {
  const special = price?.special ? price : null
  return (
    <div className={cn("flex h-full flex-col gap-6 rounded-showcase border border-border bg-surface-raised p-6 sm:p-8", className)}>
      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <Puzzle className="size-3.5" strokeWidth={2.2} aria-hidden />
          Chrome extension · Sold separately
        </p>
        <h3 className="text-title-sm font-semibold text-balance">{plan.name}</h3>
        <p className="text-label text-muted-foreground">{plan.tagline}</p>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {special && isDiscount(special) && (
          <s className="text-title-sm leading-none font-medium text-muted-foreground tabular-nums">
            <span className="sr-only">Usually </span>
            {formatUsd(special.standardCents)}
          </s>
        )}
        <span className="text-[2.5rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {special ? formatUsd(special.cents) : `$${plan.price}`}
        </span>
        <span className="text-label text-muted-foreground">{plan.priceSuffix}</span>
        <span className="ml-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-medium text-brand">Unlimited</span>
      </div>
      {special && (
        <p className="-mt-3 text-caption font-medium text-brand">
          Your special price{special.endsAt ? `, available until ${priceEndDate(special.endsAt)}` : ""}. You keep it every month
          you stay subscribed.
        </p>
      )}
      {status}
      <div className="flex flex-col gap-2">
        {cta}
        <p className="text-caption text-muted-foreground">
          {showTrialNote && `Start with ${plan.freeGenerations} free generations — no card needed. `}
          {plan.note}
        </p>
      </div>
      <ul className="flex flex-col gap-2.5 border-t border-border pt-5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-label">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.4} aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}
