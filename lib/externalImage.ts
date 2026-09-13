// lib/externalImage.ts — fetch + re-host an externally-hosted image to R2.
// Shared by app/api/content-hub/custom-post/upload (the sourceUrl mode, used
// for re-hosting an Idea Board "image" item) and
// app/api/content-hub/bulk-upload (re-hosting each CSV row's imageUrl).
import { uploadToR2 } from "@/lib/r2"
import { validateReferenceImage } from "@/lib/validateImage"

const FETCH_TIMEOUT_MS = 10_000
const MAX_SOURCE_BYTES = 8 * 1024 * 1024 // pre-check cap; validateReferenceImage enforces the real 5MB decoded cap

// Blocks the obvious SSRF targets (loopback/private/link-local — the latter
// covers cloud metadata endpoints) by string-checking the hostname/literal
// IP. This does NOT resolve DNS itself, so it can't catch a hostname that
// only resolves to a private address at fetch time (DNS rebinding) — an
// accepted gap for a "re-host a user-supplied image URL" feature, not a
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

export function isSafeExternalUrl(raw: string): boolean {
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

export async function fetchExternalImageAsBase64(
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
    return {
      error: err instanceof Error && err.name === "AbortError" ? "Timed out fetching that image" : "Couldn't fetch that image",
    }
  } finally {
    clearTimeout(timeout)
  }
}

// Fetches `sourceUrl`, validates it, and uploads it to R2 under `folder/userId/...`.
// Throws a plain Error with a user-presentable message on any failure.
export async function reuploadExternalImage(sourceUrl: string, userId: string, folder: string): Promise<string> {
  if (!isSafeExternalUrl(sourceUrl)) throw new Error("Invalid or unsafe image URL")
  const fetched = await fetchExternalImageAsBase64(sourceUrl)
  if ("error" in fetched) throw new Error(fetched.error)

  const check = validateReferenceImage(fetched.base64, fetched.mediaType)
  if (!check.ok) throw new Error(check.error)

  const ext = check.mediaType === "image/png" ? "png" : check.mediaType === "image/webp" ? "webp" : "jpg"
  const filename = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  return uploadToR2(check.data, filename, check.mediaType)
}
