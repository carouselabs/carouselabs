// The "installed, used once or never" audiences (lib/engage/audience.ts):
// people signed in to an Engage extension with at most one real generation,
// taking the highest of the trial counter, the 90-day history and the AI
// call log, so neither a paid/granted user (trial counter stays 0) nor
// someone whose history was cleaned up is mistaken for a non-user.
import { beforeEach, describe, expect, it, vi } from "vitest"

type Person = { id: string; email: string; extensionTrialUsed: number; xTrialUsed: number }

const store = vi.hoisted(() => ({
  people: [] as Person[],
  history: [] as { userId: string; kind: string }[],
  calls: [] as { userId: string; kind: string; outcome: string }[],
  findManyWhere: [] as unknown[],
}))

function countBy<T extends { userId: string }>(rows: T[], where: { userId: { in: string[] }; kind: { in: string[] }; outcome?: string }) {
  const counts = new Map<string, number>()
  for (const r of rows) {
    if (!where.userId.in.includes(r.userId) || !where.kind.in.includes((r as unknown as { kind: string }).kind)) continue
    if (where.outcome && (r as unknown as { outcome: string }).outcome !== where.outcome) continue
    counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1)
  }
  return [...counts].map(([userId, n]) => ({ userId, _count: { _all: n } }))
}

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(async ({ where }: { where: { id?: string } }) => {
        store.findManyWhere.push(where)
        return store.people.filter((p) => !where.id || p.id === where.id)
      }),
    },
    commentHistory: { groupBy: vi.fn(async ({ where }) => countBy(store.history, where)) },
    engageAiCall: { groupBy: vi.fn(async ({ where }) => countBy(store.calls, where)) },
  },
}))

import { ENGAGE_LOW_USE_SEGMENTS, generationsUsed, lowUseEngageUsers } from "@/lib/engage/audience"
import { SEGMENT_TYPES } from "@/lib/segments"

const person = (id: string, trial = 0, xTrial = 0): Person => ({ id, email: `${id}@example.test`, extensionTrialUsed: trial, xTrialUsed: xTrial })
const ids = async (platform: "linkedin" | "x") => (await lowUseEngageUsers(platform)).map((u) => u.id)

beforeEach(() => {
  store.people = []
  store.history = []
  store.calls = []
  store.findManyWhere = []
})

describe("installed, used once or never", () => {
  it("are new audiences for LinkedIn and X", () => {
    expect(ENGAGE_LOW_USE_SEGMENTS).toEqual({ engage_linkedin_low: "linkedin", engage_x_low: "x" })
    const values = SEGMENT_TYPES.map((s) => s.value as string)
    expect(values).toContain("engage_linkedin_low")
    expect(values).toContain("engage_x_low")
  })

  it("only looks at people signed in to that extension", async () => {
    await lowUseEngageUsers("linkedin")
    expect(store.findManyWhere[0]).toMatchObject({ deletedAt: null, extensionTokens: { some: expect.anything() } })
  })

  it("includes people who never generated, or generated once", async () => {
    store.people = [person("never"), person("once", 1), person("twice", 2)]
    expect(await ids("linkedin")).toEqual(["never", "once"])
  })

  it("a paid or granted user's use counts even though their trial counter stays 0", async () => {
    store.people = [person("granted"), person("quiet")]
    store.history = Array.from({ length: 5 }, () => ({ userId: "granted", kind: "comment" }))
    expect(await ids("linkedin")).toEqual(["quiet"])
  })

  it("use older than the 90-day history still counts through the AI call log", async () => {
    store.people = [person("old-regular"), person("quiet")]
    store.calls = [
      { userId: "old-regular", kind: "comments", outcome: "ok" },
      { userId: "old-regular", kind: "replies", outcome: "ok" },
      // Failed calls aren't use.
      { userId: "quiet", kind: "comments", outcome: "error" },
      { userId: "quiet", kind: "comments", outcome: "timeout" },
    ]
    expect(await ids("linkedin")).toEqual(["quiet"])
  })

  it("X counts only X: its own trial counter, history and calls", async () => {
    store.people = [person("li-heavy", 9, 0), person("x-heavy", 0, 4), person("x-once", 0, 0)]
    store.history = [
      { userId: "x-once", kind: "x_reply" },
      { userId: "li-heavy", kind: "comment" },
      { userId: "li-heavy", kind: "comment" },
    ]
    expect(await ids("x")).toEqual(["li-heavy", "x-once"])
    expect(await ids("linkedin")).toEqual(["x-heavy", "x-once"])
  })

  it("the highest of the three counts decides", () => {
    expect(generationsUsed({ trial: 0, history: 0, aiCalls: 0 })).toBe(0)
    expect(generationsUsed({ trial: 1, history: 0, aiCalls: 3 })).toBe(3)
    expect(generationsUsed({ trial: 10, history: 2, aiCalls: 0 })).toBe(10)
  })

  it("can check one person (for email sequences)", async () => {
    store.people = [person("a"), person("b", 5)]
    expect((await lowUseEngageUsers("linkedin", "a")).map((u) => u.id)).toEqual(["a"])
    expect(await lowUseEngageUsers("linkedin", "b")).toEqual([])
  })
})

describe("the audiences are wired into sending and sequences", () => {
  it("a broadcast, scheduled email or campaign to it reaches exactly those people", async () => {
    const { resolveRecipients } = await import("@/lib/broadcast")
    store.people = [person("never"), person("busy", 7)]
    expect(await resolveRecipients("engage_linkedin_low")).toEqual([{ userId: "never", email: "never@example.test" }])
  })

  it("an email sequence for it enrolls someone only while they fit", async () => {
    const { matchesSegment } = await import("@/lib/emailSequences")
    store.people = [person("never"), person("busy", 7)]
    const user = (id: string) => ({ id, deletedAt: null, updatedAt: new Date() })
    expect(await matchesSegment(user("never"), null, "engage_linkedin_low", null)).toBe(true)
    expect(await matchesSegment(user("busy"), null, "engage_linkedin_low", null)).toBe(false)
  })
})
