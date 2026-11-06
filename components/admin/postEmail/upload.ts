// Uploading a picture for a shared-post email from the admin's browser
// (app/api/admin/post-email/upload): a big photo is shrunk here first, so it
// fits in one request (Vercel takes about 4.5 MB) and goes up quickly. A GIF
// is sent as it is, so it keeps moving.
import type { Picture } from "@/lib/postEmail"
import type { UploadKind } from "@/lib/postEmailUpload"

const MAX_SIDE = 2400
const MAX_BYTES = 4 * 1024 * 1024

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Something went wrong")
  return data as T
}

/** A photo at most 2,400 pixels on its long side, as a JPEG (a GIF as it is). */
export async function shrinkForUpload(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file
  if (file.size <= 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
    return blob ?? file
  } catch {
    // A picture the browser can't open: let the server say what's wrong.
    return file
  }
}

export async function uploadPicture(file: File, kind: UploadKind): Promise<Picture> {
  const blob = await shrinkForUpload(file)
  if (blob.size > MAX_BYTES) throw new Error(`${file.name} is over 4 MB${file.type === "image/gif" ? ". Use a shorter GIF." : "."}`)
  const form = new FormData()
  form.append("file", blob, file.name)
  form.append("kind", kind)
  return json<Picture>(await fetch("/api/admin/post-email/upload", { method: "POST", body: form }))
}

export { json }
