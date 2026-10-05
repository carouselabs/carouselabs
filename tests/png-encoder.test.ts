import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { encodePngInWorker, PNG_EXPORT_TIMEOUT_MS } from "@/components/tools/pngEncoder"

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: (() => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor(readonly url: URL, readonly options: WorkerOptions) {
    FakeWorker.instances.push(this)
  }
}
const currentWorker = () => FakeWorker.instances.at(-1)!
const pixels = () => new Uint8ClampedArray([255, 0, 0, 255]).buffer

beforeEach(() => {
  vi.useFakeTimers()
  FakeWorker.instances = []
  vi.stubGlobal("Worker", FakeWorker)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("PNG encoding worker lifecycle", () => {
  it("transfers the RGBA buffer, returns the worker result, and releases the worker and timer", async () => {
    const input = pixels()
    const result = encodePngInWorker(input, 1, 1)
    const worker = currentWorker()
    expect(worker.options).toEqual({ type: "module" })
    expect(worker.url.pathname).toContain("pngEncoder.worker.ts")
    expect(worker.postMessage).toHaveBeenCalledWith({ pixels: input, width: 1, height: 1 }, [input])
    const png = new ArrayBuffer(12)
    worker.onmessage!({ data: { png } } as MessageEvent)
    await expect(result).resolves.toBe(png)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(worker.onmessage).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
  it("terminates and rejects when the worker crashes", async () => {
    const result = encodePngInWorker(pixels(), 1, 1)
    const assertion = expect(result).rejects.toThrow("PNG export failed")
    const preventDefault = vi.fn()
    currentWorker().onerror!({ preventDefault } as unknown as ErrorEvent)
    await assertion
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(currentWorker().terminate).toHaveBeenCalledOnce()
  })
  it.each([{ error: true }, { png: "invalid" }, null])("rejects encoder errors and malformed results: %j", async (data) => {
    const result = encodePngInWorker(pixels(), 1, 1)
    const assertion = expect(result).rejects.toThrow("PNG export failed")
    currentWorker().onmessage!({ data } as MessageEvent)
    await assertion
    expect(currentWorker().terminate).toHaveBeenCalledOnce()
  })
  it("terminates when a response cannot be deserialized", async () => {
    const result = encodePngInWorker(pixels(), 1, 1)
    const assertion = expect(result).rejects.toThrow("PNG export failed")
    currentWorker().onmessageerror!()
    await assertion
    expect(currentWorker().terminate).toHaveBeenCalledOnce()
  })
  it("bounds a stalled encoding and ignores a late response", async () => {
    const result = encodePngInWorker(pixels(), 1, 1)
    const assertion = expect(result).rejects.toThrow("PNG export timed out")
    const response = currentWorker().onmessage!
    await vi.advanceTimersByTimeAsync(PNG_EXPORT_TIMEOUT_MS)
    await assertion
    response({ data: { png: new ArrayBuffer(8) } } as MessageEvent)
    expect(currentWorker().terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it("does not create a worker when already canceled", async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(encodePngInWorker(pixels(), 1, 1, controller.signal)).rejects.toMatchObject({ name: "AbortError" })
    expect(FakeWorker.instances).toHaveLength(0)
  })
  it("cancels in-flight encoding and detaches the abort listener", async () => {
    const controller = new AbortController()
    const removeListener = vi.spyOn(controller.signal, "removeEventListener")
    const result = encodePngInWorker(pixels(), 1, 1, controller.signal)
    const assertion = expect(result).rejects.toMatchObject({ name: "AbortError" })
    controller.abort()
    await assertion
    expect(currentWorker().terminate).toHaveBeenCalledOnce()
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })
  it("cleans up when transferring the request fails", async () => {
    class BrokenWorker extends FakeWorker {
      postMessage = vi.fn(() => { throw new Error("Clone failed") })
    }
    vi.stubGlobal("Worker", BrokenWorker)
    await expect(encodePngInWorker(pixels(), 1, 1)).rejects.toThrow("PNG export could not start")
    expect(currentWorker().terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it("rejects worker initialization errors without leaving a timer", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("Worker unavailable") } })
    await expect(encodePngInWorker(pixels(), 1, 1)).rejects.toThrow("Worker unavailable")
    expect(vi.getTimerCount()).toBe(0)
  })
})
