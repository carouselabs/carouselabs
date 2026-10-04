export const PNG_EXPORT_TIMEOUT_MS = 30_000

/** The transferable buffer belongs to the worker until encoding completes. */
export function encodePngInWorker(pixels: ArrayBuffer, width: number, height: number, signal?: AbortSignal): Promise<ArrayBuffer> {
  if (signal?.aborted) return Promise.reject(new DOMException("Export canceled", "AbortError"))

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pngEncoder.worker.ts", import.meta.url), { type: "module" })
    let settled = false
    const cleanup = () => {
      clearTimeout(timeout)
      signal?.removeEventListener("abort", abort)
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      worker.terminate()
    }
    const finish = (result: ArrayBuffer | Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (result instanceof Error) reject(result)
      else resolve(result)
    }
    const abort = () => finish(new DOMException("Export canceled", "AbortError"))
    const timeout = setTimeout(() => finish(new Error("PNG export timed out. Try a smaller image.")), PNG_EXPORT_TIMEOUT_MS)
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const result = event.data
      if (typeof result === "object" && result !== null && "png" in result && result.png instanceof ArrayBuffer) {
        finish(result.png)
      } else {
        finish(new Error("PNG export failed. Please try again."))
      }
    }
    worker.onerror = (event) => {
      event.preventDefault()
      finish(new Error("PNG export failed. Please try again."))
    }
    worker.onmessageerror = () => finish(new Error("PNG export failed. Please try again."))
    signal?.addEventListener("abort", abort, { once: true })
    try {
      worker.postMessage({ pixels, width, height }, [pixels])
    } catch {
      finish(new Error("PNG export could not start. Please try again."))
    }
  })
}
