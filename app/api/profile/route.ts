import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const {
    role,
    industry,
    niche,
    topics,
    audienceRole,
    audienceSeniority,
    audienceIndustry,
    coreProblem,
    goals,
    primaryGoal,
    tones,
  } = body

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const industryValue: string = niche ? `${industry} — ${niche}` : industry ?? ""

  const targetAudience = JSON.stringify({
    role: audienceRole ?? "",
    seniority: audienceSeniority ?? "",
    industry: audienceIndustry ?? "",
    problem: coreProblem ?? "",
  })

  const writingStyle = JSON.stringify({
    role: role ?? "",
    tones: Array.isArray(tones) ? tones : [],
    goals: Array.isArray(goals) ? goals : [],
    primaryGoal: primaryGoal ?? "",
  })

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      headline: role ?? "",
      industry: industryValue,
      targetAudience,
      contentPillars: Array.isArray(topics) ? topics : [],
      writingStyle,
      onboardingDone: true,
    },
    update: {
      headline: role ?? "",
      industry: industryValue,
      targetAudience,
      contentPillars: Array.isArray(topics) ? topics : [],
      writingStyle,
      onboardingDone: true,
    },
  })

  return NextResponse.json({ success: true })
}
