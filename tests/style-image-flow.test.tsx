// @vitest-environment jsdom
// The real Image + Caption page, clicked through from step 2 to Generate with
// each choice after "Skip, generate without reference". Checks what each request
// actually carries: a look's picture goes to the prompt and image steps (never
// to the layout step), a described style goes to the prompt step only, and
// "Let AI decide" sends neither. The choice survives a reload.
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/generate/image", useSearchParams: () => new URLSearchParams() }))
vi.mock("@/components/generate/LoadingGame", () => ({ LoadingGame: () => null }))
vi.mock("@/components/generate/PostToLinkedInButton", () => ({ PostToLinkedInButton: () => null }))
vi.mock("@/components/generate/ScheduleForLaterButton", () => ({ ScheduleForLaterButton: () => null }))

import { ImageClient } from "@/app/(app)/generate/image/_client"

const IDEA = "idea-1"
const LOOK_BYTES = fs.readFileSync(path.join(process.cwd(), "public/images/looks/neon-sign.jpg"))

type Call = { url: string; body: Record<string, unknown> | null }
let calls: Call[] = []

function answer(data: unknown, init: { ok?: boolean } = {}) {
  return { ok: init.ok ?? true, status: init.ok === false ? 400 : 200, headers: new Headers(), json: async () => data, text: async () => JSON.stringify(data) }
}

beforeEach(() => {
  calls = []
  localStorage.clear()
  // A caption and size already saved: the page opens on step 2.
  localStorage.setItem(`imageCaption_${IDEA}`, "My caption about focus")
  localStorage.setItem(`imageSize_${IDEA}`, "4:5")
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null
      calls.push({ url, body })
      if (url.startsWith("/images/looks/")) {
        return { ok: true, status: 200, headers: new Headers(), blob: async () => new Blob([LOOK_BYTES], { type: "image/jpeg" }) }
      }
      if (url.includes("/breakdown")) return answer({ breakdown: { deepDive: "Deep dive" } })
      if (url.startsWith("/api/posts")) return answer({ post: null })
      // No CTA saved yet (Settings → My CTA): the CTA step offers to set one up.
      if (url === "/api/cta") return answer({ ready: true, photoUrl: null, cards: [], photoSources: { linkedin: false, startPage: false }, profile: { name: "", headline: "" } })
      if (url === "/api/own-idea/presentation-structure") return answer({ presentationStructure: "Big statement" })
      if (url === "/api/generate/image-prompt") return answer({ imagePrompt: "A slide" })
      if (url === "/api/generate/image") return answer({ imageUrl: "https://cdn.example/i.png", postId: "post-1" })
      return answer({})
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sent = (url: string) => calls.find((c) => c.url === url)?.body ?? null

async function toStyleChooser() {
  render(<ImageClient ideaId={IDEA} ideaHook="Focus beats hustle" hasGuidelines={false} isOwnIdea />)
  fireEvent.click(await screen.findByRole("button", { name: "Continue →" }))
  fireEvent.click(await screen.findByRole("button", { name: "Skip, generate without reference" }))
  await screen.findByRole("heading", { name: "How should your image look?" })
}

async function pickStructureAndGenerate() {
  fireEvent.click(await screen.findByRole("button", { name: /Let AI Decide/ }))
  // Then the CTA step: no CTA on this one.
  await screen.findByRole("heading", { name: "Add your CTA?" })
  fireEvent.click(await screen.findByRole("radio", { name: /No CTA/ }))
  fireEvent.click(screen.getByRole("button", { name: "Continue →" }))
  fireEvent.click(await screen.findByRole("button", { name: "Generate Image" }))
  await waitFor(() => expect(sent("/api/generate/image")).not.toBeNull())
  expect(sent("/api/generate/image-prompt")?.cta).toEqual({ ctaId: null, where: "none" })
  expect(sent("/api/generate/image")?.cta).toEqual({ ctaId: null, where: "none" })
}

describe("Image + Caption without a reference", () => {
  it("a look: its picture goes with the prompt and the image, never to the layout step", async () => {
    await toStyleChooser()
    fireEvent.click(screen.getByRole("button", { name: /Choose a look/ }))
    fireEvent.click(screen.getByRole("button", { name: "Neon Sign" }))
    fireEvent.click(screen.getByRole("button", { name: "Use Neon Sign →" }))
    expect(await screen.findByText("Look: Neon Sign")).toBeTruthy()
    await pickStructureAndGenerate()

    const base64 = LOOK_BYTES.toString("base64")
    expect(sent("/api/own-idea/presentation-structure")?.referenceImageBase64).toBeUndefined()
    expect(sent("/api/generate/image-prompt")).toMatchObject({ referenceImage: base64, referenceMediaType: "image/jpeg" })
    expect(sent("/api/generate/image-prompt")?.styleDescription).toBeUndefined()
    expect(sent("/api/generate/image")).toMatchObject({ referenceImage: base64, referenceMediaType: "image/jpeg" })
    expect(JSON.parse(localStorage.getItem(`imageStyle_${IDEA}`)!)).toEqual({ kind: "look", lookId: "neon-sign" })
  })

  it("a described style: the cleaned words go to the prompt step only, with no picture", async () => {
    await toStyleChooser()
    fireEvent.click(screen.getByRole("button", { name: /Describe your style/ }))
    fireEvent.change(screen.getByRole("textbox", { name: "Describe your style" }), { target: { value: " Black and white,\n elegant serif headline " } })
    fireEvent.click(screen.getByRole("button", { name: "Use this style →" }))
    expect(await screen.findByText("Style: your own description")).toBeTruthy()
    await pickStructureAndGenerate()

    expect(sent("/api/generate/image-prompt")).toMatchObject({ styleDescription: "Black and white, elegant serif headline" })
    expect(sent("/api/generate/image-prompt")?.referenceImage).toBeUndefined()
    expect(sent("/api/generate/image")?.referenceImage).toBeUndefined()
    expect(calls.some((c) => c.url.startsWith("/images/looks/"))).toBe(false)
  })

  it("let AI decide: no picture and no words", async () => {
    await toStyleChooser()
    fireEvent.click(screen.getByRole("button", { name: /Let AI decide/ }))
    expect(await screen.findByText("Style: AI decides")).toBeTruthy()
    await pickStructureAndGenerate()

    expect(sent("/api/generate/image-prompt")?.referenceImage).toBeUndefined()
    expect(sent("/api/generate/image-prompt")?.styleDescription).toBeUndefined()
    expect(sent("/api/generate/image")?.referenceImage).toBeUndefined()
  })

  it("keeps the choice after a reload, and offers to change it", async () => {
    localStorage.setItem(`imageStyle_${IDEA}`, JSON.stringify({ kind: "look", lookId: "bauhaus" }))
    render(<ImageClient ideaId={IDEA} ideaHook="Focus beats hustle" hasGuidelines={false} isOwnIdea />)
    fireEvent.click(await screen.findByRole("button", { name: "Continue →" }))
    expect(await screen.findByText(/Look: Bauhaus/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Change" }))
    expect(await screen.findByRole("button", { name: "Use Bauhaus →" })).toBeTruthy()
  })
})
