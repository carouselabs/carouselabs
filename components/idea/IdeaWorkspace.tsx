"use client"

import { useState } from "react"
import { BreakdownView } from "@/components/idea/BreakdownView"
import { FormatPicker } from "@/components/idea/FormatPicker"
import type { BreakdownOutline } from "@/lib/types/breakdown"

interface IdeaWorkspaceProps {
  ideaId: string
  initialBreakdown: BreakdownOutline | null
  plan: "FREE" | "PRO" | "GROWTH"
}

// Holds the shared "is the breakdown still generating?" state so the format
// picker can be disabled while BreakdownView is loading, then re-enabled once
// it finishes.
export function IdeaWorkspace({ ideaId, initialBreakdown, plan }: IdeaWorkspaceProps) {
  // No cached breakdown → BreakdownView auto-generates on mount, so start in the
  // generating state to keep the picker disabled from the first paint.
  const [generating, setGenerating] = useState(initialBreakdown === null)

  // Read the breakdown on the left; choose what to make in a panel that
  // stays beside it on wide screens (below it on smaller ones).
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <article className="min-w-0">
        <BreakdownView
          ideaId={ideaId}
          initialBreakdown={initialBreakdown}
          onGeneratingChange={setGenerating}
        />
      </article>

      {/* Format picker — disabled while the breakdown is still generating */}
      <aside aria-label="Choose Output Type" className="min-w-0 border-t border-border pt-8 lg:self-start lg:sticky lg:top-0 lg:border-t-0 lg:pt-0">
        <FormatPicker ideaId={ideaId} plan={plan} disabled={generating} />
      </aside>
    </div>
  )
}
