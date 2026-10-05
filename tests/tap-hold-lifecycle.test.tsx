// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TapHoldMaker } from "@/components/tools/TapHoldMaker"
import { CanvasRenderer } from "@/components/tools/CanvasRenderer"
import { loadImage, type LoadedImage } from "@/components/tools/ImageLoader"
import { exportTapHoldImage } from "@/components/tools/ExportEngine"

vi.mock("@/components/tools/ImageLoader", async (original) => ({
  ...await original<typeof import("@/components/tools/ImageLoader")>(),
  loadImage: vi.fn(),
}))
vi.mock("@/components/tools/ExportEngine", () => ({ exportTapHoldImage: vi.fn() }))

let frames: Map<number, FrameRequestCallback>
let frameId: number
beforeEach(() => {
  frames = new Map()
  frameId = 0
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  }))
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)))
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function decoded(width = 320): LoadedImage {
  return { source: document.createElement("canvas"), width, height: 180, dispose: vi.fn() }
}
function deferredImage() {
  let resolve!: (image: LoadedImage) => void
  const promise = new Promise<LoadedImage>((done) => { resolve = done })
  return { promise, resolve }
}
function upload(name = "sample.png") {
  fireEvent.change(screen.getByLabelText("Image file"), {
    target: { files: [new File(["pixels"], name, { type: "image/png" })] },
  })
}
async function flushFrames() {
  const pending = [...frames.values()]
  frames.clear()
  await act(async () => { for (const frame of pending) frame(0) })
}

describe("tap-and-hold image lifecycle", () => {
  it("loads the first image into committed canvases without waiting for an animation frame", async () => {
    const image = decoded()
    vi.mocked(loadImage).mockResolvedValueOnce(image)
    const load = vi.spyOn(CanvasRenderer.prototype, "load")
    const { container } = render(<TapHoldMaker />)
    expect(container.querySelector("canvas")).toBeNull()
    await act(async () => upload())
    expect(load).toHaveBeenCalledWith(image)
    const canvas = container.querySelector("canvas")!
    expect(canvas.isConnected).toBe(true)
    expect(canvas.width).toBe(320)
    expect(canvas.height).toBe(180)
    expect(image.dispose).not.toHaveBeenCalled()
  })

  it("keeps the newest upload when older decoding finishes last", async () => {
    const first = deferredImage()
    const second = deferredImage()
    vi.mocked(loadImage).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const load = vi.spyOn(CanvasRenderer.prototype, "load")
    render(<TapHoldMaker />)
    upload("first.png")
    upload("second.png")
    const current = decoded(640)
    const stale = decoded(300)
    await act(async () => second.resolve(current))
    await act(async () => first.resolve(stale))
    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith(current)
    expect(stale.dispose).toHaveBeenCalledTimes(1)
    expect(current.dispose).not.toHaveBeenCalled()
  })

  it("releases superseded pixels, animation frames and cursor canvas on replacement and unmount", async () => {
    const first = decoded()
    const second = decoded(640)
    vi.mocked(loadImage).mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const { container, unmount } = render(<TapHoldMaker />)
    await act(async () => upload())
    const cursor = container.querySelector("[data-brush-cursor]")!
    expect(cursor.isConnected).toBe(true)
    await act(async () => upload("second.png"))
    expect(first.dispose).toHaveBeenCalledTimes(1)
    expect(second.dispose).not.toHaveBeenCalled()
    unmount()
    expect(second.dispose).toHaveBeenCalledTimes(1)
    expect(cursor.isConnected).toBe(false)
    expect(frames.size).toBe(0)
  })

  it("disposes images that finish decoding after unmount", async () => {
    const pending = deferredImage()
    vi.mocked(loadImage).mockReturnValueOnce(pending.promise)
    const image = decoded()
    const load = vi.spyOn(CanvasRenderer.prototype, "load")
    const { unmount } = render(<TapHoldMaker />)
    upload()
    unmount()
    await act(async () => pending.resolve(image))
    expect(load).not.toHaveBeenCalled()
    expect(image.dispose).toHaveBeenCalledTimes(1)
  })

  it("does not start an export whose animation frame runs after unmount", async () => {
    vi.mocked(loadImage).mockResolvedValueOnce(decoded())
    const { unmount } = render(<TapHoldMaker />)
    await act(async () => upload())
    fireEvent.click(screen.getByRole("button", { name: "Download for X" }))
    unmount()
    await flushFrames()
    expect(exportTapHoldImage).not.toHaveBeenCalled()
  })

  it("passes cancellation to an active export and aborts it on unmount", async () => {
    vi.mocked(loadImage).mockResolvedValueOnce(decoded())
    vi.mocked(exportTapHoldImage).mockImplementationOnce((_base, _mask, _width, _height, _format, signal) =>
      new Promise((_resolve, reject) => signal!.addEventListener("abort", () => reject(signal!.reason), { once: true })))
    const { unmount } = render(<TapHoldMaker />)
    await act(async () => upload())
    fireEvent.click(screen.getByRole("button", { name: "Download for X" }))
    expect((screen.getByRole("button", { name: "Download for X" }) as HTMLButtonElement).disabled).toBe(true)
    await flushFrames()
    expect(exportTapHoldImage).toHaveBeenCalledTimes(1)
    const signal = vi.mocked(exportTapHoldImage).mock.calls[0][5]!
    expect(signal.aborted).toBe(false)
    await act(async () => unmount())
    expect(signal.aborted).toBe(true)
  })

  it("cancels pending export before replacing its source and does not announce success", async () => {
    vi.mocked(loadImage).mockResolvedValueOnce(decoded()).mockResolvedValueOnce(decoded(600))
    vi.mocked(exportTapHoldImage).mockImplementationOnce((_base, _mask, _width, _height, _format, signal) =>
      new Promise((_resolve, reject) => signal!.addEventListener("abort", () => reject(signal!.reason), { once: true })))
    render(<TapHoldMaker />)
    await act(async () => upload())
    fireEvent.click(screen.getByRole("button", { name: "Download for X" }))
    await flushFrames()
    const signal = vi.mocked(exportTapHoldImage).mock.calls[0][5]!
    await act(async () => upload("replacement.png"))
    expect(signal.aborted).toBe(true)
    expect(screen.queryByRole("status")).toBeNull()
    expect((screen.getByRole("button", { name: "Download for X" }) as HTMLButtonElement).disabled).toBe(false)
  })
})
