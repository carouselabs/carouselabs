// Display helpers shared by the campaign list and the campaign page.
import { SEGMENT_TYPES } from "@/lib/segments"

/** "Inactive for 30+ days", "Engage for LinkedIn users", "Custom list"… */
export function audienceLabel(audience: string, audienceValue: string | null): string {
  if (audience === "custom") return "Custom list"
  const segment = SEGMENT_TYPES.find((s) => s.value === audience)
  if (!segment) return audience
  if (!segment.needsValue) return segment.label
  const value = audienceValue || segment.valuePlaceholder
  return segment.label.replace(/\bX\b/, value ?? "X")
}

export const RECIPIENT_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Not sent", className: "bg-surface-muted text-muted-foreground" },
  sending: { label: "Sending…", className: "bg-warning-soft text-warning" },
  sent: { label: "Sent", className: "bg-success-soft text-success" },
  failed: { label: "Failed", className: "bg-danger-soft text-danger" },
}
