// lib/validateImage.ts
// Validates a client-supplied reference image (base64) before it's forwarded to
// Claude's vision API: enforces an allowlisted media type, a 5MB decoded-size
// cap, and a magic-byte check so the bytes actually match the claimed format.
// Never trust the client-supplied media type or size blindly.

const MAX_DECODED_BYTES = 5 * 1024 * 1024 // 5MB

export type AllowedImageType = "image/png" | "image/jpeg" | "image/webp"

const ALLOWED_TYPES: AllowedImageType[] = ["image/png", "image/jpeg", "image/webp"]

type ValidationResult =
  | { ok: true; data: string; mediaType: AllowedImageType }
  | { ok: false; error: string }

// Checks the leading bytes of the buffer against the signature for `type`.
function magicBytesMatch(buf: Buffer, type: AllowedImageType): boolean {
  if (type === "image/png") {
    // 89 50 4E 47 0D 0A 1A 0A
    return (
      buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    )
  }
  if (type === "image/jpeg") {
    // FF D8 FF
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  }
  // image/webp: "RIFF"<4 bytes>"WEBP"
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
}

// Returns the cleaned (data-URL-prefix-stripped) base64 and the validated media
// type on success, or an error message suitable for a 400 response.
export function validateReferenceImage(
  rawBase64: string,
  mediaType: string,
): ValidationResult {
  if (!ALLOWED_TYPES.includes(mediaType as AllowedImageType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPEG, or WEBP." }
  }
  const type = mediaType as AllowedImageType

  // Strip an optional data-URL prefix (e.g. "data:image/png;base64,....").
  const data = rawBase64.replace(/^data:image\/\w+;base64,/, "")

  // Buffer.from(base64) silently drops invalid chars rather than throwing, so an
  // empty result is our signal that the input wasn't usable base64.
  const buf = Buffer.from(data, "base64")
  if (buf.length === 0) return { ok: false, error: "Invalid image data" }
  if (buf.length > MAX_DECODED_BYTES) {
    return { ok: false, error: "Reference image too large (max 5MB)" }
  }
  if (!magicBytesMatch(buf, type)) {
    return { ok: false, error: "Image data does not match the declared format" }
  }
  return { ok: true, data, mediaType: type }
}
