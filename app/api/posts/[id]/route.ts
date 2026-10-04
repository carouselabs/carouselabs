import { NextResponse } from "next/server"
import { z } from "zod"
import { draftSchema, ownedR2Key, slideRole } from "@/lib/postInput"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

const updateSchema = draftSchema.extend({ expectedUpdatedAt: z.iso.datetime() })
type Context = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const post = await db.post.findFirst({ where: { id, userId: user.id }, select: { id: true, caption: true, updatedAt: true, format: true, imageUrls: true } })
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })
  return NextResponse.json({ post }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function PATCH(req: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "A valid caption and saved revision are required" }, { status: 400 })
  const { id } = await params
  const { caption, expectedUpdatedAt, slides, size, image } = parsed.data
  if (slides && image) return NextResponse.json({ error: "Choose a carousel or a single image" }, { status: 400 })
  if (image && !ownedR2Key(image.imageUrl, user.id, ["posts"])) return NextResponse.json({ error: "Invalid post image" }, { status: 400 })
  if (slides?.some((s) => !ownedR2Key(s.imageUrl, user.id, ["carousel"]))) return NextResponse.json({ error: "Invalid slide image" }, { status: 400 })
  const post = await db.post.findFirst({ where: { id, userId: user.id }, select: { id: true, caption: true, updatedAt: true, format: true, imageUrls: true, metadata: true, title: true } })
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })
  // A lost response may be retried without overwriting a newer, different edit.
  if (slides && post.format !== "CAROUSEL") return NextResponse.json({ error: "Post is not a carousel" }, { status: 400 })
  if (image && post.format !== "SINGLE_IMAGE") return NextResponse.json({ error: "Post is not a single image" }, { status: 400 })
  if (!slides && !image && !size && post.caption === caption) return NextResponse.json({ postId: id, updatedAt: post.updatedAt }, { headers: { "Cache-Control": "no-store" } })
  const metadata = post.metadata && typeof post.metadata === "object" && !Array.isArray(post.metadata) ? post.metadata : {}
  const updatedAt = new Date(Math.max(Date.now(), post.updatedAt.getTime() + 1))
  const orderedSlides = slides?.slice().sort((a, b) => a.slideNumber - b.slideNumber)
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.post.updateMany({
      where: { id, userId: user.id, updatedAt: new Date(expectedUpdatedAt) },
      data: { caption, updatedAt, ...((size || image) ? { metadata: { ...metadata, ...(size ? { size } : {}), ...(image ? { imagePrompt: image.imagePrompt } : {}) } } : {}), ...(orderedSlides ? {
        imageUrls: orderedSlides.map((s) => s.imageUrl),
        r2Keys: orderedSlides.map((s) => ownedR2Key(s.imageUrl, user.id)!),
      } : image ? { imageUrls: [image.imageUrl], r2Keys: [ownedR2Key(image.imageUrl, user.id, ["posts"])!] } : {}) },
    })
    if (result.count === 1 && orderedSlides) {
      await tx.slide.deleteMany({ where: { postId: id } })
      await tx.slide.createMany({ data: orderedSlides.map((s) => ({
        postId: id, role: slideRole[s.role], order: s.slideNumber,
        headline: s.headline, imageUrl: s.imageUrl, ...(s.prompt !== undefined ? { metadata: { prompt: s.prompt } } : {}), r2Key: ownedR2Key(s.imageUrl, user.id)!,
      })) })
    }
    if (result.count === 1 && image) {
      await tx.slide.deleteMany({ where: { postId: id } })
      await tx.slide.createMany({ data: [{ postId: id, role: "COVER", order: 0, headline: post.title ?? null, imageUrl: image.imageUrl, r2Key: ownedR2Key(image.imageUrl, user.id, ["posts"])! }] })
    }
    return result
  })
  if (updated.count !== 1) return NextResponse.json({ error: "This post changed in another session. Your edits are preserved here. Copy them, then reopen the latest draft before saving." }, { status: 409 })
  return NextResponse.json({ postId: id, updatedAt }, { headers: { "Cache-Control": "no-store" } })
}
