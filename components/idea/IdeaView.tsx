import { IdeaWorkspace } from "@/components/idea/IdeaWorkspace"
import { TrackVisit } from "@/components/history/TrackVisit"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import type { RawCategory } from "@/lib/ai/parsers/ideas"
import { cn } from "@/lib/utils"
import { CATEGORY_PILL, PILL } from "@/components/shared/categoryTone"

/** The idea page: header, then the breakdown beside the format choice. */
export function IdeaView({
  ideaId: id,
  hook,
  rawCategory,
  createdAt,
  initialBreakdown: cachedBreakdown,
  plan,
}: {
  ideaId: string
  hook: string
  rawCategory: RawCategory
  createdAt: Date
  initialBreakdown: BreakdownOutline | null
  plan: "FREE" | "PRO" | "GROWTH"
}) {
  return (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-10">
      {/* Record this idea visit in history (BREAKDOWN — never downgrades progress) */}
      <TrackVisit ideaId={id} status="BREAKDOWN" />

      {/* Idea header */}
      <header className="flex max-w-reading flex-col gap-3 border-b border-border pb-8">
        <span className={cn(PILL, "self-start", CATEGORY_PILL[rawCategory])}>{rawCategory}</span>
        <h1 className="text-title-sm font-semibold text-balance text-foreground md:text-title">
          {hook}
        </h1>
        <p className="text-caption text-muted-foreground">
          Created {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </header>

      {/* Breakdown + format picker — the picker stays disabled until the
          breakdown finishes generating. */}
      <IdeaWorkspace ideaId={id} initialBreakdown={cachedBreakdown} plan={plan} />
    </div>
  )
}
