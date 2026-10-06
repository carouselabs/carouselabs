// @vitest-environment node
// Engage access, end to end on the server: the rules that turn plan +
// subscription + admin overrides + grants + suspension into effective access
// (lib/engage/accessRules.ts), and the gate every generation route goes
// through (lib/engage/gate.ts), against an in-memory stand-in for Prisma whose
// conditional updates behave like Postgres's (only matching rows change).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

type Row = { userId: string; feature: string; period: string; periodStart: Date; count: number };
type Grant = { id: string; userId: string | null; email: string; startsAt: Date; endsAt: Date | null; revokedAt: Date | null; reason: string; grantedBy: string; createdAt: Date };

const state = vi.hoisted(() => ({
  enforced: true,
  user: null as null | {
    id: string; email: string; suspendedAt: Date | null; deletedAt: Date | null; extensionTrialUsed: number;
    engageControl: null | { features: unknown; limits: unknown; freeGenerations: number | null; suspendedAt: Date | null; suspendReason: string | null };
    extensionSubscription: null | { status: string; endsAt: Date | null };
  },
  grants: [] as Grant[],
  counters: [] as Row[],
  grantsThrow: null as null | Error,
  dailyCaps: [] as unknown[],
  dailyBlocked: false,
}));

const sameKey = (r: Row, w: { userId: string; feature: string; period: string; periodStart: Date }) =>
  r.userId === w.userId && r.feature === w.feature && r.period === w.period && r.periodStart.getTime() === w.periodStart.getTime();

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), updateMany: vi.fn() },
  extensionSubscription: { findUnique: vi.fn() },
  engageAccessGrant: { findMany: vi.fn(), updateMany: vi.fn(async () => ({ count: 0 })) },
  engageUsageCounter: { createMany: vi.fn(), updateMany: vi.fn() },
  // Settings for everyone (phase B): none saved, so everything on.
  engageSetting: { findMany: vi.fn(async () => []) },
}));

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/commentCredits", () => ({
  get COMMENT_CREDITS_ENFORCED() {
    return state.enforced;
  },
}));
vi.mock("../../../lib/extDailyLimit", () => ({
  extDailyLimitResponse: vi.fn(async (_userId: string, cap: unknown) => {
    state.dailyCaps.push(cap);
    const { NextResponse } = await import("next/server");
    return state.dailyBlocked ? NextResponse.json({ error: "cooldown", cooldown: true }, { status: 429 }) : null;
  }),
}));

import { computeEngageAccess, blockedReason, type EngageAccessInput } from "../../../lib/engage/accessRules";
import { engagePreflight, reserveEngageGeneration } from "../../../lib/engage/gate";

// A writing request from the extension (its version only matters once an
// admin sets a minimum: tests/unit/engageControls.server.test.ts).
const REQ = new Request("https://carouselabs.com/api/ext/generate", { method: "POST", headers: { "x-engage-version": "1.3.0" } });

