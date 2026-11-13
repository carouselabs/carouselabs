// components/extension/EngagePageHead.tsx — the heading on Engage's pages:
// a plain word or two, then an italic serif phrase in the blue → violet
// gradient ("Voices, how you sound."), a line under it, and an optional
// action on the right.
import type { ReactNode } from "react"
import type { EngagePlatform } from "@/lib/engage/features"

const SITE: Record<EngagePlatform, string> = { linkedin: "LinkedIn", x: "X", reddit: "Reddit" }

const ACTIVITY_LEAD: Record<EngagePlatform, string> = {
  linkedin: "Every comment, reply, connection note and message on LinkedIn from the last 90 days.",
  x: "Every reply and message on X from the last 90 days.",
  reddit: "Every comment and message on Reddit from the last 90 days.",
}

export function VoicesHead({ platform }: { platform: EngagePlatform }) {
  return (
    <EngagePageHead
      title="Voices,"
      accent="how you sound."
      lead={`Each voice is one way you write on ${SITE[platform]}. Make one your default and the extension starts with it.`}
    />
  )
}

export function ActivityHead({ platform }: { platform: EngagePlatform }) {
  return <EngagePageHead title="Activity," accent="all it wrote." lead={ACTIVITY_LEAD[platform]} />
}

export function EngagePageHead({
  title,
  accent,
  lead,
  action,
  eyebrow,
}: {
  title: string
  accent: string
  lead?: ReactNode
  action?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 px-1 pt-1">
      <div className="flex max-w-2xl min-w-0 flex-col gap-3">
        {eyebrow}
        <h1 className="text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.04em] text-foreground sm:text-[3.25rem]">
          {title}{" "}
          <span className="engage-serif engage-gradient-text inline-block pr-1 pb-1 text-[1.1em] leading-[0.9]">{accent}</span>
        </h1>
        {lead && <p className="text-body-lg text-muted-foreground">{lead}</p>}
      </div>
      {action}
    </div>
  )
}
