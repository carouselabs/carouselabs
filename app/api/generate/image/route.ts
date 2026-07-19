import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { db } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { notifyFirstPostIfFirst } from "@/lib/email"
import { validateReferenceImage } from "@/lib/validateImage"
import type { Prisma } from "@prisma/client"

export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Image generation doesn't consume a credit but does cost real OpenAI money per
// call, so cap regenerations at 20/hour per user.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: false,
})

// Strip authoring scaffolding (## headers, separator lines, markdown emphasis,
// bullets) so gpt-image-2 receives clean prose — same treatment as the
// carousel-images route.
const cleanPrompt = (prompt: string) =>
  prompt
    .replace(/^#+\s+.*$/gm, "") // remove ## headers
    .replace(/^━+\s*$/gm, "") // remove separator lines
    .replace(/\*\*/g, "") // remove bold markdown
    .replace(/•\s*/g, "") // remove bullets
    .replace(/\n{3,}/g, "\n\n") // collapse newlines
    .trim()

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`generate:image:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  let ideaId: string
  let imagePrompt: string
  let caption: string
  let size: string
  let referenceImageBase64: string | undefined
  let referenceMediaType: string

  try {
    const body = await req.json()
    ideaId = body.ideaId
    imagePrompt = body.imagePrompt
    caption = body.caption ?? ""
    // Only 4:5 and 1:1 are offered; default to 4:5 (LinkedIn feed) for restored
    // sessions where the client may not re-send the size.
    size = body.size === "1:1" ? "1:1" : "4:5"
    // Optional style reference — when present, the image is generated with
    // images.edit so gpt-image-2 sees the reference alongside the prompt.
    referenceImageBase64 =
      typeof body.referenceImage === "string" ? body.referenceImage : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"
    if (!ideaId || !imagePrompt) throw new Error("Missing ideaId or imagePrompt")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Validate the reference image (size / type / magic bytes) before it reaches
  // OpenAI. Replaces the client-supplied values with the cleaned, verified ones.
  if (referenceImageBase64) {
    const check = validateReferenceImage(referenceImageBase64, referenceMediaType)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }
    referenceImageBase64 = check.data
    referenceMediaType = check.mediaType
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
    const finalPrompt = cleanPrompt(imagePrompt)

    // Style guard appended at the image stage (mirrors carousel-images):
    // phrased as conditionals on what the reference actually shows, so it works
    // for any reference the user uploads — nothing brand- or color-specific.
    const editPrompt = `${finalPrompt}\n\nThe attached image is a style reference only. Keep the same background tone as the reference — a light reference background stays light, a dark one stays dark; never flood the design with the accent color. Keep the same headline text color, the same font style (weight, width, casing), and the same accent color proportions as the reference. Match its illustration and rendering style. Create a completely new composition; do not copy its content, layout, or text. Wherever the reference shows a logo, wordmark, or watermark, render clean empty background instead — zero logos and zero brand names on the finished image; the only text is the text specified in this prompt.`

    // With a style reference, use images.edit so gpt-image-2 receives the
    // reference image itself alongside the prompt; otherwise plain generate.
    const imageResponse = referenceImageBase64
      ? await openai.images.edit({
          model: "gpt-image-2",
          image: await toFile(
            Buffer.from(
              referenceImageBase64.replace(/^data:image\/\w+;base64,/, ""),
              "base64",
            ),
            referenceMediaType === "image/png" ? "reference.png" : "reference.jpg",
            { type: referenceMediaType || "image/jpeg" },
          ),
          prompt: editPrompt,
          n: 1,
          size: openaiSize,
          quality: "medium",
        })
      : await openai.images.generate({
          model: "gpt-image-2",
          prompt: finalPrompt,
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
