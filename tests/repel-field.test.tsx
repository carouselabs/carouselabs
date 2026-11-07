// @vitest-environment jsdom
// The dot field behind the "generating" screens (components/generate/RepelField.tsx):
// dots within 120px of the pointer move away by up to 22px, the rest stay
// put; with no pointer it drifts on its own; with reduced motion it's drawn
// once and still; and it stops when the screen closes. The canvas is a stand-in
// that records each dot.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { GeneratingPanel } from "@/components/generate/RepelField"

let dots: [number, number][] = []
let frames: FrameRequestCallback[] = []
let reduce = false
let ctx: { fillStyle: string; globalAlpha: number } & Record<string, unknown>

beforeEach(() => {
  dots = []
  frames = []
  reduce = false
  ctx = {
    fillStyle: "",
    globalAlpha: 1,
    clearRect: () => {
      dots = []
    },
    setTransform: () => {},
    beginPath: () => {},
    arc: (x: number, y: number) => void dots.push([x, y]),
    fill: () => {},
  }
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 280, height: 280, right: 280, bottom: 280, x: 0, y: 0, toJSON: () => ({}) })
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb))
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q.includes("reduce") }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const at = (x: number, y: number) => dots.find(([dx, dy]) => Math.abs(dx - x) < 0.01 && Math.abs(dy - y) < 0.01)

describe("the dot field", () => {
  it("pushes the dots near the pointer away, more the closer they are, and leaves the rest", () => {
    render(<GeneratingPanel title="Generating your image…" />)
    expect(screen.getByRole("status").textContent).toContain("Generating your image…")
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 140, clientY: 140 }))
    frames.shift()!(1000)
    // A 10 × 10 grid, centred: dots at 14, 42 … 266.
    expect(dots).toHaveLength(100)
    // 19.8px away: pushed out along the diagonal by (1 − 19.8/120) × 22 ≈ 18.4px.
    const push = (1 - Math.hypot(14, 14) / 120) * 22
    expect(at(126 - push / Math.SQRT2, 126 - push / Math.SQRT2)).toBeTruthy()
    expect(at(126, 126)).toBeUndefined()
    // Farther than 120px: exactly where it was.
    expect(at(14, 14)).toBeTruthy()
    expect(at(266, 266)).toBeTruthy()
    // Never more than 22px from its place.
    const moved = dots.map(([x, y]) => Math.min(...[14, 42, 70, 98, 126, 154, 182, 210, 238, 266].flatMap((gx) => [14, 42, 70, 98, 126, 154, 182, 210, 238, 266].map((gy) => Math.hypot(x - gx, y - gy)))))
    expect(Math.max(...moved)).toBeLessThanOrEqual(22)
  })

  it("with no pointer near, it drifts on its own, frame after frame", () => {
    render(<GeneratingPanel title="Generating slide 1 of 8…" />)
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 2000, clientY: 2000 }))
    frames.shift()!(0)
    const first = JSON.stringify(dots)
    frames.shift()!(900)
    expect(JSON.stringify(dots)).not.toBe(first)
    expect(frames.length).toBe(1)
  })

  it("with reduced motion: drawn once, still, with no animation loop", () => {
    reduce = true
    render(<GeneratingPanel title="Generating your image…" />)
    expect(frames).toHaveLength(0)
    expect(dots).toHaveLength(100)
    expect(at(126, 126)).toBeTruthy()
  })

  it("follows the pointer while it's over the field, and drifts again once it leaves the page or a finger lifts", () => {
    render(<GeneratingPanel title="Generating your image…" />)
    const still = () => {
      frames.shift()!(0)
      const a = JSON.stringify(dots)
      frames.shift()!(900)
      return JSON.stringify(dots) === a
    }
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 140, clientY: 140 }))
    expect(still()).toBe(true)
    window.dispatchEvent(new MouseEvent("pointerout", { relatedTarget: null }))
    expect(still()).toBe(false)
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 140, clientY: 140 }))
    expect(still()).toBe(true)
    const lift = new MouseEvent("pointerup") as MouseEvent & { pointerType?: string }
    Object.defineProperty(lift, "pointerType", { value: "touch" })
    window.dispatchEvent(lift)
    expect(still()).toBe(false)
  })

  it("uses the site's colours: the brand colour for the dots, the theme's panel, no label", () => {
    render(<GeneratingPanel title="Generating your image…" note="(this can take up to a minute)" />)
    frames.shift()!(0)
    expect(ctx.fillStyle).not.toBe("")
    const panel = screen.getByRole("status")
    expect(panel.className).toContain("bg-surface-muted")
    expect(panel.querySelector("canvas")?.className).toContain("text-brand")
    expect(panel.textContent).toBe("Generating your image…(this can take up to a minute)")
  })

  it("stops when the screen closes", () => {
    const { unmount } = render(<GeneratingPanel title="Generating your image…" />)
    unmount()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })
})
