// lib/lookReference.ts
// A look's sample picture (lib/styleLooks.ts) as base64, ready to send as the
// style reference in place of an upload. Fetched once per look per page.
import { lookImagePath } from "@/lib/styleLooks"

export type LookReference = { data: string; mediaType: "image/jpeg" }

const loaded = new Map<string, Promise<LookReference>>()

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the look's picture"))
    reader.readAsDataURL(blob)
  })
}

export function loadLookReference(lookId: string): Promise<LookReference> {
  let pending = loaded.get(lookId)
  if (!pending) {
    pending = fetch(lookImagePath(lookId))
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load that look. Pick it again or choose another.")
        return res.blob()
      })
      .then(toBase64)
      .then((data) => {
        if (!data) throw new Error("Couldn't load that look. Pick it again or choose another.")
        return { data, mediaType: "image/jpeg" as const }
      })
    // A failed load is forgotten, so the next try fetches again.
    pending.catch(() => loaded.delete(lookId))
    loaded.set(lookId, pending)
  }
  return pending
}
