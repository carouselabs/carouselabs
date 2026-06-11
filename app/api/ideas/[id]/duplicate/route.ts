import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// POST /api/ideas/[id]/duplicate — clone an idea (hook/category + latest
// breakdown) into a fresh idea so the user can start a brand-new session
// without losing the original. Returns the new ideaId.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const source = await db.idea.findUnique({
    where: { id },
    include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
  if (!source || source.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  const copy = await db.idea.create({
    data: {
      userId: user.id,
      title: source.title,
      hook: source.hook,
      mode: source.mode,
      category: source.category,
      // Carry over the latest breakdown so the new session is ready to go.
      breakdowns: source.breakdowns[0]
        ? {
            create: {
              userId: user.id,
              outline: source.breakdowns[0].outline ?? {},
            },
          }
        : undefined,
    },
  })

  return NextResponse.json({ ideaId: copy.id })
}
