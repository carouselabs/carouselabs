export type BrushPoint = { x: number; y: number; pressure: number }
type DirtyRegion = { x: number; y: number; width: number; height: number }

const STAMP_SPACING = 1.5

export class BrushEngine {
  private readonly context: CanvasRenderingContext2D
  private readonly pending: BrushPoint[] = []
  private readonly stamps = new Map<number, CanvasImageSource>()
  private lastPoint: BrushPoint | null = null
  private frame = 0
  private size = 48
  private onFlush: ((region: DirtyRegion) => void) | null = null

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d")!
  }

  setSize(size: number) { this.size = size }

  start(point: BrushPoint) {
    this.lastPoint = null
    this.enqueue(point)
  }

  enqueue(point: BrushPoint) {
    this.pending.push(point)
    if (!this.frame) this.frame = requestAnimationFrame(() => this.flush())
  }

  enqueueMany(points: BrushPoint[]) {
    this.pending.push(...points)
    if (!this.frame) this.frame = requestAnimationFrame(() => this.flush())
  }

  finish() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
    this.flush()
    this.lastPoint = null
  }

  destroy() { if (this.frame) cancelAnimationFrame(this.frame) }
  setOnFlush(callback: (region: DirtyRegion) => void) { this.onFlush = callback }

  private flush() {
    this.frame = 0
    if (!this.pending.length) return
    const points = this.pending.splice(0)
    const dirty: DirtyRegion = { x: this.canvas.width, y: this.canvas.height, width: 0, height: 0 }
    for (const point of points) this.drawInterpolated(point, dirty)
    this.onFlush?.({
      x: Math.max(0, dirty.x),
      y: Math.max(0, dirty.y),
      width: Math.min(this.canvas.width, dirty.width - dirty.x) - Math.max(0, dirty.x),
      height: Math.min(this.canvas.height, dirty.height - dirty.y) - Math.max(0, dirty.y),
    })
  }

  private drawInterpolated(current: BrushPoint, dirty: DirtyRegion) {
    const previous = this.lastPoint
    if (!previous) {
      this.stamp(current.x, current.y, this.radius(current), dirty)
      this.lastPoint = current
      return
    }

    const distance = Math.hypot(current.x - previous.x, current.y - previous.y)
    // At most 1.5 logical pixels separate stamps, regardless of pointer speed.
    const steps = Math.max(1, Math.ceil(distance / STAMP_SPACING))
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      const x = previous.x + (current.x - previous.x) * t
      const y = previous.y + (current.y - previous.y) * t
      const pressure = previous.pressure + (current.pressure - previous.pressure) * t
      this.stamp(x, y, this.radius({ x, y, pressure }), dirty)
    }
    this.lastPoint = current
  }

  private radius(point: BrushPoint) {
    return Math.max(5, (this.size * Math.max(0.1, point.pressure)) / 2)
  }

  private stamp(x: number, y: number, radius: number, dirty: DirtyRegion) {
    const texture = this.getStamp(radius)
    this.context.drawImage(texture, x - radius, y - radius, radius * 2, radius * 2)
    dirty.x = Math.min(dirty.x, x - radius - 1)
    dirty.y = Math.min(dirty.y, y - radius - 1)
    dirty.width = Math.max(dirty.width, x + radius + 1)
    dirty.height = Math.max(dirty.height, y + radius + 1)
  }

  private getStamp(radius: number) {
    const key = Math.round(radius * 2) / 2
    const cached = this.stamps.get(key)
    if (cached) return cached
    const diameter = Math.max(2, Math.ceil(key * 2))
    const stamp = document.createElement("canvas")
    stamp.width = diameter
    stamp.height = diameter
    const context = stamp.getContext("2d")!
    const center = diameter / 2
    const gradient = context.createRadialGradient(center, center, key * 0.12, center, center, key)
    gradient.addColorStop(0, "rgba(124,58,237,1)")
    gradient.addColorStop(0.74, "rgba(124,58,237,0.94)")
    gradient.addColorStop(1, "rgba(124,58,237,0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, diameter, diameter)
    this.stamps.set(key, stamp)
    return stamp
  }
}
