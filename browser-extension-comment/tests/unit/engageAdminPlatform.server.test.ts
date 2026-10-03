// @vitest-environment node
// The Engage admin's split by extension (LinkedIn / X, one plan): which
// extension each user uses and the version of each, the overview's figures
// for one extension (its generations, its errors), and the routes' checks.
// The raw SQL itself runs against real Postgres outside this suite; here the
// database answers with fixed rows.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  groupBys: [] as Array<{ by: string[]; where: Record<string, unknown> }>,
  errorCounts: [] as Array<Record<string, unknown>>,
  raw: [] as Array<{ text: string; values: unknown[] }>,
}));

const T = (iso: string) => new Date(iso);

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(async (sql: { text: string; values: unknown[] }) => {
    state.raw.push({ text: sql.text, values: sql.values });
    if (/SELECT u\.id, count\(\*\) OVER/.test(sql.text)) return [{ id: "both", total: 3n }, { id: "xhist", total: 3n }, { id: "none", total: 3n }];
    if (/count\(\*\) FILTER/.test(sql.text)) return [{ total: 3n, paid: 1n, granted: 0n, suspended: 0n }];
    return [];
  }),
  user: {
    findUnique: vi.fn(async () => ({
      id: "both", email: "both@example.com", createdAt: T("2026-09-01T00:00:00Z"), suspendedAt: null, deletedAt: null,
      profile: null, engageControl: null, extensionSubscription: null,
    })),
    findMany: vi.fn(async () =>
      ["both", "xhist", "none"].map((id) => ({
        id,
        email: `${id}@example.com`,
        createdAt: T("2026-09-01T00:00:00Z"),
        suspendedAt: null,
        extensionTrialUsed: 0,
        profile: null,
        engageControl: null,
        extensionSubscription: null,
        engageGrants: [],
        adminTags: [],
      })),
    ),
  },
  extensionToken: {
    findMany: vi.fn(async () => [
      // Not in date order: last active is the newest, wherever it comes.
      { id: "t-x", userId: "both", device: "X extension · Chrome", lastUsedAt: T("2026-10-02T00:00:00Z") },
      { id: "t-li", userId: "both", device: null, lastUsedAt: T("2026-10-01T00:00:00Z") },
    ]),
  },
  engageClientInfo: {
    // Newest first, as the query orders them.
    findMany: vi.fn(async () => [
      { userId: "both", tokenId: "t-x", extensionVersion: "1.0.0" },
      { userId: "both", tokenId: "t-li", extensionVersion: "1.3.0" },
      { userId: "both", tokenId: "t-li", extensionVersion: "1.2.0" },
    ]),
  },
  commentHistory: {
    groupBy: vi.fn(async (args: { by: string[]; where: Record<string, unknown> }) => {
      state.groupBys.push(args);
      if (args.by.includes("userId")) return [{ userId: "xhist", kind: "x_reply", _count: { _all: 2 } }];
      if (args.by[0] === "kind") return [{ kind: "x_reply", _count: { _all: 4 } }, { kind: "x_message", _count: { _all: 1 } }];
      return [{ action: "INSERTED", _count: { _all: 3 } }];
    }),
    // The user page's last 30 days: a LinkedIn comment and two X replies.
    findMany: vi.fn(async () => [
      { kind: "comment", createdAt: T("2026-10-02T09:00:00Z") },
      { kind: "x_reply", createdAt: T("2026-10-02T10:00:00Z") },
      { kind: "x_reply", createdAt: T("2026-10-03T08:00:00Z") },
    ]),
  },
  engageAccessGrant: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
  adminNote: { findMany: vi.fn(async () => []) },
  adminUserTag: { findMany: vi.fn(async () => []) },
  auditLog: { findMany: vi.fn(async () => []) },
  engageClientError: {
    findMany: vi.fn(async () => []),
    count: vi.fn(async (args: { where: Record<string, unknown> }) => {
      state.errorCounts.push(args.where);
      return 2;
    }),
  },
}));

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/engage/access", () => ({ loadEngageAccess: vi.fn(async () => ({})) }));
vi.mock("../../../lib/engage/usage", () => ({
  readUsage: vi.fn(async () => ({ day: {}, month: {} })),
  periodStart: (period: string, now: Date) =>
    period === "day"
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
}));
vi.mock("../../../lib/engage/adminAccess", () => ({
  requireEngagePermission: vi.fn(async () => ({ ok: true, admin: { id: "admin1", role: "owner" } })),
}));

