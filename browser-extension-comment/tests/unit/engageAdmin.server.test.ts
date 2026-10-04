// @vitest-environment node
// The Engage admin API: who may call it (server-side, whatever the UI shows),
// that every change is written to the audit trail with before/after and why,
// and the grant/limit/suspension actions themselves. Plus the pure helpers
// (grant lengths, overview ranges) and the extension token check.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: { id: "admin1", email: "owner@carouselabs.com" } as null | { id: string; email: string },
  users: new Map<string, { id: string; email: string; deletedAt: Date | null; extensionTrialUsed: number; xTrialUsed?: number }>(),
  controls: new Map<string, { userId: string; features: unknown; limits: unknown; freeGenerations: number | null; suspendedAt: Date | null }>(),
  grants: [] as Array<Record<string, unknown> & { id: string; userId: string | null; email: string; endsAt: Date | null; revokedAt: Date | null }>,
  audit: [] as Array<Record<string, unknown>>,
  tokens: [] as Array<{ id: string; userId: string; revokedAt: Date | null }>,
  emails: [] as string[],
}));

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.users.get(where.id) ?? null),
    findFirst: vi.fn(async ({ where }: { where: { email: { equals: string } } }) =>
      [...state.users.values()].find((u) => u.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, number> }) => {
      const u = state.users.get(where.id)! as Record<string, unknown>;
      Object.assign(u, data);
      return u;
    }),
  },
  engageUserControl: {
    findUnique: vi.fn(async ({ where }: { where: { userId: string } }) => state.controls.get(where.userId) ?? null),
    upsert: vi.fn(async ({ where, create, update }: { where: { userId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const existing = state.controls.get(where.userId);
      const next = { ...(existing ?? { features: {}, limits: {}, freeGenerations: null, suspendedAt: null }), ...(existing ? update : create), userId: where.userId };
      state.controls.set(where.userId, next as never);
      return next;
    }),
  },
  engageAccessGrant: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const g = { id: `g${state.grants.length + 1}`, revokedAt: null, ...data } as (typeof state.grants)[number];
      state.grants.push(g);
      return g;
    }),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.grants.find((g) => g.id === where.id) ?? null),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const g = state.grants.find((x) => x.id === where.id)!;
      Object.assign(g, data);
      return g;
    }),
  },
  extensionToken: {
    updateMany: vi.fn(async ({ where }: { where: { userId: string; id?: string } }) => {
      const hit = state.tokens.filter((t) => t.userId === where.userId && !t.revokedAt && (!where.id || t.id === where.id));
      for (const t of hit) t.revokedAt = new Date();
      return { count: hit.length };
    }),
  },
  adminUserTag: { upsert: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({ count: 1 })) },
  auditLog: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { state.audit.push(data); return { id: "a" }; }) },
}));

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/adminAuth", () => ({ getAdminUser: vi.fn(async () => state.admin) }));
vi.mock("../../../lib/email", () => ({
  sendEngageAccessGrantedEmail: vi.fn(async (email: string) => { state.emails.push(email); }),
}));
vi.mock("../../../lib/engage/usage", () => ({ resetUsage: vi.fn(async () => 1) }));
vi.mock("../../../lib/extDailyLimit", () => ({ resetExtDailyLimit: vi.fn(async () => {}) }));

import { PATCH as controlsRoute } from "../../../app/api/admin/engage/users/[userId]/controls/route";
import { POST as userGrantRoute } from "../../../app/api/admin/engage/users/[userId]/grants/route";
import { POST as addUserRoute } from "../../../app/api/admin/engage/grants/route";
import { PATCH as grantRoute } from "../../../app/api/admin/engage/grants/[grantId]/route";
import { POST as suspendRoute } from "../../../app/api/admin/engage/users/[userId]/suspend/route";
import { POST as resetRoute } from "../../../app/api/admin/engage/users/[userId]/reset-usage/route";
import { POST as sessionsRoute } from "../../../app/api/admin/engage/users/[userId]/sessions/route";
import { POST as tagRoute } from "../../../app/api/admin/engage/users/[userId]/tags/route";
import { grantEndsAt, grantState } from "../../../lib/engage/grants";
import { resolveRange } from "../../../lib/engage/ranges";
import { roleCan } from "../../../lib/engage/adminAccess";

