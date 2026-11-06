// POST /api/admin/post-email/screenshot (form: file) → { read, pictures } —
// "Fill from screenshot": the AI copies what a screenshot of a LinkedIn post
// shows (lib/ai/postEmailAi.ts), and the author's photo, the post's picture
// and the comment's photo are cut out of it (lib/postEmailUpload.ts) for the
// admin to check. The screenshot itself isn't kept.
import { NextResponse } from "next/server"
import sharp from "sharp"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { PostEmailAiError, readPostScreenshot } from "@/lib/ai/postEmailAi"
import { PostEmailError } from "@/lib/postEmailPictures"
import { MAX_UPLOAD_BYTES, savePostCrop } from "@/lib/postEmailUpload"
import type { Picture } from "@/lib/postEmail"

export const maxDuration = 120

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a screenshot" }, { status: 400 })
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "That screenshot is over 4 MB. Use a smaller one." }, { status: 413 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "The AI isn't set up here (ANTHROPIC_API_KEY)." }, { status: 503 })

  let screenshot: Buffer
  let forAi: Buffer
  try {
    screenshot = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" }).rotate().png().toBuffer()
    // The model reads up to about 1,568 pixels on the long side.
    forAi = await sharp(screenshot).resize(1568, 1568, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()
  } catch {
    return NextResponse.json({ error: "That file isn't a picture we can read. Use a PNG or JPG screenshot." }, { status: 400 })
  }

  try {
    const read = await readPostScreenshot({ base64: forAi.toString("base64"), mediaType: "image/jpeg" })
    // Cut out what it found; one that can't be cut is simply left for the admin to upload.
    const cut = async (box: [number, number, number, number] | null, kind: "photo" | "small" | "media"): Promise<Picture | null> =>
      box ? savePostCrop(screenshot, box, kind).catch(() => null) : null
    const [authorPhoto, media, commentPhoto, repostPhoto] = await Promise.all([
      cut(read.boxes.authorPhoto, "photo"),
      cut(read.boxes.media, "media"),
      cut(read.boxes.commentPhoto, "small"),
      cut(read.boxes.repostPhoto, "small"),
    ])
    return NextResponse.json({ read, pictures: { authorPhoto, media, commentPhoto, repostPhoto } })
  } catch (err) {
    if (err instanceof PostEmailAiError || err instanceof PostEmailError) return NextResponse.json({ error: err.message }, { status: 422 })
    console.error("[post-email] screenshot read failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "The AI couldn't read it just now. Try again in a minute." }, { status: 502 })
  }
}
