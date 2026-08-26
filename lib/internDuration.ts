// lib/internDuration.ts
// Pure date/duration math for the intern points board — deliberately split
// out from lib/internPoints.ts (which imports @/lib/db) so client components
// like components/admin/intern/OverviewTab.tsx can import these formatters
// directly without pulling Prisma into the browser bundle. Server code keeps
// importing everything from lib/internPoints.ts as before — it re-exports
// this whole module, so no other file needs to change its import path.

// Adds durationMonths to joinDate — used only at intern creation, where the
// initial duration is still chosen in months. Extensions no longer use this:
// see addDays below.
export function calculateEndDate(joinDate: Date, durationMonths: number): Date {
  const end = new Date(joinDate)
  end.setMonth(end.getMonth() + durationMonths)
  return end
}

// Extensions are stored purely in days (see InternExtension.addedDays) so a
// "5 day" extension and a "1 month" extension both compound precisely off
// the current endDate, with no month-length ambiguity.
export function addDays(date: Date, days: number): Date {
  const end = new Date(date)
  end.setDate(end.getDate() + days)
  return end
}

// The conversion used whenever an extension is entered in months instead of
// days — applied once, at the point of creation, so InternExtension.addedDays
// is always the single source of truth from then on.
export const DAYS_PER_MONTH = 30

export function monthsToDays(months: number): number {
  return months * DAYS_PER_MONTH
}

// Human-readable label for an extension amount stored in days — shows the
// months-equivalent alongside when it's a clean multiple of 30, since that's
// almost always how it was actually entered (e.g. "1 month (30 days)"),
// otherwise just the day count (e.g. "5 days"). Operates on magnitude only —
// InternExtension.addedDays can be negative (a reduction), and callers
// decide how to present the sign (e.g. "+"/"−", or "Extended"/"Reduced").
export function formatExtensionAmount(days: number): string {
  const abs = Math.abs(days)
  if (abs > 0 && abs % DAYS_PER_MONTH === 0) {
    const months = abs / DAYS_PER_MONTH
    return `${months} month${months === 1 ? "" : "s"} (${abs} days)`
  }
  return `${abs} day${abs === 1 ? "" : "s"}`
}

// Total internship length, computed directly from joinDate -> endDate rather
// than from the (no-longer-updated) Intern.durationMonths field, so it stays
// accurate after any number of day- or month-based extensions.
export function formatInternshipDuration(joinDate: Date, endDate: Date): string {
  const totalDays = Math.round((endDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
  if (totalDays < DAYS_PER_MONTH) {
    return `${totalDays} day${totalDays === 1 ? "" : "s"}`
  }
  const months = Math.floor(totalDays / DAYS_PER_MONTH)
  const remainderDays = totalDays % DAYS_PER_MONTH
  if (remainderDays === 0) {
    return `${months} month${months === 1 ? "" : "s"}`
  }
  return `${months} month${months === 1 ? "" : "s"}, ${remainderDays} day${remainderDays === 1 ? "" : "s"}`
}

// Percent-through and days-left for the internship window, clamped to
// [0, 100] / [0, ∞) so a not-yet-started or already-ended internship never
// renders a nonsensical progress bar.
export function getInternshipProgress(joinDate: Date, endDate: Date) {
  const now = new Date()
  const total = endDate.getTime() - joinDate.getTime()
  const elapsed = now.getTime() - joinDate.getTime()
  const percentComplete = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const isCompleted = now > endDate
  return { percentComplete, daysRemaining, isCompleted }
}
