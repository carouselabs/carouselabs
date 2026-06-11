import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: postId } = await params

  let caption: string
  try {
    const body = await req.json()
    caption = body.caption
    if (typeof caption !== "string") throw new Error("Invalid caption")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post || post.userId !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  const updated = await db.post.update({
    where: { id: postId },
    data: { caption },
  })

  return NextResponse.json({ postId: updated.id })
}