import { engageOverview, listEngageUsers } from "../../../lib/engage/adminQueries";
import { GET as overviewRoute } from "../../../app/api/admin/engage/overview/route";
import { GET as usersRoute } from "../../../app/api/admin/engage/users/route";
import { tokenPlatform } from "../../../lib/engage/features";
import { engageUserDetail } from "../../../lib/engage/userDetail";

const NOW = T("2026-10-03T12:00:00Z");

beforeEach(() => {
  state.groupBys = [];
  state.errorCounts = [];
  state.raw = [];
});

describe("which extension a user uses", () => {
  it("reads a sign-in's extension from its label, LinkedIn when unlabelled", () => {
    expect(tokenPlatform("X extension · Chrome")).toBe("x");
    expect(tokenPlatform("Chrome on Windows")).toBe("linkedin");
    // A LinkedIn sign-in whose browser name has an X in it is still LinkedIn's.
    expect(tokenPlatform("Chrome on Mac OS X")).toBe("linkedin");
    expect(tokenPlatform(null)).toBe("linkedin");
  });

  it("lists each extension a user uses with its current version", async () => {
    const { rows } = await listEngageUsers({ access: "all", activity: "any", sort: "email", page: 1, pageSize: 50 }, NOW);
    const both = rows.find((r) => r.id === "both")!;
    expect(both.extensions).toEqual(["linkedin", "x"]);
    expect(both).toMatchObject({ extensionVersion: "1.3.0", xExtensionVersion: "1.0.0" });
    expect(both.lastActiveAt).toBe("2026-10-02T00:00:00.000Z");

    // X generations this month and no sign-in left: still an X user, version unknown.
    const xhist = rows.find((r) => r.id === "xhist")!;
    expect(xhist).toMatchObject({ extensions: ["x"], extensionVersion: null, xExtensionVersion: null, lastActiveAt: null });
    expect(xhist.monthByFeature).toEqual({ x_replies: 2 });

    expect(rows.find((r) => r.id === "none")!.extensions).toEqual([]);
  });

  it("filters to X users in the SQL, by X sign-ins or X generations", async () => {
    await listEngageUsers({ access: "all", activity: "any", platform: "x", sort: "email", page: 1, pageSize: 50 }, NOW);
    const idQuery = state.raw.find((q) => /count\(\*\) OVER/.test(q.text))!;
    expect(idQuery.values).toContain("X extension%");
    expect(idQuery.values).toEqual(expect.arrayContaining(["x_reply", "x_message"]));
    expect(idQuery.text).not.toMatch(/device IS NULL/);

    state.raw = [];
    await listEngageUsers({ access: "all", activity: "any", platform: "linkedin", sort: "email", page: 1, pageSize: 50 }, NOW);
    const li = state.raw.find((q) => /count\(\*\) OVER/.test(q.text))!;
    expect(li.text).toMatch(/device IS NULL OR NOT/);
    expect(li.values).toEqual(expect.arrayContaining(["comment", "reply", "connection_note", "message"]));

    state.raw = [];
    await listEngageUsers({ access: "all", activity: "any", sort: "email", page: 1, pageSize: 50 }, NOW);
    expect(state.raw.find((q) => /count\(\*\) OVER/.test(q.text))!.values).not.toContain("X extension%");
  });
});

