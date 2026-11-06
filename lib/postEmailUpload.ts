// lib/postEmailUpload.ts — pictures the admin uploads for a shared-post email
// (lib/postEmail.ts), made ready for inboxes before they're saved to R2 under
// email-post/up/: turned the right way up, cut or shrunk to what the email
// shows (at twice its size, for sharp screens) and saved as JPEG, so a photo
// straight off a phone doesn't make the email slow. A GIF keeps moving and is
// shrunk to the card's width.
import { randomUUID } from "node:crypto"
import sharp from "sharp"
import { uploadToR2 } from "@/lib/r2"
import { CARD_WIDTH, type Picture } from "@/lib/postEmail"
import { POST_FOLDER, PostEmailError } from "@/lib/postEmailPictures"

export const UPLOAD_KINDS = ["photo", "small", "banner", "media", "slide", "gif"] as const
export type UploadKind = (typeof UPLOAD_KINDS)[number]

// Under what one request may carry on Vercel (4.5 MB); the page shrinks
// photos before sending them, so only a GIF comes close.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const GIF_MAX_BYTES = 1.5 * 1024 * 1024
const FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif"])

const W = CARD_WIDTH * 2

async function jpeg(img: ReturnType<typeof sharp>, quality = 84): Promise<{ buf: Buffer; width: number; height: number }> {
  const { data, info } = await img.flatten({ background: "#FFFFFF" }).jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true })
  return { buf: data, width: info.width, height: info.height }
}

/** A picture as the email shows it: a square photo, a 4:1 banner, or the post's own. */
export async function preparePicture(input: Buffer, kind: UploadKind): Promise<{ buf: Buffer; width: number; height: number; type: string }> {
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>
  try {
    meta = await sharp(input).metadata()
  } catch {
    throw new PostEmailError("That file isn't a picture we can read. Use a JPG, PNG, WebP or GIF.")
  }
  if (!meta.format || !FORMATS.has(meta.format)) throw new PostEmailError("Use a JPG, PNG, WebP or GIF.")
  const moving = (meta.pages ?? 1) > 1
  if (kind === "gif" && moving) return { ...(await prepareGif(input)), type: "image/gif" }

  // Turned the right way up first, so its size is the size it shows at.
  const upright = await sharp(input, { failOn: "none" }).rotate().toBuffer({ resolveWithObject: true })
  const img = sharp(upright.data)
  const square = (size: number) => img.resize(size, size, { fit: "cover", position: "attention" })
  switch (kind) {
    case "photo":
      return { ...(await jpeg(square(400), 88)), type: "image/jpeg" }
    case "small":
      return { ...(await jpeg(square(160), 88)), type: "image/jpeg" }
    case "banner":
      return { ...(await jpeg(img.resize(1584, 396, { fit: "cover", position: "attention" }))), type: "image/jpeg" }
    case "slide":
      return { ...(await jpeg(img.resize(W, Math.round(W * 1.5), { fit: "inside", withoutEnlargement: true }), 88)), type: "image/jpeg" }
    default: {
      // The post's own picture, at most 3:2 tall (taller ones keep their top,
      // where the words usually are).
      const width = Math.min(W, upright.info.width)
      const height = Math.round((width * upright.info.height) / upright.info.width)
      const resized = img.resize(width, Math.min(height, Math.round(width * 1.5)), { fit: "cover", position: "top" })
      return { ...(await jpeg(resized)), type: "image/jpeg" }
    }
  }
}

// A moving GIF at the card's width: fewer colours until it's small enough.
async function prepareGif(input: Buffer): Promise<{ buf: Buffer; width: number; height: number }> {
  let smallest: { buf: Buffer; width: number; height: number } | null = null
  for (const colours of [256, 128, 64, 32]) {
    const { data, info } = await sharp(input, { animated: true, failOn: "none" })
      .resize({ width: CARD_WIDTH, withoutEnlargement: true })
      .gif({ colours, effort: 8, dither: 0.7 })
      .toBuffer({ resolveWithObject: true })
    const out = { buf: data, width: info.width, height: info.pageHeight ?? info.height }
    if (!smallest || out.buf.length < smallest.buf.length) smallest = out
    if (data.length <= GIF_MAX_BYTES) return out
  }
  if (smallest && smallest.buf.length <= GIF_MAX_BYTES * 1.6) return smallest
  throw new PostEmailError("This GIF is too big for an email, even shrunk. Use a shorter one.")
}

/** Prepares an uploaded picture and saves it: what the email points at. */
export async function savePostPicture(input: Buffer, kind: UploadKind): Promise<Picture> {
  if (input.length > MAX_UPLOAD_BYTES) throw new PostEmailError("That file is over 4 MB. Use a smaller one.", 413)
  const ready = await preparePicture(input, kind)
  const ext = ready.type === "image/gif" ? "gif" : "jpg"
  const url = await uploadToR2(ready.buf.toString("base64"), `${POST_FOLDER}/up/${randomUUID()}.${ext}`, ready.type)
  return { url, width: ready.width, height: ready.height }
}

/**
 * A part of a screenshot (the author's photo, the post's picture), from a
 * box given as fractions of its width and height, saved like an upload.
 */
export async function savePostCrop(screenshot: Buffer, box: [number, number, number, number], kind: UploadKind): Promise<Picture | null> {
  const meta = await sharp(screenshot).metadata()
  if (!meta.width || !meta.height) return null
  const [x0, y0, x1, y1] = box.map((v) => Math.min(1, Math.max(0, v)))
  const left = Math.round(x0 * meta.width)
  const top = Math.round(y0 * meta.height)
  const width = Math.round((x1 - x0) * meta.width)
  const height = Math.round((y1 - y0) * meta.height)
  if (width < 24 || height < 24) return null
  const cut = await sharp(screenshot).extract({ left, top, width, height }).png().toBuffer()
  return savePostPicture(cut, kind)
}
