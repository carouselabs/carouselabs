// components/extension/engageStatus.ts — one short line for an extension's
// plan, for the Engage menu (EngageRail) and Home's chips. Plain module so
// the server layout and client components can both use it.
import type { ExtAccessSummary } from "@/lib/extAccess"

export type PlanTone = "unlimited" | "free" | "paused"

export interface PlanStatus {
  // "Unlimited", "7 of 10 free left", "Testing", "Paused".
  line: string
  tone: PlanTone
}

export function planStatus(ext: ExtAccessSummary): PlanStatus {
  if (ext.suspended) return { line: "Paused", tone: "paused" }
  if (ext.access === "unlimited") return { line: "Unlimited", tone: "unlimited" }
  if (ext.access === "testing") return { line: "Testing", tone: "unlimited" }
  const left = Math.max(0, ext.freeLimit - ext.freeUsed)
  return { line: `${left} of ${ext.freeLimit} free left`, tone: "free" }
}

// The status dot's colour: green when unlimited, violet on the free plan,
// grey when paused.
export const TONE_DOT: Record<PlanTone, string> = {
  unlimited: "bg-[#22C55E]",
  free: "bg-[#A445F0]",
  paused: "bg-[#C9C5DE]",
}
