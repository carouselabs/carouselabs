// @vitest-environment jsdom
// The real Carousel page, clicked through from step 2 to Generate after "Skip,
// generate without reference". A look's picture goes to the slide prompts and
// to every slide image (never to the slide-layout step); a described style goes
// to the slide prompts only.
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/generate/carousel", useSearchParams: () => new URLSearchParams() }))
vi.mock("@/components/generate/LoadingGame", () => ({ LoadingGame: () => null }))
vi.mock("@/components/generate/PostToLinkedInButton", () => ({ PostToLinkedInButton: () => null }))
vi.mock("@/components/generate/ScheduleForLaterButton", () => ({ ScheduleForLaterButton: () => null }))

import { CarouselClient } from "@/app/(app)/generate/carousel/_client"

const IDEA = "idea-2"
const LOOK_BYTES = fs.readFileSync(path.join(process.cwd(), "public/images/looks/bauhaus.jpg"))
const SLIDES = [1, 2, 3].map((n) => ({ slideNumber: n, role: n === 1 ? "hook" : n === 3 ? "cta" : "body", headline: `Slide ${n}`, prompt: `Brief ${n}` }))

type Call = { url: string; body: Record<string, unknown> | null }
let calls: Call[] = []
const answer = (data: unknown) => ({ ok: true, status: 200, headers: new Headers(), json: async () => data, text: async () => JSON.stringify(data) })

beforeEach(() => {
  calls = []
  localStorage.clear()
  localStorage.setItem(`carouselCaption_${IDEA}`, "My caption about focus")
  localStorage.setItem(`carouselSize_${IDEA}`, "4:5")
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null
      calls.push({ url, body })
      if (url.startsWith("/images/looks/")) return { ok: true, status: 200, headers: new Headers(), blob: async () => new Blob([LOOK_BYTES], { type: "image/jpeg" }) }
      if (url.startsWith("/api/posts")) return answer({ post: null })
      // No CTA saved yet (Settings → My CTA): the CTA step offers to set one up.
      if (url === "/api/cta") return answer({ ready: true, photoUrl: null, cards: [], photoSources: { linkedin: false, startPage: false }, profile: { name: "", headline: "" } })
      if (url === "/api/own-idea/carousel-structure") return answer({ carouselStructureDecision: "1. Hook\n2. Body\n3. CTA", plannedSlideCount: 3 })
      if (url === "/api/generate/carousel-prompt") return answer({ caption: "My caption about focus", slides: SLIDES })
      if (url === "/api/generate/carousel-images") {
        const slide = (body?.slides as typeof SLIDES)[0]
        return answer({ slides: [{ ...slide, imageUrl: `https://cdn.example/${slide.slideNumber}.png` }] })
      }
      return answer({})
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sentTo = (url: string) => calls.filter((c) => c.url === url).map((c) => c.body ?? {})

async function generateWith(choose: () => void) {
  render(<CarouselClient ideaId={IDEA} ideaHook="Focus beats hustle" hasGuidelines={false} isOwnIdea />)
  fireEvent.click(await screen.findByRole("button", { name: "Continue →" }))
  fireEvent.click(await screen.findByRole("button", { name: "Skip, generate without reference" }))
  await screen.findByRole("heading", { name: "How should your image look?" })
  choose()
  fireEvent.click(await screen.findByRole("button", { name: /Let AI Decide/ }))
  // Then the CTA step: none on the slides, nothing extra at the end.
  await screen.findByRole("heading", { name: "Add your CTA?" })
  fireEvent.click(await screen.findByRole("radio", { name: /Not on the slides/ }))
  fireEvent.click(screen.getByRole("radio", { name: /Nothing extra/ }))
  fireEvent.click(screen.getByRole("button", { name: "Continue →" }))
  fireEvent.click(await screen.findByRole("button", { name: "Generate Carousel" }))
  fireEvent.click(await screen.findByRole("button", { name: "Yes, generate →" }))
  await waitFor(() => expect(sentTo("/api/generate/carousel-images")).toHaveLength(3), { timeout: 5000 })
  expect(sentTo("/api/generate/carousel-prompt")[0]?.cta).toEqual({ ctaId: null, where: "none", last: "none" })
  expect(sentTo("/api/generate/carousel-images").every((b) => JSON.stringify(b.cta) === JSON.stringify({ ctaId: null, where: "none", last: "none" }))).toBe(true)
}

describe("Carousel without a reference", () => {
  it("a look: its picture goes to the slide prompts and every slide image, never to the layout step", async () => {
    await generateWith(() => {
      fireEvent.click(screen.getByRole("button", { name: /Choose a look/ }))
      fireEvent.click(screen.getByRole("button", { name: "Bauhaus" }))
      fireEvent.click(screen.getByRole("button", { name: "Use Bauhaus →" }))
    })
    const base64 = LOOK_BYTES.toString("base64")
    expect(sentTo("/api/own-idea/carousel-structure")[0].referenceImage).toBeUndefined()
    expect(sentTo("/api/generate/carousel-prompt")[0]).toMatchObject({ referenceImage: base64, referenceMediaType: "image/jpeg" })
    for (const body of sentTo("/api/generate/carousel-images")) expect(body).toMatchObject({ referenceImage: base64 })
    expect(JSON.parse(localStorage.getItem(`carouselStyle_${IDEA}`)!)).toEqual({ kind: "look", lookId: "bauhaus" })
  })

  it("a described style: the words go to the slide prompts only", async () => {
    await generateWith(() => {
      fireEvent.click(screen.getByRole("button", { name: /Describe your style/ }))
      fireEvent.change(screen.getByRole("textbox", { name: "Describe your style" }), { target: { value: "Pastel colors, rounded friendly font, playful doodles" } })
      fireEvent.click(screen.getByRole("button", { name: "Use this style →" }))
    })
    expect(sentTo("/api/generate/carousel-prompt")[0]).toMatchObject({ styleDescription: "Pastel colors, rounded friendly font, playful doodles" })
    expect(sentTo("/api/generate/carousel-prompt")[0].referenceImage).toBeUndefined()
    for (const body of sentTo("/api/generate/carousel-images")) expect(body.referenceImage).toBeUndefined()
  })
})
