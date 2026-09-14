export type LoadedImage = {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

export const MAX_EDITOR_WIDTH = 1216

export function fitImage(width: number, height: number, maxWidth = MAX_EDITOR_WIDTH) {
  const scale = Math.min(1, maxWidth / width)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// Some older tools/OS MIME registrations report PNGs as the legacy
// "image/x-png" type instead of "image/png" (pre-standardization browsers
// used it, and some scanners/screenshot/editing tools on Windows still do) —
// a genuinely valid PNG was being rejected here before decoding was even
// attempted. Also fall back to the file extension when file.type is empty
// (some OS/browser combinations never populate it at all), rather than
// rejecting a file the browser simply couldn't identify by MIME.
const SUPPORTED_MIME = /^image\/(jpeg|pjpeg|png|x-png|webp)$/i
const SUPPORTED_EXTENSION = /\.(jpe?g|png|webp)$/i

export async function loadImage(file: File): Promise<LoadedImage> {
  if (!SUPPORTED_MIME.test(file.type) && !SUPPORTED_EXTENSION.test(file.name)) {
    throw new Error("That file type isn't supported. Please upload a JPG, PNG, or WebP image.")
  }

  // ImageBitmap keeps decoded pixels off the React/render path where supported.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() }
    } catch {
      // Safari and a few older browsers can reject some otherwise valid files.
    }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () =>
      reject(new Error("That image couldn't be opened — it may be corrupted. Try re-exporting it or use a different file."))
    image.src = url
  })
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) }
}
