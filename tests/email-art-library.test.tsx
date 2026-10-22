// @vitest-environment jsdom
// The AI email writer's saved art: every painted picture and sticker is kept
// (lib/emailArtLibrary.ts), the writer reuses one where it fits instead of
// paying to paint again (lib/emailArtReuse.ts, lib/ai/emailWriter.ts), and the
// admin can pick saved art in the writer (components/admin/EmailArtPicker.tsx).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

const R2 = "https://art.example.test"
const art = (name: string) => `${R2}/email-art/2026-10/${name}`

const mocks = vi.hoisted(() => ({
  anthropic: vi.fn(),
  admin: vi.fn(),
  upsert: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  paintHeroScene: vi.fn(),
  paintSticker: vi.fn(),
  setHeadline: vi.fn(),
  limit: vi.fn(),
}))
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.anthropic }
  },
}))
vi.mock("@/lib/adminAuth", () => ({
  getAdminUser: mocks.admin,
  adminForbidden: () => Response.json({ error: "Forbidden" }, { status: 403 }),
}))
vi.mock("@/lib/db", () => ({ db: { emailArt: { upsert: mocks.upsert, findMany: mocks.findMany, deleteMany: mocks.deleteMany } } }))
vi.mock("@/lib/emailArt", async () => ({
  isOurArt: (await import("@/lib/emailArtCheck")).isOurArt,
  paintHeroScene: mocks.paintHeroScene,
  paintSticker: mocks.paintSticker,
  setHeadline: mocks.setHeadline,
}))
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {}
    limit = mocks.limit
  },
}))
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

import type { EmailDesign } from "@/lib/emailDesign"
import { applySavedArt, artActionLabel, paintingsNeeded, savedPicks } from "@/lib/emailArtReuse"
import { writeEmail } from "@/lib/ai/emailWriter"
import { POST as paint } from "@/app/api/admin/email-writer/paint/route"
import { GET as listRoute } from "@/app/api/admin/email-art/route"
import { DELETE as removeRoute } from "@/app/api/admin/email-art/[id]/route"
import { EmailArtPicker } from "@/components/admin/EmailArtPicker"
import { EmailWriter } from "@/components/admin/EmailWriter"

const LIBRARY = {
  pictures: [{ id: "pic1", url: art("cups.jpg"), description: "two paper cups joined by a taut string" }],
  stickers: [
    { id: "st1", url: art("pen.png"), description: "a fountain pen" },
    { id: "st2", url: art("key.png"), description: "a brass key" },
  ],
}

function design(over: Partial<EmailDesign> = {}): EmailDesign {
  return {
    version: 1,
    subject: "Three quick ways to use Engage today",
    preview: "Start with one comment. Engage writes it in your voice, and you stay in control.",
    hero: { lead: "Your first comment", accent: "takes a minute.", scene: "a lighthouse at dusk" },
    blocks: [
      { type: "text", text: "Hi {{firstName}},\n\nHere are three quick wins." },
      {
        type: "features",
        items: [
          { title: "Comment in your voice", text: "Let Engage draft it.", sticker: { idea: "a quill" } },
          { title: "Add a connection note", text: "A short, personal note.", sticker: { idea: "a sealed envelope" } },
        ],
      },
      { type: "button", label: "Open LinkedIn", href: "https://www.linkedin.com/feed/" },
    ],
    ...over,
  }
}

