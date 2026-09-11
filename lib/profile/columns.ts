// lib/profile/columns.ts
// Maps the onboarding-style field payload (role, industry, niche, topics,
// audience*, goals, primaryGoal, tones) onto the actual Profile columns.
// Shared by the user's own save path (app/api/profile/route.ts, both
// onboarding and settings) and the admin pre-fill tool
// (app/api/admin/prefill-user/route.ts) so both encode the exact same shape
// — a Profile written by either path reads back identically.
export const INDUSTRY_SEP = " — "

export function buildProfileColumns(body: Record<string, unknown>) {
  const role = typeof body.role === "string" ? body.role : ""
  const industry = typeof body.industry === "string" ? body.industry : ""
  const niche = typeof body.niche === "string" ? body.niche : ""
  const topics = Array.isArray(body.topics) ? (body.topics as string[]) : []
  const tones = Array.isArray(body.tones) ? (body.tones as string[]) : []
  const goals = Array.isArray(body.goals) ? (body.goals as string[]) : []

  return {
    headline: role,
    industry: niche ? `${industry}${INDUSTRY_SEP}${niche}` : industry,
    targetAudience: JSON.stringify({
      role: typeof body.audienceRole === "string" ? body.audienceRole : "",
      seniority: typeof body.audienceSeniority === "string" ? body.audienceSeniority : "",
      industry: typeof body.audienceIndustry === "string" ? body.audienceIndustry : "",
      problem: typeof body.coreProblem === "string" ? body.coreProblem : "",
    }),
    contentPillars: topics,
    writingStyle: JSON.stringify({
      role,
      tones,
      goals,
      primaryGoal: typeof body.primaryGoal === "string" ? body.primaryGoal : "",
    }),
  }
}

export function safeParseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
