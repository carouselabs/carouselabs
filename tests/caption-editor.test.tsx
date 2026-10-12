// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CaptionEditor } from "@/components/generate/CaptionEditor"

const push = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/components/generate/PostToLinkedInButton", () => ({ PostToLinkedInButton: () => null }))
afterEach(cleanup)
const props = { caption: "Original", onChange: vi.fn(), isGenerating: false }

describe("caption save feedback", () => {
  it("never labels text typed during a pending save as saved", async () => {
    let finish!: (id: string) => void
    const onSave = vi.fn(() => new Promise<string>((resolve) => { finish = resolve }))
    const { rerender } = render(<CaptionEditor {...props} onSave={onSave} />)
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("Original"))
    rerender(<CaptionEditor {...props} caption="Newer edits" onSave={onSave} />)
    expect(screen.getByRole("button", { name: /Saving/ })).toBeTruthy()
    await act(async () => finish("post-1"))
    expect(screen.queryByRole("button", { name: "Saved!" })).toBeNull()
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeTruthy()
    expect((screen.getByRole("textbox", { name: "Caption" }) as HTMLTextAreaElement).value).toBe("Newer edits")
  })
  it("shows save failures as alerts and allows retry with the same text", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Session expired; your edits remain")).mockResolvedValueOnce("post-1")
    render(<CaptionEditor {...props} onSave={onSave} />)
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Session expired")
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Original")
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }))
    await screen.findByRole("button", { name: "Saved!" })
    expect(onSave).toHaveBeenCalledTimes(2)
  })
  it("keeps scheduling on the page until saving succeeds and reports the save so regeneration is blocked", async () => {
    let finish!: (id: string) => void
    const onSave = vi.fn(() => new Promise<string>((resolve) => { finish = resolve }))
    // Regenerate lives in the page's settings panel; the editor reports its
    // save so the page can disable it meanwhile.
    const onSavingChange = vi.fn()
    render(<CaptionEditor {...props} onSave={onSave} onSavingChange={onSavingChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Schedule for Later" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(push).not.toHaveBeenCalled()
    expect(onSavingChange).toHaveBeenLastCalledWith(true)
    await act(async () => finish("post/1"))
    expect(push).toHaveBeenCalledWith("/content-hub?postId=post%2F1")
    expect(onSavingChange).toHaveBeenLastCalledWith(false)
  })
  it("does not navigate when the schedule save fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Draft conflict"))
    render(<CaptionEditor {...props} onSave={onSave} />)
    fireEvent.click(screen.getByRole("button", { name: "Schedule for Later" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Draft conflict")
    expect(push).not.toHaveBeenCalled()
  })
})
