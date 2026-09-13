// app/api/start-page/avatar/route.ts — uploads a Start Page avatar image to
// R2. Body: { imageBase64, mediaType }. Returns { url }. Same
// validate-then-upload pattern as app/api/content-hub/custom-post/upload
// (magic-byte + size checks via lib/validateImage.ts), kept as its own small
// route since it's a semantically distinct upload (avatars/, not custom-posts/).
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { uploadToR2 } from "@/lib/r2"
import { validateReferenceImage } from "@/lib/validateImage"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let imageBase64: string
  let mediaType: string

  try {
    const body = await req.json()
    if (typeof body.imageBase64 !== "string" || !body.imageBase64) throw new Error("Missing image")
    imageBase64 = body.imageBase64
    mediaType = typeof body.mediaType === "string" ? body.mediaType : "image/jpeg"
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const check = validateReferenceImage(imageBase64, mediaType)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const ext = check.mediaType === "image/png" ? "png" : check.mediaType === "image/webp" ? "webp" : "jpg"
  const filename = `avatars/${user.id}/${Date.now()}.${ext}`

  let url: string
  try {
    url = await uploadToR2(check.data, filename, check.mediaType)
  } catch (err) {
    console.error("[start-page/avatar] R2 upload failed:", err)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 502 })
  }

  return NextResponse.json({ url })
}
