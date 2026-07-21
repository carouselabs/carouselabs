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

  return (
    <>
      <BreakdownView
        ideaId={ideaId}
        initialBreakdown={initialBreakdown}
        onGeneratingChange={setGenerating}
      />

      {/* Divider */}
      <div className="h-px bg-[#ECEAE4]" />

      {/* Format picker — disabled while the breakdown is still generating */}
      <FormatPicker ideaId={ideaId} plan={plan} disabled={generating} />
    </>
  )
}
