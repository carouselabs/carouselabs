import { cn } from "@/lib/utils"

// Leaderboard rank: the top three sit on gold, silver and bronze discs (their
// own ink, so they read the same in light and dark), the rest as plain figures.
const PODIUM = [
  "bg-[#E8B931] text-[#3A2A00]",
  "bg-[#C8CDD4] text-[#262A30]",
  "bg-[#D2895A] text-[#381A07]",
]

export function RankMark({ rank, className }: { rank: number; className?: string }) {
  const podium = PODIUM[rank - 1]
  return (
    <span
      aria-label={`Rank ${rank}`}
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center rounded-full text-caption font-semibold leading-none tabular-nums",
        podium ?? "text-muted-foreground",
        className
      )}
    >
      {rank}
    </span>
  )
}
