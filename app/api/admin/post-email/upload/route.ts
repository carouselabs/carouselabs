// POST /api/admin/post-email/upload (form: file, kind) → { url, width, height }
// — a picture for a shared-post email (lib/postEmailUpload.ts): the author's
// photo, their banner, the post's picture, a slide, a GIF... made ready for
// inboxes and saved to R2 under email-post/.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { PostEmailError } from "@/lib/postEmailPictures"
import { MAX_UPLOAD_BYTES, UPLOAD_KINDS, savePostPicture, type UploadKind } from "@/lib/postEmailUpload"

export const maxDuration = 60

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  const kind = String(form?.get("kind") ?? "")
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a picture" }, { status: 400 })
  if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return NextResponse.json({ error: "Say what the picture is for" }, { status: 400 })
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "That file is over 4 MB. Use a smaller one." }, { status: 413 })
  try {
    const picture = await savePostPicture(Buffer.from(await file.arrayBuffer()), kind as UploadKind)
    return NextResponse.json(picture)
  } catch (err) {
    if (err instanceof PostEmailError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
