// Engage's "comments per day" grid (website Activity, side panel Profile):
// the shade rules, the GitHub-style weeks, this month's totals, and the
// route that counts days in the person's own time zone.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { HEAT_SHADES, busiestByMonth, heatLevel, heatRanges, heatWeeks, localDayKey, monthCells, monthSummary } from "@/lib/engage/heatmap"
import { clampActivityDays, dayKey, safeTimeZone } from "@/lib/engage/activityDays"

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  calls: [] as { sql: string; values: unknown[] }[],
  rows: [] as { day: string; count: number }[],
  failZone: null as string | null,
}))

vi.mock("@/lib/extensionCommentAuth", () => ({ getExtensionUser: vi.fn(async () => state.user) }))
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn(async (query: Prisma.Sql) => {
      state.calls.push({ sql: query.sql, values: query.values })
      if (state.failZone && query.values.includes(state.failZone)) throw new Error("time zone not recognized")
      return state.rows
    }),
  },
}))

const { GET } = await import("@/app/api/ext/activity/route")
const get = async (query: string) => {
  const res = await GET(new Request(`https://app.test/api/ext/activity${query}`))
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

describe("shades", () => {
  it("five shades, measured against the month's busiest day, which is always the darkest", () => {
    expect(HEAT_SHADES).toHaveLength(5)
    // A busy month: busiest day 20, every shade a quarter of it.
    expect([0, 1, 5, 6, 10, 11, 15, 16, 20].map((n) => heatLevel(n, 20))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
    expect(heatRanges(20)).toEqual(["0", "1–5", "6–10", "11–15", "16–20"])
    // A quiet month: 4 is its busiest day, so it's the darkest, not a pale 4.
    expect([0, 1, 2, 3, 4].map((n) => heatLevel(n, 4))).toEqual([0, 1, 2, 3, 4])
    expect(heatRanges(4)).toEqual(["0", "1", "2", "3", "4"])
    // A busiest day under four leaves some shades unused: they get no numbers.
    expect([1, 2].map((n) => heatLevel(n, 2))).toEqual([2, 4])
    expect(heatRanges(2)).toEqual(["0", "", "1", "", "2"])
    expect(heatLevel(1, 1)).toBe(4)
    // Nothing yet, or nonsense: no shade.
    expect(heatLevel(0, 0)).toBe(0)
    expect(heatLevel(-2, 5)).toBe(0)
    expect(heatRanges(0)).toEqual(["0", "", "", "", ""])
  })

  it("each shade's numbers match the shade its days actually get", () => {
    for (const busiest of [1, 2, 3, 5, 7, 12, 13, 40]) {
      const ranges = heatRanges(busiest)
      for (let count = 1; count <= busiest; count++) {
        const shown = ranges[heatLevel(count, busiest)]
        const [low, high = low] = shown.split("–").map(Number)
        expect(count >= low && count <= high, `${count} of ${busiest} in "${shown}"`).toBe(true)
      }
    }
  })

  it("each month measured on its own: the busiest day of each", () => {
    const counts = new Map([
      ["2026-10-03", 30],
      ["2026-10-20", 6],
      ["2026-11-01", 2],
      ["2026-11-09", 4],
    ])
    const busiest = busiestByMonth(counts)
    expect([...busiest]).toEqual([
      ["2026-10", 30],
      ["2026-11", 4],
    ])
    // 4 is November's darkest even though October had a day of 30.
    expect(heatLevel(4, busiest.get("2026-11")!)).toBe(4)
    expect(heatLevel(6, busiest.get("2026-10")!)).toBe(1)
  })
})

describe("the weeks to draw", () => {
  // Thursday 12 November 2026, local time.
  const today = new Date(2026, 10, 12, 15, 30)

  it("one column a week, Sunday first, today in the last column", () => {
    const weeks = heatWeeks(today, 13)
    expect(weeks).toHaveLength(13)
    for (const col of weeks) {
      expect(col).toHaveLength(7)
      expect(col[0].date.getDay()).toBe(0)
    }
    const last = weeks[12]
    expect(last.map((c) => c.key)).toContain("2026-11-12")
    expect(last.find((c) => c.key === "2026-11-12")?.future).toBe(false)
    // Friday and Saturday are still to come.
    expect(last.filter((c) => c.future).map((c) => c.key)).toEqual(["2026-11-13", "2026-11-14"])
    // 13 weeks back from that Sunday: covers the 90 days history keeps.
    expect(weeks[0][0].key).toBe("2026-08-16")
  })

  it("every day once, in order, with no gaps", () => {
    const keys = heatWeeks(today, 13).flat().map((c) => c.key)
    expect(new Set(keys).size).toBe(91)
    expect([...keys].sort()).toEqual(keys)
  })

  it("a month as a calendar: blanks before the 1st, the rest of the month to come", () => {
    const cells = monthCells(today)
    // 1 November 2026 is a Sunday: no blanks.
    expect(cells[0]?.key).toBe("2026-11-01")
    expect(cells.filter((c) => c !== null)).toHaveLength(30)
    expect(cells.filter((c) => c?.future)).toHaveLength(18)
    const december = monthCells(new Date(2026, 11, 3))
    // 1 December 2026 is a Tuesday: Sunday and Monday blank.
    expect(december.slice(0, 2)).toEqual([null, null])
    expect(december[2]?.key).toBe("2026-12-01")
  })

  it("local day keys", () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05")
  })
})

describe("this month", () => {
  const today = new Date(2026, 10, 12)
  it("total, busiest day and days active, this month only", () => {
    const counts = new Map([
      ["2026-10-31", 50], // last month
      ["2026-11-02", 6],
      ["2026-11-06", 14],
      ["2026-11-09", 14], // a tie: the earlier day stays the busiest
      ["2026-11-12", 4],
      ["2026-11-20", 9], // after today: not counted
    ])
    expect(monthSummary(counts, today)).toEqual({
      total: 38,
      best: { key: "2026-11-06", count: 14 },
      activeDays: 4,
      daysSoFar: 12,
    })
  })

  it("nothing yet", () => {
    expect(monthSummary(new Map(), today)).toEqual({ total: 0, best: null, activeDays: 0, daysSoFar: 12 })
  })
})

describe("time zones and ranges", () => {
  it("only real zones; anything else is UTC", () => {
    expect(safeTimeZone("Asia/Kolkata")).toBe("Asia/Kolkata")
    expect(safeTimeZone("America/Argentina/Buenos_Aires")).toBe("America/Argentina/Buenos_Aires")
    for (const v of [null, "", "Mars/Olympus", "UTC'; DROP TABLE x;--", "a".repeat(80)]) expect(safeTimeZone(v)).toBe("UTC")
  })

  it("a day is the zone's day", () => {
    const instant = new Date("2026-11-11T20:00:00Z")
    expect(dayKey(instant, "UTC")).toBe("2026-11-11")
    expect(dayKey(instant, "Asia/Kolkata")).toBe("2026-11-12")
    expect(dayKey(instant, "America/Los_Angeles")).toBe("2026-11-11")
  })

  it("1 to 91 days, 35 when not given", () => {
    expect(clampActivityDays(null)).toBe(35)
    expect(clampActivityDays("abc")).toBe(35)
    expect(clampActivityDays("0")).toBe(1)
    expect(clampActivityDays("400")).toBe(91)
    expect(clampActivityDays("30")).toBe(30)
  })
})

describe("GET /api/ext/activity", () => {
  beforeEach(() => {
    state.user = { id: "user-1" }
    state.calls = []
    state.rows = []
    state.failZone = null
  })

  it("signed out: 401, nothing read", async () => {
    state.user = null
    expect((await get("")).status).toBe(401)
    expect(state.calls).toHaveLength(0)
  })

  it("counts LinkedIn's comments for this person, in their zone, as parameters", async () => {
    const today = dayKey(new Date(), "Asia/Kolkata")
    state.rows = [
      { day: "2000-01-01", count: 9 }, // older than asked for: dropped
      { day: today, count: 3 },
    ]
    const { status, body } = await get("?tz=Asia%2FKolkata&days=35")
    expect(status).toBe(200)
    expect(body).toMatchObject({ platform: "linkedin", timeZone: "Asia/Kolkata", kind: "comment", one: "comment", many: "comments" })
    expect(body.days).toEqual([{ day: today, count: 3 }])
    const call = state.calls[0]
    expect(call.values).toEqual(expect.arrayContaining(["Asia/Kolkata", "user-1", "comment"]))
    // The zone and the user are bound values, never spliced into the SQL.
    expect(call.sql).not.toContain("Asia/Kolkata")
    expect(call.sql).not.toContain("user-1")
    expect(call.sql).toContain('public."CommentHistory"')
  })

  it("X counts replies; a made-up zone is UTC", async () => {
    const { body } = await get("?platform=x&tz=Not%2FAZone")
    expect(body).toMatchObject({ platform: "x", kind: "x_reply", many: "replies", timeZone: "UTC" })
    expect(state.calls[0].values).toEqual(expect.arrayContaining(["UTC", "x_reply"]))
  })

  it("a zone the database doesn't know: counted again in UTC", async () => {
    state.failZone = "Asia/Kolkata"
    const { status } = await get("?tz=Asia%2FKolkata")
    expect(status).toBe(200)
    expect(state.calls).toHaveLength(2)
    expect(state.calls[1].values).toContain("UTC")
  })
})
