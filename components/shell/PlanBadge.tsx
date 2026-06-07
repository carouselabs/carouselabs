interface PlanBadgeProps {
  plan: "FREE" | "PRO"
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  if (plan === "PRO") {
    return (
      <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-semibold bg-[rgba(124,58,237,0.15)] text-[#A78BFA]">
        Pro
      </span>
    )
  }
  return (
    <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-semibold bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)]">
      Free
    </span>
  )
}
