// GET /api/intern/me — the logged-in user's own Intern record + entries,
// matched by email. Links clerkId to the Intern row on first successful
// match (permanent link, so future lookups don't depend on email staying
// in sync). Read-only otherwise.
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { summarizeEntries, predefinedTaskNames } from "@/lib/internPoints"

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let intern = await db.intern.findUnique({
    where: { email: user.email },
    include: { entries: { orderBy: { date: "desc" } } },
  })

  if (!intern) return NextResponse.json({ intern: null })

  if (!intern.clerkId) {
    intern = await db.intern.update({
      where: { id: intern.id },
      data: { clerkId },
      include: { entries: { orderBy: { date: "desc" } } },
    })
  }

  const { total, pointsToday, pointsThisWeek } = summarizeEntries(intern.entries)
  const taskNames = await predefinedTaskNames()

  return NextResponse.json({
    intern: {
      id: intern.id,
      name: intern.name,
      email: intern.email,
      active: intern.active,
      totalPoints: total,
      pointsToday,
      pointsThisWeek,
    },
    entries: intern.entries.map((e) => ({ ...e, isPredefinedTask: taskNames.has(e.category) })),
  })
}
