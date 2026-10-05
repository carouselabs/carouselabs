import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ db: { $transaction: vi.fn(), subscription: { findUnique: vi.fn() } } }))
vi.mock("@/lib/db", () => ({ db: mocks.db }))
import { availableCredits, consumeCredits } from "@/lib/credits"
import { refundCreditsForAction } from "@/lib/refundCredits"

let sub: {
  userId: string; plan: "FREE" | "PRO" | "GROWTH"; creditsUsed: number;
  creditsTotal: number; extraCredits: number; extraCreditsExpiry: Date | null; currentPeriodStart: Date | null
}
let raceOnce: (() => void) | undefined
function matches(value: unknown, condition: unknown): boolean {
  if (condition && typeof condition === "object" && !(condition instanceof Date)) {
    const rule = condition as { gte?: number; gt?: Date }
    if (rule.gte !== undefined) return Number(value) >= rule.gte
    if (rule.gt) return value instanceof Date && value > rule.gt
  }
  return value instanceof Date && condition instanceof Date ? value.getTime() === condition.getTime() : value === condition
}
const client = {
  subscription: {
    findUnique: vi.fn(async () => structuredClone(sub)),
    updateMany: vi.fn(async ({ where, data }) => {
      if (raceOnce) { const race = raceOnce; raceOnce = undefined; race() }
      if (!Object.entries(where).every(([key, condition]) => key === "OR" || matches(sub[key as keyof typeof sub], condition))) return { count: 0 }
      if (where.OR && !where.OR.some((rule: Record<string, unknown>) => Object.entries(rule).every(([key, condition]) => matches(sub[key as keyof typeof sub], condition)))) return { count: 0 }
      for (const key of ["creditsUsed", "extraCredits"] as const) {
        sub[key] += data[key]?.increment ?? 0
        sub[key] -= data[key]?.decrement ?? 0
      }
      return { count: 1 }
    }),
  },
}
beforeEach(() => {
  sub = { userId: "a", plan: "PRO", creditsUsed: 995, creditsTotal: 1000, extraCredits: 5, extraCreditsExpiry: null, currentPeriodStart: new Date("2026-09-01") }
  raceOnce = undefined
  mocks.db.$transaction.mockImplementation(async fn => fn(client))
  mocks.db.subscription.findUnique.mockImplementation(async () => structuredClone(sub))
})

describe("credit accounting with mocked atomic updates", () => {
  it("charges a split in one atomic update and refunds each exact pool", async () => {
    const charge = await consumeCredits("a", 8)
    expect(charge).toMatchObject({ ok: true, remaining: 2, receipt: { primary: 5, extra: 3 } })
    expect(sub).toMatchObject({ creditsUsed: 1000, extraCredits: 2 })
    await refundCreditsForAction(charge.receipt)
    expect(sub).toMatchObject({ creditsUsed: 995, extraCredits: 5 })
  })
  it("does not overspend the last balance under concurrent requests", async () => {
    const results = await Promise.all([consumeCredits("a", 8), consumeCredits("a", 8)])
    expect(results.filter(result => result.ok)).toHaveLength(1)
    expect(availableCredits(sub)).toBe(2)
  })
  it("rechecks plan ceilings if a renewal or downgrade races a charge", async () => {
    raceOnce = () => { sub.plan = "FREE"; sub.creditsUsed = 25; sub.extraCredits = 0 }
    expect((await consumeCredits("a", 8)).ok).toBe(false)
    expect(sub.creditsUsed).toBe(25)
  })
  it("rejects negative, fractional and nonfinite charges", async () => {
    for (const amount of [-1, 0.5, NaN, Infinity]) await expect(consumeCredits("a", amount)).rejects.toThrow("Invalid credit amount")
    expect(sub.creditsUsed).toBe(995)
  })
  it("does not allow expired extras to cover a charge", async () => {
    sub.extraCreditsExpiry = new Date("2020-01-01")
    expect((await consumeCredits("a", 8)).ok).toBe(false)
  })
  it("refunds one receipt at most once even when failure handlers overlap", async () => {
    const charge = await consumeCredits("a", 8)
    await Promise.all([refundCreditsForAction(charge.receipt), refundCreditsForAction(charge.receipt)])
    expect(sub).toMatchObject({ creditsUsed: 995, extraCredits: 5 })
  })
  it("does not refund an extra-pool charge into allowance spent by another request", async () => {
    sub.creditsUsed = 1000
    const charge = await consumeCredits("a", 5)
    await refundCreditsForAction(charge.receipt)
    expect(sub).toMatchObject({ creditsUsed: 1000, extraCredits: 5 })
  })
  it("does not subtract an old charge from a renewed month's usage", async () => {
    const charge = await consumeCredits("a", 8)
    sub.currentPeriodStart = new Date("2026-10-01"); sub.creditsUsed = 10
    await refundCreditsForAction(charge.receipt)
    expect(sub).toMatchObject({ creditsUsed: 10, extraCredits: 5 })
  })
  it("keeps free lifetime credits and valid administrator extras available", () => {
    sub.plan = "FREE"; sub.creditsUsed = 23
    expect(availableCredits(sub)).toBe(7)
  })
})
