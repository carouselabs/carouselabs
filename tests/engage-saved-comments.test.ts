// Saved comments (lib/engageSavedComments.ts, lib/savedCommentsCsv.ts,
// app/api/ext/saved-comments/*): comments kept to insert again in one click
// from LinkedIn's side panel, edited on the website. Every query is scoped to
// the signed-in person; text stays exactly as written within LinkedIn's
// 1,250-character limit; an import never doubles a comment or passes the
// per-person limit; only LinkedIn's Engage menu has the section.
import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = {
  id: string
  userId: string
  platform: string
  title: string
  body: string
  tags: string[]
  favorite: boolean
  remindOn: string
  useCount: number
  lastUsedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const state = vi.hoisted(() => ({ user: { id: "u1" } as { id: string } | null, rows: [] as Row[], nextId: 1 }))

const matches = (row: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([key, value]) => (row as Record<string, unknown>)[key] === value)

vi.mock("@/lib/extensionCommentAuth", () => ({ getExtensionUser: vi.fn(async () => state.user) }))
vi.mock("@/lib/db", () => {
  const make = (data: Record<string, unknown>): Row => ({
    id: `s${state.nextId++}`,
    platform: "linkedin",
    tags: [],
    favorite: false,
    remindOn: "own",
    useCount: 0,
    lastUsedAt: null,
    createdAt: new Date(2026, 10, state.nextId),
    updatedAt: new Date(2026, 10, state.nextId),
    ...(data as object),
  }) as unknown as Row
  return {
    db: {
      engageSavedComment: {
        findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.rows.filter((r) => matches(r, where))),
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.rows.find((r) => r.id === where.id) ?? null),
        count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.rows.filter((r) => matches(r, where)).length),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = make(data)
          state.rows.push(row)
          return row
        }),
        createMany: vi.fn(async ({ data }: { data: Record<string, unknown>[] }) => {
          for (const d of data) state.rows.push(make(d))
          return { count: data.length }
        }),
        updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          const hits = state.rows.filter((r) => matches(r, where))
          for (const r of hits) {
            for (const [key, value] of Object.entries(data)) {
              if (value && typeof value === "object" && "increment" in (value as object)) {
                ;(r as Record<string, unknown>)[key] = ((r as Record<string, unknown>)[key] as number) + (value as { increment: number }).increment
              } else (r as Record<string, unknown>)[key] = value
            }
          }
          return { count: hits.length }
        }),
        deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          const before = state.rows.length
          state.rows = state.rows.filter((r) => !matches(r, where))
          return { count: before - state.rows.length }
        }),
      },
    },
  }
})

import {
  cleanBody,
  normalizeTags,
  parseSavedComment,
  parseSavedCommentChanges,
  SAVED_COMMENT_LIMITS,
  sameText,
  titleFrom,
} from "@/lib/engageSavedComments"
import { itemsFromCsv, parseCsv, savedCommentsToCsv } from "@/lib/savedCommentsCsv"
import { GET, POST } from "@/app/api/ext/saved-comments/route"
import { DELETE, PATCH } from "@/app/api/ext/saved-comments/[id]/route"
import { POST as USE } from "@/app/api/ext/saved-comments/[id]/use/route"
import { POST as IMPORT } from "@/app/api/ext/saved-comments/import/route"
import { extensionTabs, hasSection, tabPathOf } from "@/components/extension/engageExtensions"

const PINNED = "Thanks for watching! 🎥\n\nI share one growth lesson every week: https://example.com/newsletter"