const NOW = new Date("2026-10-15T12:00:00.000Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

function input(over: Partial<EngageAccessInput> = {}): EngageAccessInput {
  return { now: NOW, paywallEnforced: true, accountSuspendedAt: null, control: null, subscription: null, grants: [], freeUsed: 0, ...over };
}
const grant = (over: Partial<Grant> = {}): Grant => ({
  id: "g", userId: "u1", email: "u1@example.com", startsAt: days(-1), endsAt: days(30), revokedAt: null,
  reason: "test", grantedBy: "owner@x", createdAt: days(-1), ...over,
});
const control = (over: Partial<NonNullable<NonNullable<typeof state.user>["engageControl"]>> = {}) => ({
  features: {}, limits: {}, freeGenerations: null, suspendedAt: null, suspendReason: null, ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  state.enforced = true;
  state.user = { id: "u1", email: "U1@example.com", suspendedAt: null, deletedAt: null, extensionTrialUsed: 0, engageControl: null, extensionSubscription: null };
  state.grants = [];
  state.counters = [];
  state.grantsThrow = null;
  state.dailyCaps = [];
  state.dailyBlocked = false;

  db.user.findUnique.mockImplementation(async ({ select }: { select: Record<string, unknown> }) => {
    if (!state.user) return null;
    if (select && "extensionTrialUsed" in select && Object.keys(select).length === 1) return { extensionTrialUsed: state.user.extensionTrialUsed };
    return state.user;
  });
  db.user.updateMany.mockImplementation(async ({ where, data }: { where: { extensionTrialUsed: { lt?: number; gt?: number } }; data: { extensionTrialUsed: { increment?: number; decrement?: number } } }) => {
    const u = state.user!;
    const { lt, gt } = where.extensionTrialUsed;
    if ((lt !== undefined && !(u.extensionTrialUsed < lt)) || (gt !== undefined && !(u.extensionTrialUsed > gt))) return { count: 0 };
    u.extensionTrialUsed += data.extensionTrialUsed.increment ?? -(data.extensionTrialUsed.decrement ?? 0);
    return { count: 1 };
  });
  db.extensionSubscription.findUnique.mockImplementation(async () => state.user?.extensionSubscription ?? null);
  db.engageAccessGrant.findMany.mockImplementation(async () => {
    if (state.grantsThrow) throw state.grantsThrow;
    return state.grants;
  });
  db.engageUsageCounter.createMany.mockImplementation(async ({ data }: { data: Row[] }) => {
    for (const row of data) if (!state.counters.some((r) => sameKey(r, row))) state.counters.push({ ...row });
    return { count: 1 };
  });
  db.engageUsageCounter.updateMany.mockImplementation(async ({ where, data }: { where: Row & { count?: { lt?: number; gt?: number } }; data: { count: { increment?: number; decrement?: number } } }) => {
    const row = state.counters.find((r) => sameKey(r, where));
    if (!row) return { count: 0 };
    if (where.count?.lt !== undefined && !(row.count < where.count.lt)) return { count: 0 };
    if (where.count?.gt !== undefined && !(row.count > where.count.gt)) return { count: 0 };
    row.count += data.count.increment ?? -(data.count.decrement ?? 0);
    return { count: 1 };
  });
});

const counter = (feature: string, period: "day" | "month") =>
  state.counters.find((r) => r.feature === feature && r.period === period)?.count ?? 0;

describe("effective access rules", () => {
  it("plan defaults: free, 10 free generations, every feature on, 450/day, no per-feature limits", () => {
    const a = computeEngageAccess(input({ freeUsed: 3 }));
    expect(a).toMatchObject({ status: "active", access: "free", source: "free", freeRemaining: 7 });
    expect(a.freeGenerations).toEqual({ plan: 10, override: null, effective: 10 });
    expect(Object.values(a.features).every((f) => f.enabled)).toBe(true);
    expect(a.limits.dailyCap).toEqual({ plan: 450, override: null, effective: 450 });
    expect(a.limits["comments.month"]).toEqual({ plan: "unlimited", override: null, effective: "unlimited" });
  });

  it("an active subscription is unlimited; a cancelled one only until it ends", () => {
    expect(computeEngageAccess(input({ subscription: { status: "active", endsAt: null } })).source).toBe("subscription");
    expect(computeEngageAccess(input({ subscription: { status: "cancelled", endsAt: days(3) } })).access).toBe("unlimited");
    expect(computeEngageAccess(input({ subscription: { status: "cancelled", endsAt: days(-1) } })).access).toBe("free");
  });

  it("grants: active, lifetime, expired, revoked and not-yet-started", () => {
    expect(computeEngageAccess(input({ grants: [grant()] })).source).toBe("grant");
    expect(computeEngageAccess(input({ grants: [grant({ endsAt: null })] })).activeGrant?.endsAt).toBeNull();
    expect(computeEngageAccess(input({ grants: [grant({ endsAt: days(-1) })] })).access).toBe("free");
    expect(computeEngageAccess(input({ grants: [grant({ revokedAt: days(-0.5) })] })).access).toBe("free");
    expect(computeEngageAccess(input({ grants: [grant({ startsAt: days(2) })] })).access).toBe("free");
    // Expiry is exact: at the end moment access is gone.
    expect(computeEngageAccess(input({ grants: [grant({ endsAt: NOW })] })).access).toBe("free");
  });

  it("overlapping grants: lifetime wins, otherwise the longest", () => {
    const a = computeEngageAccess(input({ grants: [grant({ id: "a", endsAt: days(10) }), grant({ id: "b", endsAt: days(90) }), grant({ id: "c", endsAt: days(5) })] }));
    expect(a.activeGrant?.id).toBe("b");
    const b = computeEngageAccess(input({ grants: [grant({ id: "a", endsAt: days(90) }), grant({ id: "life", endsAt: null })] }));
    expect(b.activeGrant?.id).toBe("life");
  });

  it("paid first: a subscriber with a grant is shown as paying", () => {
    expect(computeEngageAccess(input({ subscription: { status: "active", endsAt: null }, grants: [grant()] })).source).toBe("subscription");
  });

  it("overrides show plan, override and effective value side by side", () => {
    const a = computeEngageAccess(input({
      control: control({ features: { messages: "off" }, limits: { "comments.month": 500, dailyCap: "unlimited" }, freeGenerations: 25 }),
      freeUsed: 4,
    }));
    expect(a.features.messages).toEqual({ override: "off", paused: false, pauseMessage: null, enabled: false });
    expect(a.features.comments).toEqual({ override: null, paused: false, pauseMessage: null, enabled: true });
    expect(a.limits["comments.month"]).toEqual({ plan: "unlimited", override: 500, effective: 500 });
    expect(a.limits.dailyCap).toEqual({ plan: 450, override: "unlimited", effective: "unlimited" });
    expect(a.freeGenerations).toEqual({ plan: 10, override: 25, effective: 25 });
    expect(a.freeRemaining).toBe(21);
  });

  it("stored values that don't validate count as no override", () => {
    const a = computeEngageAccess(input({ control: control({ features: { messages: "maybe" }, limits: { "comments.month": -3 } }) }));
    expect(a.features.messages.enabled).toBe(true);
    expect(a.limits["comments.month"].effective).toBe("unlimited");
  });

  it("suspension blocks everything; an account suspension outranks an Engage pause", () => {
    const paused = computeEngageAccess(input({ control: control({ suspendedAt: days(-1), suspendReason: "abuse" }), grants: [grant({ endsAt: null })] }));
    expect(paused).toMatchObject({ status: "suspended", suspendReason: "abuse", access: "unlimited" });
    expect(blockedReason(paused, "comments")?.code).toBe("suspended");
    expect(blockedReason(paused, null)?.error).toMatch(/support@carouselabs\.com/);
    const account = computeEngageAccess(input({ accountSuspendedAt: days(-2), control: control({ suspendedAt: days(-1) }) }));
    expect(account.status).toBe("account_suspended");
  });

  it("Shorter/Longer needs comments or replies on; the profile Test needs comments", () => {
    const repliesOnly = computeEngageAccess(input({ control: control({ features: { comments: "off" } }) }));
    expect(blockedReason(repliesOnly, "rewrites")).toBeNull();
    expect(blockedReason(repliesOnly, "tests")?.code).toBe("feature_disabled");
    expect(blockedReason(repliesOnly, "comments")?.error).toBe("AI comments isn't available on your account.");
    const neither = computeEngageAccess(input({ control: control({ features: { comments: "off", replies: "off" } }) }));
    expect(blockedReason(neither, "rewrites")?.code).toBe("feature_disabled");
  });

  it("testing mode lifts the paywall but keeps admin controls", () => {
    const a = computeEngageAccess(input({ paywallEnforced: false, control: control({ features: { messages: "off" } }) }));
    expect(a.access).toBe("testing");
    expect(a.freeRemaining).toBeNull();
    expect(blockedReason(a, "messages")?.code).toBe("feature_disabled");
  });
});

describe("the generation gate", () => {
  it("your example: Free plan, comments/month override 500 — 499 used, the 500th is allowed, the 501st refused", async () => {
    state.user!.extensionSubscription = { status: "active", endsAt: null };
    state.user!.engageControl = control({ limits: { "comments.month": 500 } });
    state.counters.push({ userId: "u1", feature: "comments", period: "month", periodStart: new Date(Date.UTC(2026, 9, 1)), count: 499 });

    const ok = await reserveEngageGeneration("u1", "comments");
    expect(ok.ok).toBe(true);
    expect(counter("comments", "month")).toBe(500);

    const refused = await reserveEngageGeneration("u1", "comments");
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.response.status).toBe(429);
    expect(await refused.response.json()).toMatchObject({ code: "limit_reached", period: "month", error: "You've reached your limit of 500 comments this month." });
    // The refused attempt took nothing from today's count either.
    expect(counter("comments", "day")).toBe(1);
  });

  it("a day limit refuses the next one and leaves the month count alone", async () => {
    state.user!.engageControl = control({ limits: { "messages.day": 2 } });
    state.user!.extensionSubscription = { status: "active", endsAt: null };
    expect((await reserveEngageGeneration("u1", "messages")).ok).toBe(true);
    expect((await reserveEngageGeneration("u1", "messages")).ok).toBe(true);
    const third = await reserveEngageGeneration("u1", "messages");
    expect(third.ok).toBe(false);
    expect(counter("messages", "day")).toBe(2);
    expect(counter("messages", "month")).toBe(2);
  });

  it("a limit of 0 refuses at once; unlimited never refuses", async () => {
    state.user!.extensionSubscription = { status: "active", endsAt: null };
    state.user!.engageControl = control({ limits: { "replies.day": 0, "comments.day": "unlimited" } });
    expect((await reserveEngageGeneration("u1", "replies")).ok).toBe(false);
    for (let i = 0; i < 20; i++) expect((await reserveEngageGeneration("u1", "comments")).ok).toBe(true);
    expect(counter("comments", "day")).toBe(20);
  });

  it("two requests racing for the last slot: exactly one gets it", async () => {
    state.user!.extensionSubscription = { status: "active", endsAt: null };
    state.user!.engageControl = control({ limits: { "comments.day": 1 } });
    const [a, b] = await Promise.all([reserveEngageGeneration("u1", "comments"), reserveEngageGeneration("u1", "comments")]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(counter("comments", "day")).toBe(1);
  });

  it("free users spend their own free allowance; the message names it", async () => {
    state.user!.engageControl = control({ freeGenerations: 12 });
    state.user!.extensionTrialUsed = 10;
    const eleventh = await reserveEngageGeneration("u1", "comments");
    expect(eleventh).toMatchObject({ ok: true, freeRemaining: 1 });
    expect((await reserveEngageGeneration("u1", "comments")).ok).toBe(true);
    const thirteenth = await reserveEngageGeneration("u1", "comments");
    expect(thirteenth.ok).toBe(false);
    if (thirteenth.ok) return;
    expect(thirteenth.response.status).toBe(402);
    expect((await thirteenth.response.json()).error).toMatch(/your 12 free generations/);
    // The refused one gave its usage count back.
    expect(counter("comments", "day")).toBe(2);
  });

  it("granted users don't spend free generations; when the grant expires they do again", async () => {
    state.grants = [grant({ endsAt: days(1) })];
    state.user!.extensionTrialUsed = 10;
    expect(await reserveEngageGeneration("u1", "connection_notes")).toMatchObject({ ok: true, freeRemaining: null });
    expect(state.user!.extensionTrialUsed).toBe(10);

    vi.setSystemTime(days(2));
    const after = await reserveEngageGeneration("u1", "connection_notes");
    expect(after.ok).toBe(false);
  });

  it("a failed generation gives back its usage count and free generation", async () => {
    const gate = await reserveEngageGeneration("u1", "messages");
    expect(gate.ok).toBe(true);
    expect(state.user!.extensionTrialUsed).toBe(1);
    expect(counter("messages", "month")).toBe(1);
    if (gate.ok) await gate.release();
    expect(state.user!.extensionTrialUsed).toBe(0);
    expect(counter("messages", "month")).toBe(0);
    expect(counter("messages", "day")).toBe(0);
  });

  it("gives them back once, however many times a cancelled request reports it", async () => {
    state.user!.extensionTrialUsed = 3;
    const gate = await reserveEngageGeneration("u1", "comments");
    expect(state.user!.extensionTrialUsed).toBe(4);
    if (gate.ok) await Promise.all([gate.release(), gate.release()]);
    if (gate.ok) await gate.release();
    expect(state.user!.extensionTrialUsed).toBe(3);
    expect(counter("comments", "day")).toBe(0);
    expect(counter("comments", "month")).toBe(0);
  });

  it("preflight: suspension and a switched-off feature answer 403 before any work", async () => {
    state.user!.engageControl = control({ features: { connection_notes: "off" } });
    const off = await engagePreflight("u1", "connection_notes", REQ);
    expect(off.response?.status).toBe(403);
    expect(await off.response?.json()).toMatchObject({ code: "feature_disabled" });

    state.user!.engageControl = control({ suspendedAt: days(-1) });
    const paused = await engagePreflight("u1", null, REQ);
    expect(paused.response?.status).toBe(403);
    expect(state.dailyCaps).toEqual([]); // never counted against the daily cap
  });

  it("generate learns comment-or-reply late: the reply switch is checked at reservation", async () => {
    state.user!.engageControl = control({ features: { replies: "off" } });
    const pre = await engagePreflight("u1", null, REQ);
    expect(pre.response).toBeNull();
    const gate = await reserveEngageGeneration("u1", "replies", pre);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(403);
  });

  it("the daily cap uses the user's own: plan 450, a custom number, or none", async () => {
    await engagePreflight("u1", "comments", REQ);
    state.user!.engageControl = control({ limits: { dailyCap: 900 } });
    await engagePreflight("u1", "comments", REQ);
    state.user!.engageControl = control({ limits: { dailyCap: "unlimited" } });
    await engagePreflight("u1", "comments", REQ);
    expect(state.dailyCaps).toEqual([450, 900, "unlimited"]);
  });

  it("before the admin tables exist, falls back to the plan rules instead of failing", async () => {
    state.grantsThrow = new Prisma.PrismaClientKnownRequestError("The table `EngageAccessGrant` does not exist", { code: "P2021", clientVersion: "5.22.0" });
    const pre = await engagePreflight("u1", "comments", REQ);
    expect(pre.response).toBeNull();
    expect(state.dailyCaps).toEqual([undefined]); // the default cap
    const gate = await reserveEngageGeneration("u1", "comments", pre);
    expect(gate).toMatchObject({ ok: true, freeRemaining: 9 });
    expect(state.counters).toEqual([]);
  });

  it("any other database error is not swallowed", async () => {
    state.grantsThrow = new Error("connection refused");
    await expect(engagePreflight("u1", "comments", REQ)).rejects.toThrow("connection refused");
  });
});
