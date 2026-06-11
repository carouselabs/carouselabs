import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import OpenAI from "openai"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import type { Prisma } from "@prisma/client"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let ideaId: string
  let imagePrompt: string
  let caption: string

  try {
    const body = await req.json()
    ideaId = body.ideaId
    imagePrompt = body.imagePrompt
    caption = body.caption ?? ""
    if (!ideaId || !imagePrompt) throw new Error("Missing ideaId or imagePrompt")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  // Call OpenAI gpt-image-1
  let imageB64: string
  try {
    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
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

  // Upload to Cloudflare R2
  const filename = `posts/${user.id}/${Date.now()}.png`
  let imageUrl: string
  try {
    imageUrl = await uploadToR2(imageB64, filename)
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
      metadata: { imagePrompt } as unknown as Prisma.InputJsonValue,
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

  return NextResponse.json({ imageUrl, postId: post.id })
}
