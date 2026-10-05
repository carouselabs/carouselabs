// Fetch external images with DNS-pinned public destinations and bounded reads.
import { uploadToR2 } from "@/lib/r2"
import { validateReferenceImage } from "@/lib/validateImage"
import { fetchPublicImage, isSafeExternalUrl } from "@/lib/safeRemoteImage"

export { isSafeExternalUrl } from "@/lib/safeRemoteImage"

export async function fetchExternalImageAsBase64(
  url: string,
): Promise<{ base64: string; mediaType: string } | { error: string }> {
  try {
    const { bytes, mediaType } = await fetchPublicImage(url, { maxBytes: 5 * 1024 * 1024 })
    return { base64: bytes.toString("base64"), mediaType }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't fetch that image" }
  }
}

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
