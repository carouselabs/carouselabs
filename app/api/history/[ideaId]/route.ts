import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { HistoryStatus } from "@prisma/client"
import { db } from "@/lib/db"

const VALID_STATUSES: HistoryStatus[] = [
  "BREAKDOWN",
  "CAPTION",
  "CAPTION_DONE",
  "IMAGE",
  "IMAGE_DONE",
  "CAROUSEL",
  "CAROUSEL_DONE",
]

// POST /api/history/[ideaId] — upsert a history entry (track where the user is).
// BREAKDOWN is non-destructive: on an existing row it only bumps lastVisitedAt
// so a plain page revisit never downgrades real progress (e.g. CAROUSEL_DONE).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ideaId: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ideaId } = await params

  let status: HistoryStatus
  try {
    const body = await req.json()
    status = body.status
    if (!VALID_STATUSES.includes(status)) throw new Error("Invalid status")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Ownership guard — only track ideas that belong to this user.
  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  // BREAKDOWN on an existing entry: refresh recency only, keep the status.
  const updateData =
    status === "BREAKDOWN"
      ? { lastVisitedAt: new Date() }
      : { status, lastVisitedAt: new Date() }

  const entry = await db.ideaHistory.upsert({
    where: { userId_ideaId: { userId: user.id, ideaId } },
    create: { userId: user.id, ideaId, status, lastVisitedAt: new Date() },
    update: updateData,
  })

  return NextResponse.json({ id: entry.id, status: entry.status })
}

// PATCH /api/history/[ideaId] — toggle pin (pin idea to top of history).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ideaId: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ideaId } = await params

  let isPinned: boolean
  try {
    const body = await req.json()
    isPinned = body.isPinned
    if (typeof isPinned !== "boolean") throw new Error("Invalid isPinned")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const existing = await db.ideaHistory.findUnique({
    where: { userId_ideaId: { userId: user.id, ideaId } },
  })
  if (!existing) return NextResponse.json({ error: "History entry not found" }, { status: 404 })

  await db.ideaHistory.update({
    where: { userId_ideaId: { userId: user.id, ideaId } },
    data: { isPinned },
  })

  return NextResponse.json({ ok: true, isPinned })
}

// DELETE /api/history/[ideaId] — remove an idea from history (scoped to user).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ideaId: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ideaId } = await params

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  await db.ideaHistory.deleteMany({ where: { userId: user.id, ideaId } })

  return NextResponse.json({ ok: true })
}
