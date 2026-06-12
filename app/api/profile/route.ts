import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import type { ProfileData, VoicePreset } from "@/lib/profile/options"

const INDUSTRY_SEP = " — "

// Derive the role/industry/niche/audience/writingStyle DB columns from the
// onboarding-style field payload. Shared by POST (onboarding) and PATCH.
function buildProfileColumns(body: Record<string, unknown>) {
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

function safeParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// GET /api/profile — normalized profile for the settings pages (+ email/plan).
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { profile: true, subscription: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const p = user.profile
  const ws = safeParse(p?.writingStyle, { role: "", tones: [], goals: [], primaryGoal: "" } as {
    role: string
    tones: string[]
    goals: string[]
    primaryGoal: string
  })
  const aud = safeParse(p?.targetAudience, { role: "", seniority: "", industry: "", problem: "" } as {
    role: string
    seniority: string
    industry: string
    problem: string
  })

  const fullIndustry = p?.industry ?? ""
  const sepIdx = fullIndustry.indexOf(INDUSTRY_SEP)
  const industry = sepIdx === -1 ? fullIndustry : fullIndustry.slice(0, sepIdx)
  const niche = sepIdx === -1 ? "" : fullIndustry.slice(sepIdx + INDUSTRY_SEP.length)

  const profile: ProfileData = {
    role: ws.role || p?.headline || "",
    industry,
    niche,
    topics: p?.contentPillars ?? [],
    audienceRole: aud.role ?? "",
    audienceSeniority: aud.seniority ?? "",
    audienceIndustry: aud.industry ?? "",
    coreProblem: aud.problem ?? "",
    goals: ws.goals ?? [],
    primaryGoal: ws.primaryGoal ?? "",
    tones: ws.tones ?? [],
    voicePresets: (p?.voicePresets as unknown as VoicePreset[]) ?? [],
    email: user.email,
    plan: (user.subscription?.plan ?? "FREE") as "FREE" | "PRO",
  }

  return NextResponse.json({ profile })
}

// POST /api/profile — onboarding (creates the profile, marks it complete).
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const columns = buildProfileColumns(body)

  await db.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...columns, onboardingDone: true },
    update: { ...columns, onboardingDone: true },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/profile — settings updates. Handles two independent sections:
//   • profile fields (when `industry` is present)
//   • voice presets   (when `voicePresets` is present)
// Either or both may be sent. Never touches onboardingDone.
export async function PATCH(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const profile = await db.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (typeof body.industry === "string") {
    Object.assign(data, buildProfileColumns(body))
  }
  if (Array.isArray(body.voicePresets)) {
    data.voicePresets = (body.voicePresets as VoicePreset[]).slice(0, 5)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  await db.profile.update({ where: { userId: user.id }, data })

  return NextResponse.json({ success: true })
}
