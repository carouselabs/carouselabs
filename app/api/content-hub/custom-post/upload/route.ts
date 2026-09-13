// app/api/content-hub/custom-post/upload/route.ts
// POST — uploads one image to R2 for a Custom Post, either:
//   { imageBase64, mediaType } — already downscaled + re-encoded client-side
//     (see components/content-hub/CustomPostImageUploader.tsx)
//   { sourceUrl } — re-hosts an externally captured image (e.g. an "image"
//     type Idea Board item saved via the browser extension) so it satisfies
//     the same "every Custom Post image URL must be one of ours" invariant
//     as any other upload (see app/api/content-hub/custom-post/route.ts),
//     and so it survives even if the original page later changes or 404s.
// Returns { url }. Reuses the same magic-byte + size validation as
// reference-image uploads (lib/validateImage.ts) since this is
// public-user-facing input, not admin-trusted.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { uploadToR2 } from "@/lib/r2"
import { validateReferenceImage } from "@/lib/validateImage"

const FETCH_TIMEOUT_MS = 10_000
const MAX_SOURCE_BYTES = 8 * 1024 * 1024 // pre-check cap; validateReferenceImage enforces the real 5MB decoded cap

// Blocks the obvious SSRF targets (loopback/private/link-local — the latter
// covers cloud metadata endpoints) by string-checking the hostname/literal
// IP. This does NOT resolve DNS itself, so it can't catch a hostname that
// only resolves to a private address at fetch time (DNS rebinding) — an
// accepted gap for a "re-host a captured idea image" feature, not a
// general-purpose URL fetcher.
function isPrivateOrLoopbackIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 127 || a === 10 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

function isSafeExternalUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  const host = url.hostname.toLowerCase()
  if (host === "localhost" || host === "0.0.0.0" || host === "::1") return false
  if (isPrivateOrLoopbackIPv4(host)) return false
  return true
}

async function fetchExternalImageAsBase64(
  url: string,
): Promise<{ base64: string; mediaType: string } | { error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" })
    if (!res.ok) return { error: `Couldn't fetch that image (status ${res.status})` }
    const contentLength = Number(res.headers.get("content-length") ?? "0")
    if (contentLength > MAX_SOURCE_BYTES) return { error: "Image too large" }
    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_SOURCE_BYTES) return { error: "Image too large" }
    const mediaType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim()
    return { base64: Buffer.from(arrayBuffer).toString("base64"), mediaType }
  } catch (err) {
    return { error: err instanceof Error && err.name === "AbortError" ? "Timed out fetching that image" : "Couldn't fetch that image" }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let imageBase64: string
  let mediaType: string

  try {
    const body = await req.json()

    if (typeof body.sourceUrl === "string" && body.sourceUrl) {
      if (!isSafeExternalUrl(body.sourceUrl)) throw new Error("Invalid or unsafe image URL")
      const fetched = await fetchExternalImageAsBase64(body.sourceUrl)
      if ("error" in fetched) throw new Error(fetched.error)
      imageBase64 = fetched.base64
      mediaType = fetched.mediaType
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
