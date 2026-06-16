interface PlanBadgeProps {
  plan: "FREE" | "PRO"
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  if (plan === "PRO") {
    return (
      <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-semibold bg-[#1A1A1A] text-white">
        Pro
      </span>
    )
  }
  return (
    <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-semibold bg-[#ECEAE4] text-[#6B7280]">
      Free
    </span>
  )
}