const ORIGIN = "https://admin.carouselabs.com";
const req = (method: string, body?: unknown, origin: string | null = ORIGIN, path = "/api/admin/engage/x") =>
  new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(() => {
  state.admin = { id: "admin1", email: "owner@carouselabs.com" };
  state.users = new Map([
    ["u1", { id: "u1", email: "john@example.com", deletedAt: null, extensionTrialUsed: 7, xTrialUsed: 3 }],
    ["admin1", { id: "admin1", email: "owner@carouselabs.com", deletedAt: null, extensionTrialUsed: 0 }],
  ]);
  state.controls = new Map();
  state.grants = [];
  state.audit = [];
  state.tokens = [{ id: "t1", userId: "u1", revokedAt: null }, { id: "t2", userId: "u1", revokedAt: null }];
  state.emails = [];
});

describe("authorization is decided on the server", () => {
  it("refuses anyone who isn't an admin, whatever they send", async () => {
    state.admin = null;
    const res = await controlsRoute(req("PATCH", { features: { comments: "off" } }), ctx({ userId: "u1" }));
    expect(res.status).toBe(403);
    expect(state.controls.size).toBe(0);
    expect(state.audit).toHaveLength(0);
  });

  it("refuses a write from another site, even with the admin's cookie", async () => {
    for (const origin of ["https://evil.example", null]) {
      const res = await suspendRoute(req("POST", { suspend: true, reason: "test" }, origin), ctx({ userId: "u1" }));
      expect(res.status).toBe(403);
    }
    expect(state.controls.size).toBe(0);
  });

  it("roles: support can manage access but not pause users; viewers only read", () => {
    expect(roleCan("support_admin", "engage.access.manage")).toBe(true);
    expect(roleCan("support_admin", "engage.users.suspend")).toBe(false);
    expect(roleCan("analytics_viewer", "engage.view")).toBe(true);
    expect(roleCan("analytics_viewer", "engage.access.manage")).toBe(false);
    expect(roleCan("owner", "engage.export")).toBe(true);
  });
});

describe("per-user controls", () => {
  it("unlimited comments for one user without touching anyone else, audited with before and after", async () => {
    const res = await controlsRoute(
      req("PATCH", { limits: { "comments.month": "unlimited" }, features: { messages: "off" }, reason: "Partner" }),
      ctx({ userId: "u1" }),
    );
    expect(res.status).toBe(200);
    expect(state.controls.get("u1")).toMatchObject({ limits: { "comments.month": "unlimited" }, features: { messages: "off" } });
    expect(state.audit.map((a) => a.action)).toEqual(["ENGAGE_UPDATE_FEATURES", "ENGAGE_UPDATE_LIMITS"]);
    expect(state.audit[1]).toMatchObject({ product: "engage", targetUserId: "u1", oldValue: {}, newValue: { "comments.month": "unlimited" }, reason: "Partner" });
  });

  it("'default' removes an override; keys not sent are kept", async () => {
    await controlsRoute(req("PATCH", { limits: { "comments.month": 500, "messages.day": 5 } }), ctx({ userId: "u1" }));
    await controlsRoute(req("PATCH", { limits: { "comments.month": "default" } }), ctx({ userId: "u1" }));
    expect(state.controls.get("u1")?.limits).toEqual({ "messages.day": 5 });
  });

  it("rejects nonsense: negative limits, unknown features, empty changes", async () => {
    for (const body of [{ limits: { "comments.month": -1 } }, { features: { teleport: "on" } }, {}]) {
      expect((await controlsRoute(req("PATCH", body), ctx({ userId: "u1" }))).status).toBe(400);
    }
    expect(state.audit).toHaveLength(0);
  });

  it("404s an unknown user", async () => {
    expect((await controlsRoute(req("PATCH", { freeGenerations: 50 }), ctx({ userId: "nobody" }))).status).toBe(404);
  });
});

