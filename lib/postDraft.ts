import type { DraftImage, DraftSlide } from "./postInput"

/** A single editor's ordered save queue. Failed writes never report success. */
export interface SavedDraft {
  postId: string
  updatedAt: string
  caption: string
  assets?: string
  size?: "4:5" | "1:1"
}

export function createDraftWriter(ideaId: string, request: typeof fetch = fetch, storageKey?: string) {
  let saved: SavedDraft | null = null
  let tail: Promise<unknown> = Promise.resolve()
  // Retain this across lost create responses so a manual retry cannot create
  // a second post. Never automatically retry a mutation.
  const requestId = crypto.randomUUID()

  async function json(url: string, init?: RequestInit) {
    let response: Response
    try {
      response = await request(url, { ...init, signal: AbortSignal.timeout(30_000) })
    } catch {
      throw new Error("The save could not be confirmed. Your edits are still here. Check your connection and retry.")
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(response.status === 401
      ? "Your session expired. Sign in again; your edits are still here."
      : typeof data.error === "string" ? data.error : "Could not save. Your edits are still here; please try again.")
    return data
  }

  return {
    restore(post: SavedDraft) { saved = post },
    revision() { return saved?.updatedAt },
    save(caption: string, postId?: string | null, slides?: DraftSlide[], size?: "4:5" | "1:1", image?: DraftImage): Promise<SavedDraft> {
      const operation = tail.then(async () => {
        if (postId && saved?.postId !== postId) {
          const { post } = await json(`/api/posts/${encodeURIComponent(postId)}`)
          saved = { postId: post.id, updatedAt: post.updatedAt, caption: post.caption ?? "" }
        }
        const assets = slides ? JSON.stringify(slides) : image ? JSON.stringify(image) : undefined
        if (saved?.caption === caption && ((!slides && !image) || saved.assets === assets) && (!size || saved.size === size)) return saved
        const previousRevision = saved?.updatedAt
        const data = await json(saved ? `/api/posts/${encodeURIComponent(saved.postId)}` : "/api/posts", {
          method: saved ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved
            ? { caption, slides, size, image, expectedUpdatedAt: saved.updatedAt }
            : { ideaId, caption, requestId, slides, size, image }),
        })
        if (typeof data.postId !== "string" || typeof data.updatedAt !== "string") {
          throw new Error("The server did not confirm the save. Your edits are still here.")
        }
        saved = { postId: data.postId, updatedAt: data.updatedAt, caption, assets, size }
        if (storageKey) {
          try {
            // Only advance a known local lineage. An incomplete browser write
            // stays unverified and is offered separately on the next visit.
            if (!previousRevision || localStorage.getItem(`${storageKey}:revision`) === previousRevision) {
              localStorage.setItem(`${storageKey}:revision`, saved.updatedAt)
            }
          } catch { /* A confirmed server save is still valid. */ }
        }
        return saved
      })
      tail = operation.catch(() => undefined)
      return operation
    },
  }
}
