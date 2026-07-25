import * as UPNG from "upng-js"

export type ExportFormat = "png" | "webp"

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Best-effort Kakushie PNG-8 encoder. X's private compression behavior can change. */
export async function exportTapHoldImage(base: CanvasImageSource, mask: CanvasImageSource, width: number, height: number, format: ExportFormat) {
  const outputWidth = 2432
  const outputHeight = Math.round((height / width) * outputWidth)
  const output = document.createElement("canvas")
  output.width = outputWidth
  output.height = outputHeight
  const context = output.getContext("2d", { willReadFrequently: true })!
  context.drawImage(base, 0, 0, outputWidth, outputHeight)

  const maskCanvas = document.createElement("canvas")
  maskCanvas.width = outputWidth
  maskCanvas.height = outputHeight
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true })!
  maskContext.drawImage(mask, 0, 0, outputWidth, outputHeight)
  const pixels = context.getImageData(0, 0, outputWidth, outputHeight)
  const maskPixels = maskContext.getImageData(0, 0, outputWidth, outputHeight).data
  for (let index = 0; index < pixels.data.length; index += 4) {
    const pixel = index / 4
    const x = pixel % outputWidth
    const y = Math.floor(pixel / outputWidth)
    if (maskPixels[index + 3] < 24 && (x + y) % 2 === 1) pixels.data[index + 3] = 0
  }
  context.putImageData(pixels, 0, 0)

  const timestamp = Date.now()
  if (format === "png") {
    const encoded = UPNG.encode([pixels.data.buffer as ArrayBuffer], outputWidth, outputHeight, 256)
    download(new Blob([encoded], { type: "image/png" }), `tap-hold-image-${timestamp}.png`)
    return
  }
  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/webp", 0.92))
  if (!blob) throw new Error("WebP export failed")
  download(blob, `tap-hold-image-${timestamp}.webp`)
}
