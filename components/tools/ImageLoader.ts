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

export async function loadImage(file: File): Promise<LoadedImage> {
  if (!/image\/(jpeg|png|webp)/.test(file.type)) throw new Error("Unsupported image type")

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
    image.onerror = () => reject(new Error("Image could not be decoded"))
    image.src = url
  })
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) }
}