const stickersOf = (d: EmailDesign) => d.blocks.flatMap((b) => (b.type === "features" ? b.items.map((i) => i.sticker) : []))

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", R2)
  for (const m of Object.values(mocks)) m.mockReset()
  mocks.admin.mockResolvedValue({ id: "a1", email: "admin@carouselabs.com" })
  mocks.limit.mockResolvedValue({ success: true })
  mocks.upsert.mockResolvedValue({})
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("reusing saved art in a design", () => {
  it("reads the writer's choices: the picture, and each sticker in order", () => {
    const raw = {
      hero: { saved: "pic1" },
      blocks: [
        { type: "text" },
        { type: "features", items: [{ sticker: { saved: "st1" } }, { sticker: {} }] },
        { type: "features", items: [{ sticker: { saved: "bad id!" } }] },
      ],
    }
    expect(savedPicks(raw)).toEqual({ picture: "pic1", stickers: ["st1", null, null] })
    expect(savedPicks(null)).toEqual({ picture: null, stickers: [] })
  })

  it("puts the saved picture and stickers in, already painted; unknown ids are painted new", () => {
    const d = applySavedArt(design(), { picture: "pic1", stickers: ["nope", "st2"] }, LIBRARY)
    expect(d.hero).toMatchObject({ scene: LIBRARY.pictures[0].description, paintingUrl: art("cups.jpg"), imageUrl: undefined })
    expect(stickersOf(d)).toEqual([{ idea: "a quill" }, { idea: "a brass key", imageUrl: art("key.png") }])

    const untouched = applySavedArt(design(), { picture: "missing", stickers: [] }, LIBRARY)
    expect(untouched.hero).toEqual(design().hero)
  })

  it("keeps the headline already drawn on the same saved picture", () => {
    const already = design({ hero: { ...design().hero, scene: "two paper cups joined by a taut string", paintingUrl: art("cups.jpg"), imageUrl: art("h.jpg") } })
    expect(applySavedArt(already, { picture: "pic1", stickers: [] }, LIBRARY).hero.imageUrl).toBe(art("h.jpg"))
  })

  it("says what painting is left, and that a saved picture only needs its headline", () => {
    expect(artActionLabel(paintingsNeeded(design()))).toBe("Paint picture & 2 stickers")
    const saved = applySavedArt(design(), { picture: "pic1", stickers: ["st1", "st2"] }, LIBRARY)
    expect(paintingsNeeded(saved)).toEqual({ picture: false, headline: true, stickers: 0 })
    expect(artActionLabel(paintingsNeeded(saved))).toBe("Add headline")
    expect(artActionLabel({ picture: false, headline: true, stickers: 1 })).toBe("Paint 1 sticker & add headline")
    expect(artActionLabel({ picture: false, headline: false, stickers: 0 })).toBe("")
  })
})

describe("the writer and saved art", () => {
  const answer = (body: unknown) => ({ content: [{ type: "text", text: JSON.stringify(body) }], stop_reason: "end_turn" })

  it("is shown the saved art and told to reuse what fits", async () => {
    mocks.anthropic.mockResolvedValueOnce(answer({ reply: "Draft.", design: design() }))
    await writeEmail({ history: [], request: "Nudge quiet users", current: null, library: LIBRARY })
    const system = mocks.anthropic.mock.calls[0][0].system as string
    expect(system).toContain("SAVED ART")
    expect(system).toContain("- [pic1] two paper cups joined by a taut string")
    expect(system).toContain("- [st2] a brass key")
    expect(system).toContain("Reuse whenever one fits well")
  })

  it("isn't told about saved art when there is none", async () => {
    mocks.anthropic.mockResolvedValueOnce(answer({ reply: "Draft.", design: design() }))
    await writeEmail({ history: [], request: "Nudge", current: null, library: { pictures: [], stickers: [] } })
    expect(mocks.anthropic.mock.calls[0][0].system).not.toContain("SAVED ART")
  })

  it("its saved choices arrive already painted; the rest still needs painting", async () => {
    const chosen = design({ hero: { ...design().hero, saved: "pic1" } as EmailDesign["hero"] })
    ;(chosen.blocks[1] as { items: { sticker: Record<string, unknown> }[] }).items[0].sticker = { idea: "a fountain pen", saved: "st1" }
    mocks.anthropic.mockResolvedValueOnce(answer({ reply: "Picture: saved.", design: chosen }))
    const { design: result } = await writeEmail({ history: [], request: "Nudge", current: null, library: LIBRARY })
    expect(result.hero.paintingUrl).toBe(art("cups.jpg"))
    expect(result.hero.imageUrl).toBeUndefined()
    expect(stickersOf(result)).toEqual([{ idea: "a fountain pen", imageUrl: art("pen.png") }, { idea: "a sealed envelope" }])
  })

  it("a URL the model makes up is never trusted, saved or not", async () => {
    const sneaky = design({ hero: { ...design().hero, paintingUrl: art("x.jpg"), imageUrl: art("y.jpg") } })
    mocks.anthropic.mockResolvedValueOnce(answer({ reply: "Draft.", design: sneaky }))
    const { design: result } = await writeEmail({ history: [], request: "Nudge", current: null, library: LIBRARY })
    expect(result.hero.paintingUrl).toBeUndefined()
  })
})

