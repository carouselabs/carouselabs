import { fitImage, type LoadedImage } from "./ImageLoader"

type DirtyRect = { x: number; y: number; width: number; height: number }

function makeCanvas(width = 1, height = 1) {
  // OffscreenCanvas avoids DOM layout work for the immutable base/preview buffers.
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

type WorkCanvas = OffscreenCanvas | HTMLCanvasElement

export class CanvasRenderer {
  readonly base: WorkCanvas = makeCanvas()
  readonly mask: HTMLCanvasElement = document.createElement("canvas")
  private readonly previewLayer: WorkCanvas = makeCanvas()
  // Reserved transparent UI layer for guides/selection affordances. Keeping it
  // separate prevents UI pixels from ever leaking into the image or mask.
  private readonly uiOverlay: WorkCanvas = makeCanvas()
  private readonly renderContext: CanvasRenderingContext2D
  private frame = 0
  private needsRender = false
  private loadedImage: LoadedImage | null = null

  constructor(private readonly composite: HTMLCanvasElement) {
    this.renderContext = composite.getContext("2d")!
  }

  load(image: LoadedImage) {
    this.loadedImage?.dispose()
    this.loadedImage = image
    const size = fitImage(image.width, image.height)
    for (const canvas of [this.base, this.mask, this.previewLayer, this.uiOverlay, this.composite]) {
      canvas.width = size.width
      canvas.height = size.height
    }
    const baseContext = this.base.getContext("2d")!
    baseContext.clearRect(0, 0, size.width, size.height)
    // The base is written exactly once. It is never redrawn while painting.
    baseContext.drawImage(image.source, 0, 0, size.width, size.height)
    this.mask.getContext("2d")!.clearRect(0, 0, size.width, size.height)
    this.markDirty({ x: 0, y: 0, width: size.width, height: size.height })
  }

  markDirty(region: DirtyRect) {
    // Region is intentionally accepted for the brush API, but the editor is
    // recomposed from clean layers to prevent translucent-mask ghost pixels.
    void region
    this.needsRender = true
    if (!this.frame) this.frame = requestAnimationFrame(() => this.render())
  }

  render() {
    this.frame = 0
    if (!this.needsRender) return
    this.needsRender = false
    const context = this.renderContext
    const { width, height } = this.composite
    // Never retain prior composite pixels. Base, mask, and UI are distinct
    // layers; the brush cursor is a separate transparent DOM canvas.
    context.clearRect(0, 0, width, height)
    context.drawImage(this.base, 0, 0)
    // The editor overlay is deliberately light: it marks the mask without
    // obscuring the source image the creator is trying to inspect.
    context.globalAlpha = 0.18
    context.drawImage(this.mask, 0, 0)
    context.globalAlpha = 1
    context.drawImage(this.uiOverlay, 0, 0)
  }

  renderPreviews(timeline: HTMLCanvasElement, reveal: HTMLCanvasElement) {
    const width = this.composite.width
    const height = this.composite.height
    for (const canvas of [timeline, reveal, this.previewLayer]) {
      canvas.width = width
      canvas.height = height
    }
    const layer = this.previewLayer.getContext("2d")!
    layer.clearRect(0, 0, width, height)
    layer.drawImage(this.base, 0, 0)
    layer.globalCompositeOperation = "destination-in"
    layer.drawImage(this.mask, 0, 0)
    layer.globalCompositeOperation = "source-over"

    const timelineContext = timeline.getContext("2d")!
    timelineContext.fillStyle = "#fff"
    timelineContext.fillRect(0, 0, width, height)
    timelineContext.drawImage(this.previewLayer, 0, 0)

    const revealContext = reveal.getContext("2d")!
    revealContext.fillStyle = "#000"
    revealContext.fillRect(0, 0, width, height)
    // This is intentionally lightweight: the exact alpha checkerboard is built only at export.
    revealContext.globalAlpha = 0.55
    revealContext.drawImage(this.composite, 0, 0)
    revealContext.globalAlpha = 1
    revealContext.drawImage(this.previewLayer, 0, 0)
  }

  clearMask() {
    this.mask.getContext("2d")!.clearRect(0, 0, this.mask.width, this.mask.height)
    this.markDirty({ x: 0, y: 0, width: this.mask.width, height: this.mask.height })
  }

  dispose() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.loadedImage?.dispose()
  }
}