const req = (method: string, body?: unknown) =>
  new Request("https://carouselabs.com/api/ext/saved-comments", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

function seed(partial: Partial<Row> & { userId: string; body: string }) {
  const row: Row = {
    id: `s${state.nextId++}`,
    platform: "linkedin",
    title: titleFrom(partial.body),
    tags: [],
    favorite: false,
    remindOn: "own",
    useCount: 0,
    lastUsedAt: null,
    createdAt: new Date(2026, 10, 1),
    updatedAt: new Date(2026, 10, 1),
    ...partial,
  }
  state.rows.push(row)
  return row
}

beforeEach(() => {
  state.user = { id: "u1" }
  state.rows = []
  state.nextId = 1
})

describe("what a saved comment holds", () => {
  it("the text exactly as written, cleaned only of stray spacing", () => {
    expect(cleanBody("  Hi there!  \r\n\r\nSee you  \n\n\n\n\nBye ")).toBe("Hi there!\n\nSee you\n\n\nBye")
    const parsed = parseSavedComment({ body: PINNED })
    expect(parsed).toEqual({
      ok: true,
      value: { title: "Thanks for watching! 🎥", body: PINNED, tags: [], favorite: false, remindOn: "own" },
    })
  })

  it("a name from the first line when none is given, cut at a word", () => {
    expect(titleFrom("\n\nShort one")).toBe("Short one")
    expect(titleFrom("This is a much longer first line that goes on well past the cut")).toBe(
      "This is a much longer first line that goes on…",
    )
  })

  it("tags without #, each once, at most eight", () => {
    expect(normalizeTags(["#pinned", "Pinned", " newsletter ", "", 4, ...Array.from({ length: 10 }, (_, i) => `t${i}`)])).toEqual([
      "pinned",
      "newsletter",
      "t0",
      "t1",
      "t2",
      "t3",
      "t4",
      "t5",
    ])
  })

  it("refuses an empty comment, one past LinkedIn's limit, a long name and an unknown reminder", () => {
    expect(parseSavedComment({ body: "   " })).toEqual({ ok: false, error: "Write the comment first." })
    expect(parseSavedComment({ body: "a".repeat(1251) })).toMatchObject({ ok: false, error: expect.stringMatching(/1,250 characters\. This one is 1,251/) })
    expect(parseSavedComment({ body: "a".repeat(1250) }).ok).toBe(true)
    expect(parseSavedComment({ body: "ok", title: "x".repeat(81) }).ok).toBe(false)
    expect(parseSavedComment({ body: "ok", remindOn: "sometimes" }).ok).toBe(false)
    expect(parseSavedComment({ body: "ok", favorite: "yes" }).ok).toBe(false)
  })

  it("an edit changes only what's sent; a name can't be cleared on its own", () => {
    expect(parseSavedCommentChanges({ favorite: true })).toEqual({ ok: true, value: { favorite: true } })
    expect(parseSavedCommentChanges({ title: "" })).toEqual({ ok: false, error: "Give it a name." })
    expect(parseSavedCommentChanges({ title: "", body: "New text here" })).toEqual({
      ok: true,
      value: { title: "New text here", body: "New text here" },
    })
    expect(parseSavedCommentChanges({})).toEqual({ ok: false, error: "Nothing to change." })
    expect(parseSavedCommentChanges({ tags: "pinned" }).ok).toBe(false)
  })

  it("the same text ignores case and spacing", () => {
    expect(sameText("Thanks  for\nwatching", "thanks for watching")).toBe(true)
    expect(sameText("Thanks", "Thank you")).toBe(false)
  })
})

describe("a spreadsheet in and out", () => {
  it("reads quoted fields with commas, quotes and line breaks", () => {
    expect(parseCsv('﻿title,body\r\nPinned,"Hi, ""friend""\nsee you"\r\n\r\n')).toEqual([
      ["title", "body"],
      ["Pinned", 'Hi, "friend"\nsee you'],
    ])
  })

  it("finds the columns by name, in any order, with the words the page uses", () => {
    const parsed = itemsFromCsv("Comment,Name,Tags,Reminder,Favorite\nHello there,Hi,pinned; video,Every post,yes\nSecond,,,never,no\n")
    expect(parsed).toEqual({
      ok: true,
      items: [
        { body: "Hello there", title: "Hi", tags: ["pinned", "video"], remindOn: "any", favorite: true },
        { body: "Second", remindOn: "off" },
      ],
    })
    expect(itemsFromCsv("title,notes\nA,B\n")).toEqual({ ok: false, error: expect.stringMatching(/column named "body"/) })
    expect(itemsFromCsv("body\n")).toEqual({ ok: false, error: "The file has no rows under its header." })
  })

  it("an export imports back as the same comments", () => {
    const exported = savedCommentsToCsv([
      {
        id: "a",
        title: "Pinned, video",
        body: PINNED,
        tags: ["pinned", "video"],
        favorite: true,
        remindOn: "own",
        useCount: 3,
        lastUsedAt: "2026-11-10T10:00:00.000Z",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ])
    expect(exported.split("\r\n")[0]).toBe("title,body,tags,remind,favorite,times used,last used")
    expect(itemsFromCsv(exported)).toEqual({
      ok: true,
      items: [{ title: "Pinned, video", body: PINNED, tags: ["pinned", "video"], remindOn: "own", favorite: true }],
    })
  })
})

describe("/api/ext/saved-comments", () => {
  it("signed out: nothing", async () => {
    state.user = null
    expect((await GET(req("GET"))).status).toBe(401)
    expect((await POST(req("POST", { body: "Hi" }))).status).toBe(401)
    expect((await PATCH(req("PATCH", { favorite: true }), params("s1"))).status).toBe(401)
    expect((await DELETE(req("DELETE"), params("s1"))).status).toBe(401)
    expect((await USE(req("POST"), params("s1"))).status).toBe(401)
    expect((await IMPORT(req("POST", { items: [{ body: "Hi" }] }))).status).toBe(401)
  })

  it("lists only your own LinkedIn comments", async () => {
    seed({ userId: "u1", body: "Mine" })
    seed({ userId: "u2", body: "Someone else's" })
    seed({ userId: "u1", body: "Mine on X", platform: "x" })
    const res = await GET(req("GET"))
    const { savedComments } = (await res.json()) as { savedComments: { body: string; lastUsedAt: unknown }[] }
    expect(savedComments.map((c) => c.body)).toEqual(["Mine"])
    expect(savedComments[0].lastUsedAt).toBeNull()
  })

  it("saves one, named from its first line, reminding on your own posts unless told otherwise", async () => {
    const res = await POST(req("POST", { body: PINNED, tags: ["#pinned"] }))
    expect(res.status).toBe(201)
    const { savedComment } = (await res.json()) as { savedComment: Record<string, unknown> }
    expect(savedComment).toMatchObject({ title: "Thanks for watching! 🎥", body: PINNED, tags: ["pinned"], remindOn: "own", useCount: 0 })
    expect(state.rows[0]).toMatchObject({ userId: "u1", platform: "linkedin" })

    expect((await POST(req("POST", { body: "" }))).status).toBe(400)
    expect((await POST(req("POST", "not json"))).status).toBe(400)
  })

  it("up to the per-person limit", async () => {
    for (let i = 0; i < SAVED_COMMENT_LIMITS.perUser; i++) seed({ userId: "u1", body: `c${i}` })
    const res = await POST(req("POST", { body: "One more" }))
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toMatch(/500 saved comments/)
  })

  it("edits and deletes only your own", async () => {
    const mine = seed({ userId: "u1", body: "Mine" })
    const theirs = seed({ userId: "u2", body: "Theirs" })

    const edited = await PATCH(req("PATCH", { favorite: true, remindOn: "any" }), params(mine.id))
    expect(edited.status).toBe(200)
    expect(((await edited.json()) as { savedComment: Record<string, unknown> }).savedComment).toMatchObject({ favorite: true, remindOn: "any", body: "Mine" })

    expect((await PATCH(req("PATCH", { favorite: true }), params(theirs.id))).status).toBe(404)
    expect(theirs.favorite).toBe(false)
    expect((await PATCH(req("PATCH", { remindOn: "always" }), params(mine.id))).status).toBe(400)

    expect((await DELETE(req("DELETE"), params(theirs.id))).status).toBe(404)
    expect(state.rows).toHaveLength(2)
    expect((await DELETE(req("DELETE"), params(mine.id))).status).toBe(200)
    expect(state.rows.map((r) => r.id)).toEqual([theirs.id])
  })

  it("counts each use and dates it", async () => {
    const mine = seed({ userId: "u1", body: "Mine" })
    const theirs = seed({ userId: "u2", body: "Theirs" })
    expect((await USE(req("POST"), params(mine.id))).status).toBe(200)
    expect((await USE(req("POST"), params(mine.id))).status).toBe(200)
    expect(mine.useCount).toBe(2)
    expect(mine.lastUsedAt).toBeInstanceOf(Date)
    expect((await USE(req("POST"), params(theirs.id))).status).toBe(404)
    expect(theirs.useCount).toBe(0)
  })
})

describe("importing many at once", () => {
  it("saves the good rows, skipping repeats, what's already saved, and bad rows, with reasons", async () => {
    seed({ userId: "u1", body: "Already here" })
    seed({ userId: "u2", body: "Someone else's" })
    const res = await IMPORT(
      req("POST", {
        items: [
          { body: "First new one", tags: ["pinned"], remindOn: "any" },
          { body: "already  HERE" },
          { body: "" },
          { body: "first new ONE" },
          { body: "Someone else's" },
        ],
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      created: 2,
      skipped: [
        { row: 2, reason: "Already saved." },
        { row: 3, reason: "Write the comment first." },
        { row: 4, reason: "Already saved." },
      ],
    })
    expect(state.rows.filter((r) => r.userId === "u1").map((r) => r.body)).toEqual(["Already here", "First new one", "Someone else's"])
    expect(state.rows.find((r) => r.body === "First new one")).toMatchObject({ remindOn: "any", tags: ["pinned"], platform: "linkedin" })
  })

  it("never past the per-person limit, and no bigger than one file's worth", async () => {
    for (let i = 0; i < SAVED_COMMENT_LIMITS.perUser - 1; i++) seed({ userId: "u1", body: `c${i}` })
    const res = await IMPORT(req("POST", { items: [{ body: "fits" }, { body: "doesn't" }] }))
    expect(await res.json()).toEqual({ created: 1, skipped: [{ row: 2, reason: "You've reached 500 saved comments." }] })

    const tooMany = await IMPORT(req("POST", { items: Array.from({ length: 501 }, (_, i) => ({ body: `r${i}` })) }))
    expect(tooMany.status).toBe(400)
    expect((await IMPORT(req("POST", { items: [] }))).status).toBe(400)
  })
})

describe("the website's Engage menu", () => {
  it("has Saved comments for LinkedIn only", () => {
    expect(extensionTabs("linkedin").map((t) => t.label)).toEqual(["Home", "Voices", "Saved comments", "Agents", "Activity", "Plan & setup"])
    expect(extensionTabs("linkedin").find((t) => t.path === "/saved")?.href).toBe("/extension/saved")
    expect(extensionTabs("x").map((t) => t.label)).not.toContain("Saved comments")
    expect(hasSection("x", "/saved")).toBe(false)
    expect(hasSection("x", "/profiles")).toBe(true)
    expect(tabPathOf("/extension/saved")).toBe("/saved")
  })
})
