import { describe, expect, it } from "vitest"
import { persistDraftValues, reconcileDraft } from "@/lib/draftRecovery"

const makeStorage = () => {
  const values = new Map<string, string>()
  return { removeItem: (key: string) => { values.delete(key) }, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
describe("browser draft revision recovery", () => {
  it("prefers the current server draft and preserves a stale local copy", () => {
    const storage = makeStorage()
    storage.setItem("draft:revision", "old")
    expect(reconcileDraft("draft", "local work", "newer remote work", "new", storage)).toEqual({ draft: "newer remote work", recovery: "local work" })
    expect(storage.getItem("draft:recovery")).toBe(JSON.stringify("local work"))
    expect(reconcileDraft("draft", "newer remote work", "newer remote work", "new", storage).recovery).toBe("local work")
  })
  it("treats legacy browser copies without a base revision as unverified", () => {
    expect(reconcileDraft("draft", "legacy work", "remote", "new", makeStorage())).toEqual({ draft: "remote", recovery: "legacy work" })
  })
  it("keeps unsaved edits based on the current server revision, including empty captions", () => {
    const storage = makeStorage()
    storage.setItem("draft:revision", "current")
    expect(reconcileDraft("draft", "", "remote", "current", storage)).toEqual({ draft: "", recovery: null })
  })
  it("preserves text, slide ordering and dimensions together", () => {
    const local = { caption: "local", images: ["old-slide-1", "old-slide-2"], size: "4:5" }
    const server = { caption: "remote", images: ["new-slide-1"], size: "1:1" }
    expect(reconcileDraft("draft", local, server, "new", makeStorage())).toEqual({ draft: server, recovery: local })
  })
  it("still exposes recovery in memory if browser storage is unavailable", () => {
    const storage = { getItem() { throw new Error("blocked") }, setItem() { throw new Error("blocked") } }
    expect(reconcileDraft("draft", "local", "remote", "new", storage)).toEqual({ draft: "remote", recovery: "local" })
  })
})


describe("recovery snapshot persistence", () => {
  it("commits the selected server fields and revision so reopening does not revive stale media", () => {
    const storage = makeStorage()
    storage.setItem("draft:revision", "old")
    storage.setItem("imageUrl", "stale")
    persistDraftValues("draft", { caption: "server", imageUrl: null }, "new", false, storage)
    expect(storage.getItem("caption")).toBe("server")
    expect(storage.getItem("imageUrl")).toBeNull()
    expect(reconcileDraft("draft", "my new edit", "server", "new", storage).draft).toBe("my new edit")
  })
  it("commits a restored recovery copy with its current server base and clears only the recovery notice", () => {
    const storage = makeStorage()
    storage.setItem("draft:recovery", JSON.stringify("recovered"))
    persistDraftValues("draft", { caption: "recovered" }, "new", true, storage)
    expect(storage.getItem("draft:recovery")).toBeNull()
    expect(reconcileDraft("draft", storage.getItem("caption"), "server", "new", storage)).toEqual({ draft: "recovered", recovery: null })
  })
  it("leaves a partly written snapshot unverified when storage fills up", () => {
    const storage = makeStorage()
    storage.setItem("draft:revision", "old")
    const failing = { ...storage, setItem(key: string, value: string) {
      if (key === "imageUrl") throw new Error("Quota exceeded")
      storage.setItem(key, value)
    } }
    expect(() => persistDraftValues("draft", { caption: "new", imageUrl: "new image" }, "new", false, failing)).toThrow("Quota")
    expect(storage.getItem("draft:revision")).toBeNull()
  })
})