describe("free access grants", () => {
  it("grants 30 days with a reason; the audit records who, until when, and why", async () => {
    const res = await userGrantRoute(req("POST", { duration: "30d", reason: "Partnership testing" }), ctx({ userId: "u1" }));
    expect(res.status).toBe(201);
    expect(state.grants[0]).toMatchObject({ userId: "u1", email: "john@example.com", grantedBy: "owner@carouselabs.com", reason: "Partnership testing" });
    expect((state.grants[0].endsAt as Date).getTime() - Date.now()).toBeGreaterThan(29 * 86_400_000);
    expect(state.audit[0]).toMatchObject({ action: "ENGAGE_GRANT_ACCESS", reason: "Partnership testing", targetEmail: "john@example.com" });
  });

  it("requires a reason, and a custom date in the future", async () => {
    expect((await userGrantRoute(req("POST", { duration: "30d", reason: "" }), ctx({ userId: "u1" }))).status).toBe(400);
    expect((await userGrantRoute(req("POST", { duration: "custom", reason: "ok ok" }), ctx({ userId: "u1" }))).status).toBe(400);
    const past = await userGrantRoute(req("POST", { duration: "custom", endsAt: "2020-01-01T00:00:00.000Z", reason: "ok ok" }), ctx({ userId: "u1" }));
    expect(past.status).toBe(400);
    expect(state.grants).toHaveLength(0);
  });

  it("Add user: an email that hasn't signed up gets a waiting grant (and the invitation if asked)", async () => {
    const res = await addUserRoute(req("POST", { email: "New.Person@Example.com", duration: "lifetime", reason: "Investor", sendInvite: true }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ pending: true, inviteSent: true });
    expect(state.grants[0]).toMatchObject({ userId: null, email: "new.person@example.com", endsAt: null });
    expect(state.emails).toEqual(["new.person@example.com"]);
  });

  it("revokes at once, and refuses to revoke twice", async () => {
    await userGrantRoute(req("POST", { duration: "lifetime", reason: "VIP" }), ctx({ userId: "u1" }));
    const res = await grantRoute(req("PATCH", { action: "revoke", reason: "Ended partnership" }), ctx({ grantId: "g1" }));
    expect(res.status).toBe(200);
    expect(state.grants[0]).toMatchObject({ revokedBy: "owner@carouselabs.com", revokeReason: "Ended partnership" });
    expect(grantState(state.grants[0] as never, new Date())).toBe("revoked");
    expect((await grantRoute(req("PATCH", { action: "revoke", reason: "again" }), ctx({ grantId: "g1" }))).status).toBe(400);
  });

  it("extends from the current end date, not from today", async () => {
    await userGrantRoute(req("POST", { duration: "7d", reason: "trial" }), ctx({ userId: "u1" }));
    const end = state.grants[0].endsAt as Date;
    await grantRoute(req("PATCH", { action: "extend", duration: "30d", reason: "more time" }), ctx({ grantId: "g1" }));
    expect((state.grants[0].endsAt as Date).getTime()).toBe(end.getTime() + 30 * 86_400_000);
    expect(state.audit.at(-1)).toMatchObject({ action: "ENGAGE_EXTEND_ACCESS", oldValue: { endsAt: end.toISOString() } });
  });
});