describe("keeping what's painted", () => {
  const req = (body: unknown) => new Request("https://admin.test/api/admin/email-writer/paint", { method: "POST", body: JSON.stringify(body) })

  it("saves every new picture and sticker, with what it shows; never a headline", async () => {
    mocks.paintHeroScene.mockResolvedValue(art("new.jpg"))
    mocks.paintSticker.mockResolvedValue(art("new.png"))
    mocks.setHeadline.mockResolvedValue(art("hero.jpg"))

    await paint(req({ kind: "scene", scene: "a lighthouse at dusk" }))
    await paint(req({ kind: "sticker", idea: "a quill" }))
    await paint(req({ kind: "headline", paintingUrl: art("new.jpg"), lead: "Hello", accent: "there." }))

    expect(mocks.upsert.mock.calls.map(([q]) => q.create)).toEqual([
      { kind: "picture", url: art("new.jpg"), description: "a lighthouse at dusk", createdBy: "admin@carouselabs.com" },
      { kind: "sticker", url: art("new.png"), description: "a quill", createdBy: "admin@carouselabs.com" },
    ])
    expect(mocks.upsert.mock.calls[0][0].where).toEqual({ url: art("new.jpg") })
  })

  it("a library problem never fails the painting", async () => {
    mocks.paintHeroScene.mockResolvedValue(art("new.jpg"))
    mocks.upsert.mockRejectedValue(new Error("database hiccup"))
    const res = await paint(req({ kind: "scene", scene: "a lighthouse at dusk" }))
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe(art("new.jpg"))
  })
})

describe("the library routes", () => {
  it("lists one kind for an admin, newest first, and refuses everyone else", async () => {
    mocks.findMany.mockResolvedValue([{ id: "pic1", kind: "picture", url: art("cups.jpg"), description: "cups", createdAt: new Date() }])
    const res = await listRoute(new Request("https://admin.test/api/admin/email-art?kind=picture"))
    expect((await res.json()).art).toHaveLength(1)
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { kind: "picture" }, orderBy: { createdAt: "desc" } }))
    expect((await listRoute(new Request("https://admin.test/api/admin/email-art?kind=other"))).status).toBe(400)

    mocks.admin.mockResolvedValue(null)
    expect((await listRoute(new Request("https://admin.test/api/admin/email-art?kind=picture"))).status).toBe(403)
    expect((await removeRoute(new Request("https://admin.test/x", { method: "DELETE" }), { params: Promise.resolve({ id: "pic1" }) })).status).toBe(403)
    expect(mocks.deleteMany).not.toHaveBeenCalled()
  })

  it("removes one from the library", async () => {
    mocks.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    const del = () => removeRoute(new Request("https://admin.test/x", { method: "DELETE" }), { params: Promise.resolve({ id: "pic1" }) })
    expect((await del()).status).toBe(200)
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "pic1" } })
    expect((await del()).status).toBe(404)
  })
})

