// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { loadImage } from "@/components/tools/ImageLoader"

let images: FakeImage[]
class FakeImage {
  naturalWidth = 320
  naturalHeight = 180
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ""
  constructor() { images.push(this) }
}
const createObjectURL = vi.fn(() => "blob:local-test")
const revokeObjectURL = vi.fn()
beforeEach(() => {
  images = []
  vi.stubGlobal("createImageBitmap", undefined)
  vi.stubGlobal("Image", FakeImage)
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
})
afterEach(() => vi.unstubAllGlobals())
const file = () => new File(["pixels"], "sample.png", { type: "image/png" })

describe("image decode resources", () => {
  it("revokes a fallback URL and removes handlers when decoding fails", async () => {
    const result = loadImage(file())
    const rejected = expect(result).rejects.toThrow("couldn't be opened")
    expect(images[0].src).toBe("blob:local-test")
    images[0].onerror!()
    await rejected
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:local-test")
    expect(images[0].onload).toBeNull()
    expect(images[0].onerror).toBeNull()
  })

  it("keeps a successful fallback URL alive until its owner disposes it", async () => {
    const result = loadImage(file())
    images[0].onload!()
    const image = await result
    expect(image.width).toBe(320)
    expect(image.height).toBe(180)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(images[0].onload).toBeNull()
    expect(images[0].onerror).toBeNull()
    image.dispose()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:local-test")
  })

  it("releases native bitmap resources without allocating a fallback URL", async () => {
    const bitmap = { width: 800, height: 400, close: vi.fn() }
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap))
    const image = await loadImage(file())
    expect(createObjectURL).not.toHaveBeenCalled()
    image.dispose()
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it("falls back when native decoding rejects, and still cleans up failed decoding", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("Unsupported decoder")))
    const result = loadImage(file())
    const rejected = expect(result).rejects.toThrow("couldn't be opened")
    await Promise.resolve()
    images[0].onerror!()
    await rejected
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:local-test")
  })
})
