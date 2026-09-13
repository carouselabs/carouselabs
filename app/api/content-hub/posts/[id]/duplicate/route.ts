// app/api/content-hub/posts/[id]/duplicate/route.ts — copies caption,
// images, format, and tags into a brand-new Post record (no AI generation,
// no credit charge), so the user can re-share the same content on a new
// date/time or platform without redoing the work. Returns { postId } — the
// client re-opens the "pick content" flow with this new post pre-selected
// (see _client.tsx's openNewPanelForPost, already built for the same
// "jump straight to platform pick" deep link).
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const original = await db.post.findUnique({ where: { id }, include: { tags: { select: { id: true } } } })
  if (!original || original.userId !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  const duplicate = await db.post.create({
    data: {
      userId: user.id,
      title: original.title,
      caption: original.caption,
      format: original.format,
      status: "READY",
      imageUrls: original.imageUrls,
      r2Keys: [], // r2Keys are internal bookkeeping for the ORIGINAL upload; the duplicate reuses the same hosted imageUrls rather than re-uploading
      metadata: original.metadata ?? undefined,
      ...(original.tags.length ? { tags: { connect: original.tags.map((t) => ({ id: t.id })) } } : {}),
    },
  })

  return NextResponse.json({ postId: duplicate.id })
}
