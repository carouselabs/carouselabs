import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { draftSchema, ownedR2Key, slideRole } from "@/lib/postInput"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifyFirstPostIfFirst } from "@/lib/email"

const createSchema = draftSchema.extend({
  ideaId: z.string().min(1).max(128),
  requestId: z.uuid().optional(),
})

// Compare only meaningful draft content, in a stable field/slide order. Database
// IDs, timestamps and unrelated metadata must not turn an identical retry into
// a conflict; omitted optional JSON fields and database nulls are equivalent.
function metadataField(value: unknown, key: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key] ?? null : null
}

function draftCreateContent(post: {
  userId: string; ideaId: string | null; title: string; caption: string | null; format: string
  imageUrls: string[]; r2Keys: string[]; metadata?: unknown
  slides: { order: number; role: string; headline: string | null; imageUrl: string | null; r2Key: string | null; metadata?: unknown }[]
}): string {
  return JSON.stringify({
    userId: post.userId, ideaId: post.ideaId, title: post.title, caption: post.caption, format: post.format,
    imageUrls: post.imageUrls, r2Keys: post.r2Keys,
    size: metadataField(post.metadata, "size"), imagePrompt: metadataField(post.metadata, "imagePrompt"),
    slides: post.slides.slice().sort((a, b) => a.order - b.order).map((slide) => ({
      order: slide.order, role: slide.role, headline: slide.headline, imageUrl: slide.imageUrl,
      r2Key: slide.r2Key, prompt: metadataField(slide.metadata, "prompt"),
    })),
  })
}

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const search = new URL(req.url).searchParams
  const ideaId = search.get("ideaId")
  const format = search.get("format")
  if (!ideaId || ideaId.length > 128) return NextResponse.json({ error: "Invalid ideaId" }, { status: 400 })
  if (format && !["TEXT_ONLY", "SINGLE_IMAGE", "CAROUSEL"].includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  }
  const post = await db.post.findFirst({
    where: { userId: user.id, ideaId, ...(format ? { format: format as "TEXT_ONLY" | "SINGLE_IMAGE" | "CAROUSEL" } : {}) },
    orderBy: { updatedAt: "desc" },
    select: { id: true, caption: true, format: true, imageUrls: true, metadata: true, updatedAt: true,
      slides: { orderBy: { order: "asc" }, select: { order: true, role: true, headline: true, imageUrl: true, metadata: true } } },
  })
  return NextResponse.json({ post }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const result = createSchema.safeParse(await req.json().catch(() => null))
  if (!result.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  const { ideaId, caption, requestId, slides, size, image } = result.data
  if (slides && image) return NextResponse.json({ error: "Choose a carousel or a single image" }, { status: 400 })
  if (image && !ownedR2Key(image.imageUrl, user.id, ["posts"])) return NextResponse.json({ error: "Invalid post image" }, { status: 400 })
  if (slides?.some((s) => !ownedR2Key(s.imageUrl, user.id, ["carousel"]))) {
    return NextResponse.json({ error: "Invalid slide image" }, { status: 400 })
  }
  const idea = await db.idea.findFirst({ where: { id: ideaId, userId: user.id }, select: { hook: true } })
  if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  const orderedSlides = slides?.slice().sort((a, b) => a.slideNumber - b.slideNumber)
  const data = { userId: user.id, ideaId, title: idea.hook, caption,
    format: orderedSlides ? "CAROUSEL" as const : image ? "SINGLE_IMAGE" as const : "TEXT_ONLY" as const,
    status: orderedSlides || image ? "READY" as const : "DRAFT" as const,
    imageUrls: orderedSlides?.map((s) => s.imageUrl) ?? (image ? [image.imageUrl] : []),
    r2Keys: orderedSlides?.map((s) => ownedR2Key(s.imageUrl, user.id)!) ?? (image ? [ownedR2Key(image.imageUrl, user.id, ["posts"])!] : []),
    ...(orderedSlides ? { metadata: { size: size ?? "4:5" }, slides: { create: orderedSlides.map((s) => ({
      role: slideRole[s.role], order: s.slideNumber, headline: s.headline, imageUrl: s.imageUrl,
      ...(s.prompt !== undefined ? { metadata: { prompt: s.prompt } } : {}),
      r2Key: ownedR2Key(s.imageUrl, user.id)!,
    })) } } : image ? { metadata: { size: size ?? "4:5", imagePrompt: image.imagePrompt }, slides: { create: [{ role: "COVER" as const, order: 0, headline: idea.hook, imageUrl: image.imageUrl, r2Key: ownedR2Key(image.imageUrl, user.id, ["posts"])! }] } } : {}),
  }
  // A client-generated operation ID is namespaced by the authenticated owner.
  // Replaying a lost response returns the original row, never another draft.
  const id = requestId ? `draft_${createHash("sha256").update(`${user.id}:${requestId}`).digest("hex")}` : null
  const include = { slides: { select: { order: true, role: true, headline: true, imageUrl: true, r2Key: true, metadata: true } } } as const
  const post = id
    ? await db.post.upsert({ where: { id }, update: {}, create: { id, ...data }, include })
    : await db.post.create({ data, include })
  if (draftCreateContent(post) !== draftCreateContent({ ...data, slides: "slides" in data ? data.slides.create : [] })) {
    return NextResponse.json({ error: "This save already completed with different content. Your edits are still here. Copy them, then reopen the saved draft before saving again." }, { status: 409 })
  }
  try { await notifyFirstPostIfFirst(user.id, user.email, user.profile?.name ?? "") }
  catch { console.error("[posts] first-post email failed") }
  return NextResponse.json({ postId: post.id, updatedAt: post.updatedAt }, { headers: { "Cache-Control": "no-store" } })
}
