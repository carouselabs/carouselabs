// app/api/content-hub/custom-post/upload/route.ts
// POST — uploads one image to R2 for a Custom Post, either:
//   { imageBase64, mediaType } — already downscaled + re-encoded client-side
//     (see components/content-hub/CustomPostImageUploader.tsx)
//   { sourceUrl } — re-hosts an externally captured image (e.g. an "image"
//     type Idea Board item saved via the browser extension) so it satisfies
//     the same "every Custom Post image URL must be one of ours" invariant
//     as any other upload (see app/api/content-hub/custom-post/route.ts),
//     and so it survives even if the original page later changes or 404s.
//     See lib/externalImage.ts for the fetch/validate/upload logic (shared
//     with app/api/content-hub/bulk-upload).
// Returns { url }.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { uploadToR2 } from "@/lib/r2"
import { validateReferenceImage } from "@/lib/validateImage"
import { reuploadExternalImage } from "@/lib/externalImage"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let imageBase64: string
  let mediaType: string
  let sourceUrl: string | null = null

  try {
    const body = await req.json()
    if (typeof body.sourceUrl === "string" && body.sourceUrl) {
      sourceUrl = body.sourceUrl
      imageBase64 = ""
      mediaType = ""
    } else {
      if (typeof body.imageBase64 !== "string" || !body.imageBase64) throw new Error("Missing image")
      imageBase64 = body.imageBase64
      mediaType = typeof body.mediaType === "string" ? body.mediaType : "image/jpeg"
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  if (sourceUrl) {
    try {
      const url = await reuploadExternalImage(sourceUrl, user.id, "custom-posts")
      return NextResponse.json({ url })
    } catch (err) {
      console.error("[content-hub/custom-post/upload] sourceUrl re-host failed:", err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to fetch that image" },
        { status: 400 },
      )
    }
  }

  const check = validateReferenceImage(imageBase64, mediaType)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const ext = check.mediaType === "image/png" ? "png" : check.mediaType === "image/webp" ? "webp" : "jpg"
  const filename = `custom-posts/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  let url: string
  try {
    url = await uploadToR2(check.data, filename, check.mediaType)
  } catch (err) {
    console.error("[content-hub/custom-post/upload] R2 upload failed:", err)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 502 })
  }

  return NextResponse.json({ url })
}
