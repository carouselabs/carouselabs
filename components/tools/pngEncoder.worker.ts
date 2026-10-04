import * as UPNG from "upng-js"

type EncodeRequest = { pixels: ArrayBuffer; width: number; height: number }
// Keep worker types local: the application TypeScript configuration includes DOM APIs.
const encoder = globalThis as unknown as {
  onmessage: ((event: MessageEvent<EncodeRequest>) => void) | null
  postMessage: (message: { png: ArrayBuffer } | { error: true }, transfer?: Transferable[]) => void
}

encoder.onmessage = ({ data }) => {
  try {
    // Preserve the existing 256-color PNG encoder and its transparency semantics.
    const png = UPNG.encode([data.pixels], data.width, data.height, 256)
    encoder.postMessage({ png }, [png])
  } catch {
    encoder.postMessage({ error: true })
  }
}
