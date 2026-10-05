import { afterEach, describe, expect, it, vi } from "vitest"
import * as UPNG from "upng-js"

const scope = globalThis as unknown as { onmessage: (event: { data: unknown }) => void }
afterEach(() => vi.unstubAllGlobals())

describe("PNG worker output", () => {
  it("preserves the existing 256-color output bytes, dimensions, and transparency", async () => {
    vi.stubGlobal("onmessage", null)
    const send = vi.fn()
    vi.stubGlobal("postMessage", send)
    await import("@/components/tools/pngEncoder.worker")
    const pixels = new Uint8Array([255, 0, 0, 255, 0, 0, 0, 0, 0, 255, 0, 255, 0, 0, 255, 255]).buffer
    const expected = UPNG.encode([pixels], 2, 2, 256)
    scope.onmessage({ data: { pixels, width: 2, height: 2 } })
    const png = send.mock.calls[0][0].png as ArrayBuffer
    expect(new Uint8Array(png)).toEqual(new Uint8Array(expected))
    expect(send).toHaveBeenCalledWith({ png }, [png])
    const decoded = UPNG.decode(png)
    expect(decoded.width).toBe(2)
    expect(decoded.height).toBe(2)
    const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0])
    expect(Array.from(rgba).filter((_, index) => index % 4 === 3)).toEqual([255, 0, 255, 255])
    expect(rgba).toEqual(new Uint8Array(UPNG.toRGBA8(UPNG.decode(expected))[0]))
    send.mockClear()
    scope.onmessage({ data: {} })
    expect(send).toHaveBeenCalledWith({ error: true })
  })
})