describe("overview for one extension", () => {
  const range = [T("2026-09-26T00:00:00Z"), T("2026-10-03T00:00:00Z")] as const;

  it("X: only X generations, X errors and first X sign-ins", async () => {
    const o = await engageOverview(range[0], range[1], NOW, "x");
    expect(o.platform).toBe("x");
    const byKind = state.groupBys.find((g) => g.by[0] === "kind")!;
    expect(byKind.where.kind).toEqual({ in: ["x_reply", "x_message"] });
    expect(state.groupBys.find((g) => g.by[0] === "action")!.where.kind).toEqual({ in: ["x_reply", "x_message"] });
    expect(state.errorCounts[0].feature).toEqual({ in: ["x_replies", "x_messages"] });
    expect(o.generations).toMatchObject({ x_replies: 4, x_messages: 1, comments: 0, total: 5 });
    // Plan figures stay the account's.
    expect(o.users).toMatchObject({ total: 3, paid: 1 });
    const firstSignIns = state.raw.filter((q) => /AS first FROM "ExtensionToken" t/.test(q.text));
    expect(firstSignIns.length).toBe(2);
    for (const q of firstSignIns) expect(q.values).toContain("X extension%");
    // Active people, and the daily series, count X generations only.
    const fromHistory = state.raw.filter((q) => /FROM "CommentHistory"\s+WHERE "createdAt"/.test(q.text));
    expect(fromHistory.length).toBe(3);
    for (const q of fromHistory) expect(q.values).toEqual(expect.arrayContaining(["x_reply", "x_message"]));
  });

  it("LinkedIn: everything but X's, errors included", async () => {
    await engageOverview(range[0], range[1], NOW, "linkedin");
    expect(state.groupBys.find((g) => g.by[0] === "kind")!.where.kind).toEqual({
      in: ["comment", "reply", "connection_note", "message"],
    });
    expect(state.errorCounts[0].feature).toEqual({ notIn: ["x_replies", "x_messages"] });
    const firstSignIns = state.raw.filter((r) => /AS first FROM "ExtensionToken" t/.test(r.text));
    expect(firstSignIns.length).toBe(2);
    for (const q of firstSignIns) expect(q.text).toMatch(/device IS NULL OR NOT/);
  });

  it("all: no filter at all", async () => {
    const o = await engageOverview(range[0], range[1], NOW);
    expect(o.platform).toBe("all");
    expect(state.groupBys.find((g) => g.by[0] === "kind")!.where.kind).toBeUndefined();
    expect(state.errorCounts[0].feature).toBeUndefined();
    for (const q of state.raw) expect(q.values).not.toContain("X extension%");
  });
});

describe("admin routes", () => {
  const get = (path: string) => new Request(`https://admin.carouselabs.com${path}`);

  it("overview takes platform=x or linkedin, and refuses anything else", async () => {
    const res = await overviewRoute(get("/api/admin/engage/overview?range=7d&platform=x"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { platform: string }).platform).toBe("x");
    expect((await overviewRoute(get("/api/admin/engage/overview?range=7d&platform=facebook"))).status).toBe(400);
    expect(((await (await overviewRoute(get("/api/admin/engage/overview?range=7d"))).json()) as { platform: string }).platform).toBe("all");
  });

  it("users takes platform=x, and refuses anything else", async () => {
    expect((await usersRoute(get("/api/admin/engage/users?platform=x"))).status).toBe(200);
    expect(state.raw.find((q) => /count\(\*\) OVER/.test(q.text))!.values).toContain("X extension%");
    expect((await usersRoute(get("/api/admin/engage/users?platform=facebook"))).status).toBe(400);
  });
});

describe("a user's page", () => {
  it("counts X generations per day next to LinkedIn's, never as NaN", async () => {
    const detail = (await engageUserDetail("both", NOW))!;
    const day = (date: string) => detail.usage.series.find((p) => p.date === date)!;
    expect(detail.usage.series).toHaveLength(30);
    expect(day("2026-10-02")).toMatchObject({ comments: 1, x_replies: 1, x_messages: 0 });
    expect(day("2026-10-03")).toMatchObject({ x_replies: 1 });
    for (const p of detail.usage.series) {
      for (const [k, v] of Object.entries(p)) if (k !== "date") expect(Number.isFinite(v)).toBe(true);
    }
  });
});
