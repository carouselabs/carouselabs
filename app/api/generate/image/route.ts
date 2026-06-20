import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import OpenAI from "openai"
import sharp from "sharp"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { notifyFirstPostIfFirst } from "@/lib/email"
import type { Prisma } from "@prisma/client"

export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let ideaId: string
  let imagePrompt: string
  let caption: string
  let size: string

  try {
    const body = await req.json()
    ideaId = body.ideaId
    imagePrompt = body.imagePrompt
    caption = body.caption ?? ""
    // Only 4:5 and 1:1 are offered; default to 4:5 (LinkedIn feed) for restored
    // sessions where the client may not re-send the size.
    size = body.size === "1:1" ? "1:1" : "4:5"
    if (!ideaId || !imagePrompt) throw new Error("Missing ideaId or imagePrompt")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  // Call OpenAI gpt-image-1. gpt-image-1 returns base64 (b64_json), never a URL,
  // so the result must be uploaded to R2 below before it can be served.
  const openaiSize: "1024x1024" | "1024x1280" =
    size === "4:5" ? "1024x1280" : "1024x1024"
  let imageB64: string
  try {
    const imageResponse = await openai.images.generate({
      model: "gpt-image-2",
      prompt: imagePrompt,
      n: 1,
      size: openaiSize,
      quality: "medium",
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (imageResponse as any).data as Array<{ b64_json?: string }> | undefined
    const b64 = data?.[0]?.b64_json
    if (!b64) throw new Error("No image data returned")
    imageB64 = b64
  } catch (err) {
    console.error("[generate/image] OpenAI error:", err)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 502 })
  }

  // Re-encode with sharp to strip C2PA/content-credentials metadata (and any
  // EXIF/XMP/ICC). OpenAI embeds C2PA in generated images, which makes
  // LinkedIn/Instagram/X show a "Made with AI" badge and a CR icon. sharp
  // drops all metadata by default, leaving a clean PNG.
  let cleanedB64: string
  try {
    const cleanedBuffer = await sharp(Buffer.from(imageB64, "base64"))
      .png()
      .toBuffer()
    cleanedB64 = cleanedBuffer.toString("base64")
  } catch (err) {
    console.error("[generate/image] sharp re-encode error:", err)
    return NextResponse.json({ error: "Failed to process image" }, { status: 502 })
  }

  // Upload to Cloudflare R2
  const filename = `posts/${user.id}/${Date.now()}.png`
  let imageUrl: string
  try {
    imageUrl = await uploadToR2(cleanedB64, filename)
  } catch (err) {
    console.error("[generate/image] R2 upload error:", err)
    return NextResponse.json({ error: "Failed to store image" }, { status: 502 })
  }

  // Save Post + Slide to DB
  const post = await db.post.create({
    data: {
      userId: user.id,
      ideaId,
      title: idea.hook,
      caption,
      format: "SINGLE_IMAGE",
      status: "READY",
      imageUrls: [imageUrl],
      r2Keys: [filename],
      metadata: { imagePrompt, size } as unknown as Prisma.InputJsonValue,
      slides: {
        create: {
          role: "COVER",
          order: 0,
          headline: idea.hook,
          imageUrl,
          r2Key: filename,
        },
      },
    },
  })

  // First-ever post? Send the celebratory email. Best-effort — a failure here
  // must not fail the (already-succeeded) post creation.
  try {
    await notifyFirstPostIfFirst(user.id, user.email, user.profile?.name ?? "")
  } catch (err) {
    console.error("[generate/image] first-post email failed:", err)
  }

  return NextResponse.json({ imageUrl, postId: post.id })
}