describe("suspension, usage resets, sessions, tags", () => {
  it("pauses with a reason, refuses to pause twice, and won't let you pause yourself", async () => {
    expect((await suspendRoute(req("POST", { suspend: true, reason: "abuse" }), ctx({ userId: "u1" }))).status).toBe(200);
    expect(state.controls.get("u1")?.suspendedAt).toBeInstanceOf(Date);
    expect((await suspendRoute(req("POST", { suspend: true, reason: "abuse" }), ctx({ userId: "u1" }))).status).toBe(400);
    expect((await suspendRoute(req("POST", { suspend: true, reason: "oops" }), ctx({ userId: "admin1" }))).status).toBe(400);
    expect((await suspendRoute(req("POST", { suspend: false, reason: "resolved" }), ctx({ userId: "u1" }))).status).toBe(200);
    expect(state.controls.get("u1")?.suspendedAt).toBeNull();
    expect(state.audit.map((a) => a.action)).toEqual(["ENGAGE_SUSPEND", "ENGAGE_REACTIVATE"]);
  });

  it("gives back every free generation on both extensions, recording how many were used", async () => {
    expect((await resetRoute(req("POST", { scope: "free", reason: "support case" }), ctx({ userId: "u1" }))).status).toBe(200);
    expect(state.users.get("u1")?.extensionTrialUsed).toBe(0);
    expect(state.users.get("u1")?.xTrialUsed).toBe(0);
    expect(state.audit[0]).toMatchObject({
      action: "ENGAGE_RESET_USAGE",
      oldValue: { freeUsed: { linkedin: 7, x: 3 } },
      newValue: { freeUsed: { linkedin: 0, x: 0 } },
    });
  });

  it("signs the extension out of one browser or all", async () => {
    await sessionsRoute(req("POST", { tokenId: "t1", reason: "lost laptop" }), ctx({ userId: "u1" }));
    expect(state.tokens.map((t) => !!t.revokedAt)).toEqual([true, false]);
    const all = await sessionsRoute(req("POST", { reason: "security" }), ctx({ userId: "u1" }));
    expect(await all.json()).toMatchObject({ revoked: 1 });
  });

  it("validates tags", async () => {
    expect((await tagRoute(req("POST", { tag: "VIP" }), ctx({ userId: "u1" }))).status).toBe(201);
    expect((await tagRoute(req("POST", { tag: "<script>" }), ctx({ userId: "u1" }))).status).toBe(400);
    expect((await tagRoute(req("POST", { tag: "x".repeat(40) }), ctx({ userId: "u1" }))).status).toBe(400);
  });
});

describe("grant lengths and overview ranges", () => {
  const from = new Date("2026-01-31T10:00:00.000Z");
  it("months are calendar months, clamped to the month's last day", () => {
    expect(grantEndsAt("3m", from)?.toISOString()).toBe("2026-04-30T10:00:00.000Z");
    expect(grantEndsAt("1y", new Date("2028-02-29T00:00:00.000Z"))?.toISOString()).toBe("2029-02-28T00:00:00.000Z");
    expect(grantEndsAt("7d", from)?.toISOString()).toBe("2026-02-07T10:00:00.000Z");
    expect(grantEndsAt("lifetime", from)).toBeNull();
    expect(() => grantEndsAt("custom", from)).toThrow();
  });

  it("ranges are [from, to) in UTC days", () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    expect(resolveRange("today", null, null, now)).toMatchObject({ from: new Date("2026-10-15T00:00:00Z"), to: new Date("2026-10-16T00:00:00Z") });
    expect(resolveRange("7d", null, null, now)?.from.toISOString()).toBe("2026-10-09T00:00:00.000Z");
    expect(resolveRange("last_month", null, null, now)).toMatchObject({ from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-10-01T00:00:00Z") });
    expect(resolveRange("custom", "2026-10-01", "2026-10-03", now)?.to.toISOString()).toBe("2026-10-04T00:00:00.000Z");
    expect(resolveRange("custom", "2026-10-03", "2026-10-01", now)).toBeNull();
    expect(resolveRange("custom", "2020-01-01", "2026-01-01", now)).toBeNull();
    expect(resolveRange("nonsense", null, null, now)?.key).toBe("30d");
  });
});
