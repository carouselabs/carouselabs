// lib/segments.ts
// Shared recipient/enrollment segment catalog for the UI (Broadcast composer
// + Sequence builder dropdowns). The actual matching logic lives separately
// in each consumer — lib/broadcast.ts's resolveRecipients (a full recipient
// list, for one-off/scheduled broadcasts) and lib/emailSequences.ts's
// matchesSegment (a per-user boolean check, for auto-enrollment) — since
// those two need different query shapes, but both should offer the exact
// same segment vocabulary so this is the one place that vocabulary is
// defined. "inactive" and "low_credits" carry a segmentValue (a threshold);
// the rest ignore it.
export const SEGMENT_TYPES = [
  { value: "all", label: "All Users", needsValue: false },
  { value: "pro", label: "Pro Users", needsValue: false },
  { value: "growth", label: "Growth Users", needsValue: false },
  { value: "free", label: "Free Users", needsValue: false },
  {
    value: "inactive",
    label: "Inactive for X+ days",
    needsValue: true,
    valueLabel: "Days inactive",
    valuePlaceholder: "30",
  },
  { value: "zero_referrals", label: "Made zero referrals", needsValue: false },
  { value: "no_content", label: "Never generated content", needsValue: false },
  {
    value: "low_credits",
    label: "Credits below X",
    needsValue: true,
    valueLabel: "Credit threshold",
    valuePlaceholder: "100",
  },
] as const

export type SegmentType = (typeof SEGMENT_TYPES)[number]["value"]

export function segmentNeedsValue(segmentType: string): boolean {
  return SEGMENT_TYPES.find((s) => s.value === segmentType)?.needsValue ?? false
}
