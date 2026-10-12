interface PlanBadgeProps {
  plan: "FREE" | "PRO" | "GROWTH"
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  if (plan === "GROWTH") {
    return (
      <span className="shrink-0 rounded-detail bg-warning-soft px-1.5 py-0.5 text-[11px] leading-4 font-semibold text-warning">
        Growth
      </span>
    )
  }
  if (plan === "PRO") {
    return (
      <span className="shrink-0 rounded-detail bg-primary px-1.5 py-0.5 text-[11px] leading-4 font-semibold text-primary-foreground">
        Pro
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded-detail bg-surface-muted px-1.5 py-0.5 text-[11px] leading-4 font-semibold text-muted-foreground">
      Free
    </span>
  )
}