// The browser: a fake server for the picker and the writer.
function server(list: unknown[]) {
  const deleted: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("/api/admin/email-art/") && init?.method === "DELETE") {
        deleted.push(url.split("/").pop()!)
        return Response.json({ ok: true })
      }
      if (url.startsWith("/api/admin/email-art?kind=")) return Response.json({ art: list })
      if (url === "/api/admin/email-writer/preview") return Response.json({ html: "<p>preview</p>" })
      return Response.json({ error: "unexpected" }, { status: 500 })
    }),
  )
  return deleted
}
const PICTURES = [
  { id: "pic1", kind: "picture", url: art("cups.jpg"), description: "two paper cups joined by a taut string", createdAt: "2026-10-20T10:00:00.000Z" },
  { id: "pic2", kind: "picture", url: art("pencils.jpg"), description: "an open tin of new pencils", createdAt: "2026-10-19T10:00:00.000Z" },
]

describe("the picker", () => {
  it("shows the saved art, searches it, picks one, and removes one only when confirmed", async () => {
    const deleted = server(PICTURES)
    const onPick = vi.fn()
    render(<EmailArtPicker kind="picture" onPick={onPick} onClose={() => {}} />)
    const dialog = within(await screen.findByRole("dialog"))
    await dialog.findByRole("button", { name: /Use: two paper cups/ })

    fireEvent.change(dialog.getByLabelText("Search saved pictures"), { target: { value: "pencils" } })
    expect(dialog.queryByRole("button", { name: /Use: two paper cups/ })).toBeNull()
    fireEvent.click(dialog.getByRole("button", { name: /Use: an open tin of new pencils/ }))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "pic2", url: art("pencils.jpg") }))

    fireEvent.click(dialog.getByRole("button", { name: "Remove from library" }))
    expect(deleted).toEqual([])
    fireEvent.click(dialog.getByRole("button", { name: "Remove" }))
    await waitFor(() => expect(deleted).toEqual(["pic2"]))
    await waitFor(() => expect(dialog.queryByRole("button", { name: /Use: an open tin/ })).toBeNull())
  })

  it("says when there's nothing saved yet", async () => {
    server([])
    render(<EmailArtPicker kind="sticker" onPick={() => {}} onClose={() => {}} />)
    expect(await screen.findByText(/No saved stickers yet/)).toBeTruthy()
  })
})

describe("the writer screen", () => {
  beforeEach(() => {
    // jsdom has no scrolling; the writer scrolls its chat to the end.
    Element.prototype.scrollIntoView = () => {}
    localStorage.clear()
    localStorage.setItem("email-writer-draft-v1", JSON.stringify({ turns: [{ role: "writer", text: "Draft ready." }], design: design() }))
  })

  it("a saved picture goes straight in and only needs its headline: nothing to paint", async () => {
    server(PICTURES)
    render(<EmailWriter />)
    expect(await screen.findByRole("button", { name: "Paint picture & 2 stickers" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Use a saved picture" }))
    fireEvent.click(await screen.findByRole("button", { name: /Use: two paper cups/ }))

    expect(await screen.findByRole("button", { name: "Paint 2 stickers & add headline" })).toBeTruthy()
    expect((screen.getByLabelText("What the picture shows") as HTMLTextAreaElement).value).toBe("two paper cups joined by a taut string")
    expect(document.querySelector(`img[src="${art("cups.jpg")}"]`)).toBeTruthy()
  })

  it("a saved sticker replaces the one it was picked for", async () => {
    server([{ id: "st2", kind: "sticker", url: art("key.png"), description: "a brass key", createdAt: "2026-10-20T10:00:00.000Z" }])
    render(<EmailWriter />)
    fireEvent.click(await screen.findByRole("button", { name: "Use a saved sticker instead of a quill" }))
    fireEvent.click(await screen.findByRole("button", { name: /Use: a brass key/ }))
    expect(await screen.findByRole("button", { name: "Paint picture & 1 sticker" })).toBeTruthy()
    expect(document.querySelector(`img[src="${art("key.png")}"]`)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Use a saved sticker instead of a brass key" })).toBeTruthy()
  })
})
