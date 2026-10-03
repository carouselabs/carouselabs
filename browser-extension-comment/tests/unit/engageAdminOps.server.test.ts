// @vitest-environment node
// Engage admin phase D (operations): bulk actions on selected users, CSV
// downloads (and that a spreadsheet never runs a cell as a formula), the
// Errors page's figures, the Health checks, and the Sessions list with
// signing one browser out. Who may call each route, validation, and the
// audit trail every change and every download leaves.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

type Token = { id: string; userId: string; device: string | null; createdAt: Date; lastUsedAt: Date; revokedAt: Date | null; user: { email: string } };

const state = vi.hoisted(() => ({
  admin: { id: "admin1", email: "owner@carouselabs.com" } as null | { id: string; email: string },
  users: [] as Array<{ id: string; email: string; deletedAt: Date | null }>,
  controls: new Map<string, { suspendedAt: Date | null }>(),
  tags: new Set<string>(),
  grants: [] as Array<Record<string, unknown>>,
  audit: [] as Array<Record<string, unknown>>,
  emails: [] as string[],
  tokens: [] as Token[],
  clientInfo: [] as Array<{ tokenId: string; extensionVersion: string }>,
  clientInfoError: null as unknown,
  clientErrors: [] as Array<Record<string, unknown>>,
  clientErrorsError: null as unknown,
  // Raw SQL: the answer for each query, picked by what it reads.
  sql: {} as Record<string, unknown>,
  sqlLog: [] as string[],
  settings: [] as Array<{ key: string; value: unknown; updatedAt: Date; updatedBy: string | null }>,
  listUsers: vi.fn(),
  aiCostByUser: vi.fn(),
}));

// Which raw query this is, by the tables and clauses it uses.
function sqlKey(text: string): string {
  if (/^\s*SELECT 1\s*$/.test(text)) return "ping";
  if (text.includes("to_regclass")) return "tables";
  const table = text.includes('"EngageClientError"') ? "ext" : text.includes('"EngageAiCall"') ? "ai" : text.includes('"CommentHistory"') ? "history" : "other";
  if (text.includes("SELECT DISTINCT")) return `${table}:users`;
  if (text.includes("to_char")) return `${table}:days`;
  if (text.includes('LEFT JOIN "User"')) return `${table}:recent`;
  if (text.includes("GROUP BY model")) return `${table}:models`;
  if (text.includes("GROUP BY")) return `${table}:groups`;
  if (text.includes("count(*) AS count")) return `${table}:count`;
  return table;
}

// A Prisma "table does not exist" error, as the real client throws it.
const missing = (table: string) => new Prisma.PrismaClientKnownRequestError(`The table \`${table}\` does not exist`, { code: "P2021", clientVersion: "test" });

// The subset of ExtensionToken filters listSessions builds.
type Where = Record<string, unknown>;
function tokenMatches(t: Token, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "AND") return (cond as Where[]).every((w) => tokenMatches(t, w));
    if (key === "OR") return (cond as Where[]).some((w) => tokenMatches(t, w));
    // As in SQL: NOT (device LIKE …) is not true for a browser with no label.
    if (key === "NOT") return "device" in (cond as Where) && t.device === null ? false : !tokenMatches(t, cond as Where);
    if (key === "revokedAt") return cond === null ? t.revokedAt === null : t.revokedAt !== null;
    if (key === "device") {
      if (cond === null) return t.device === null;
      return t.device !== null && t.device.startsWith((cond as { startsWith: string }).startsWith);
    }
    if (key === "user") {
      const { contains } = (cond as { email: { contains: string } }).email;
      return t.user.email.toLowerCase().includes(contains.toLowerCase());
    }
    if (key === "id") return t.id === cond;
    throw new Error(`unexpected filter ${key}`);
  });
}

const db = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] }; deletedAt?: null } }) =>
      state.users
        .filter((u) => where.id.in.includes(u.id) && (!("deletedAt" in where) || u.deletedAt === null))
        .map(({ id, email }) => ({ id, email }))),
    findFirst: vi.fn(async ({ where }: { where: { email: { equals: string } } }) =>
      state.users.find((u) => u.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null),
  },
  engageUserControl: {
    findUnique: vi.fn(async ({ where }: { where: { userId: string } }) => state.controls.get(where.userId) ?? null),
    upsert: vi.fn(async ({ where, create, update }: { where: { userId: string }; create: { suspendedAt: Date | null }; update: { suspendedAt: Date | null } }) => {
      const next = { suspendedAt: (state.controls.has(where.userId) ? update : create).suspendedAt };
      state.controls.set(where.userId, next);
      return next;
    }),
  },
  adminUserTag: {
    createMany: vi.fn(async ({ data, skipDuplicates }: { data: Array<{ userId: string; tag: string }>; skipDuplicates: boolean }) => {
      let count = 0;
      for (const d of data) {
        const key = `${d.userId}:${d.tag}`;
        if (state.tags.has(key)) {
          if (!skipDuplicates) throw new Error("duplicate");
          continue;
        }
        state.tags.add(key);
        count += 1;
      }
      return { count };
    }),
  },
  engageAccessGrant: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const g = { id: `g${state.grants.length + 1}`, ...data };
      state.grants.push(g);
      return g;
    }),
  },
  extensionToken: {
    findMany: vi.fn(async ({ where, skip, take }: { where: Where; skip: number; take: number }) =>
      state.tokens
        .filter((t) => tokenMatches(t, where))
        .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
        .slice(skip, skip + take)),
    count: vi.fn(async ({ where }: { where: Where }) => state.tokens.filter((t) => tokenMatches(t, where)).length),
    // A copy, as Prisma returns: a later update doesn't change what was read.
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      const t = state.tokens.find((x) => x.id === where.id);
      return t ? { ...t, user: { ...t.user } } : null;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Where; data: { revokedAt: Date } }) => {
      const hit = state.tokens.filter((t) => tokenMatches(t, where));
      for (const t of hit) t.revokedAt = data.revokedAt;
      return { count: hit.length };
    }),
  },
  engageClientInfo: {
    findMany: vi.fn(async ({ where }: { where: { tokenId: { in: string[] } } }) => {
      if (state.clientInfoError) throw state.clientInfoError;
      return state.clientInfo.filter((c) => where.tokenId.in.includes(c.tokenId));
    }),
  },
  engageClientError: {
    findMany: vi.fn(async ({ where }: { where: { feature?: { in?: string[]; notIn?: string[] } } }) => {
      if (state.clientErrorsError) throw state.clientErrorsError;
      return state.clientErrors.filter((e) => {
        const f = String(e.feature);
        if (where.feature?.in) return where.feature.in.includes(f);
        if (where.feature?.notIn) return !where.feature.notIn.includes(f);
        return true;
      });
    }),
  },
  auditLog: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      state.audit.push(data);
      return { id: "a" };
    }),
    findMany: vi.fn(async () => [
      { createdAt: new Date("2026-10-02T10:00:00Z"), adminEmail: "owner@carouselabs.com", action: "ENGAGE_SUSPEND", targetEmail: "=HYPERLINK(\"x\")", details: "Paused, \"politely\"", reason: "spam\nreports", oldValue: { suspended: false }, newValue: null },
    ]),
  },
  engageSetting: { findMany: vi.fn(async () => state.settings) },
  $queryRaw: vi.fn(async (query: Prisma.Sql) => {
    const key = sqlKey(query.sql);
    state.sqlLog.push(key);
    const answer = key in state.sql ? state.sql[key] : state.sql[key.split(":")[0]];
    if (answer instanceof Error) throw answer;
    if (typeof answer === "function") return (answer as (q: Prisma.Sql) => unknown)(query);
    return answer ?? [];
  }),
}));

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/adminAuth", () => ({ getAdminUser: vi.fn(async () => state.admin) }));
vi.mock("../../../lib/email", () => ({
  sendEngageAccessGrantedEmail: vi.fn(async (email: string) => {
    state.emails.push(email);
  }),
}));
vi.mock("../../../lib/engage/adminQueries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/engage/adminQueries")>()),
  listEngageUsers: state.listUsers,
}));
vi.mock("../../../lib/engage/aiQueries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/engage/aiQueries")>()),
  aiCostByUser: state.aiCostByUser,
}));

import { POST as bulkRoute } from "../../../app/api/admin/engage/users/bulk/route";
import { GET as exportRoute } from "../../../app/api/admin/engage/export/route";
import { GET as errorsRoute } from "../../../app/api/admin/engage/errors/route";
import { GET as healthRoute } from "../../../app/api/admin/engage/health/route";
import { GET as sessionsRoute } from "../../../app/api/admin/engage/sessions/route";
import { DELETE as revokeRoute } from "../../../app/api/admin/engage/sessions/[tokenId]/route";
import { csvCell, csvResponse, toCsv } from "../../../lib/engage/csv";
import { engageErrors } from "../../../lib/engage/errorQueries";
import { aiStatus, dbStatus, engageHealth, overallStatus } from "../../../lib/engage/health";
import { listSessions } from "../../../lib/engage/sessionQueries";
import { clearGlobalSettingsCache } from "../../../lib/engage/settings";

const ORIGIN = "https://admin.carouselabs.com";
const send = (method: string, path: string, body?: unknown, origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const get = (path: string) => new Request(`${ORIGIN}${path}`);
const bulk = (body: unknown, origin?: string | null) => bulkRoute(send("POST", "/api/admin/engage/users/bulk", body, origin));
const revoke = (tokenId: string, body: unknown, origin?: string | null) =>
  revokeRoute(send("DELETE", `/api/admin/engage/sessions/${tokenId}`, body, origin), { params: Promise.resolve({ tokenId }) });
const at = (iso: string) => new Date(iso);

beforeEach(() => {
  state.admin = { id: "admin1", email: "owner@carouselabs.com" };
  state.users = [
    { id: "u1", email: "ana@example.com", deletedAt: null },
    { id: "u2", email: "ben@example.com", deletedAt: null },
    { id: "u3", email: "cy@example.com", deletedAt: null },
    { id: "gone", email: "gone@example.com", deletedAt: at("2026-09-01T00:00:00Z") },
    { id: "admin1", email: "owner@carouselabs.com", deletedAt: null },
  ];
  state.controls = new Map();
  state.tags = new Set();
  state.grants = [];
  state.audit = [];
  state.emails = [];
  state.tokens = [
    { id: "t1", userId: "u1", device: "Chrome on Windows", createdAt: at("2026-09-01T00:00:00Z"), lastUsedAt: at("2026-10-03T08:00:00Z"), revokedAt: null, user: { email: "ana@example.com" } },
    { id: "t2", userId: "u1", device: "X extension · Chrome on Windows", createdAt: at("2026-09-20T00:00:00Z"), lastUsedAt: at("2026-10-03T09:00:00Z"), revokedAt: null, user: { email: "ana@example.com" } },
    { id: "t3", userId: "u2", device: null, createdAt: at("2026-08-01T00:00:00Z"), lastUsedAt: at("2026-09-01T00:00:00Z"), revokedAt: at("2026-09-02T00:00:00Z"), user: { email: "ben@example.com" } },
    { id: "t4", userId: "u3", device: "X extension · Edge on Mac", createdAt: at("2026-09-25T00:00:00Z"), lastUsedAt: at("2026-10-01T00:00:00Z"), revokedAt: null, user: { email: "cy@example.com" } },
  ];
  state.clientInfo = [
    { tokenId: "t1", extensionVersion: "1.3.0" },
    { tokenId: "t2", extensionVersion: "1.0.0" },
  ];
  state.clientInfoError = null;
  state.clientErrors = [];
  state.clientErrorsError = null;
  state.sql = {};
  state.sqlLog = [];
  state.settings = [];
  state.listUsers.mockReset();
  state.aiCostByUser.mockReset();
  clearGlobalSettingsCache();
  vi.unstubAllEnvs();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ── CSV ────────────────────────────────────────────────────────────────

describe("CSV", () => {
  it("a cell that would run as a formula is written as text", () => {
    for (const s of ["=1+1", "+44 20", "-cmd", "@SUM(A1)", "\tx", "\rx"]) expect(csvCell(s)).toMatch(/^"?'/);
    expect(csvCell("ana@example.com")).toBe("ana@example.com");
    expect(csvCell("a=b")).toBe("a=b");
  });

  it("numbers stay numbers (a negative one too); empty for nothing", () => {
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell(0)).toBe("0");
    expect(csvCell(1.5)).toBe("1.5");
    expect(csvCell(Number.NaN)).toBe("");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes and line breaks; dates are ISO", () => {
    expect(csvCell('say "hi", bye')).toBe('"say ""hi"", bye"');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell(at("2026-10-03T10:00:00Z"))).toBe("2026-10-03T10:00:00.000Z");
    expect(toCsv(["A", "B"], [[1, "x,y"], [null, "=z"]])).toBe('A,B\r\n1,"x,y"\r\n,\'=z\r\n');
  });

  it("downloads as a UTF-8 file Excel opens, never cached, with a safe file name", async () => {
    const res = csvResponse('engage "users"/2026.csv', "A\r\n");
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="engage__users__2026.csv"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
});

// ── Bulk actions ───────────────────────────────────────────────────────

describe("bulk actions", () => {
  it("only an admin, only from the admin's own pages, and a bad request tells a non-admin nothing", async () => {
    state.admin = null;
    expect((await bulk({ action: "suspend", userIds: ["u1"], reason: "spam" })).status).toBe(403);
    expect((await bulk({ action: "nonsense" })).status).toBe(403);
    state.admin = { id: "admin1", email: "owner@carouselabs.com" };
    expect((await bulk({ action: "suspend", userIds: ["u1"], reason: "spam" }, "https://evil.example")).status).toBe(403);
    expect((await bulk({ action: "suspend", userIds: ["u1"], reason: "spam" }, null)).status).toBe(403);
    expect(state.controls.size).toBe(0);
    expect(state.audit).toHaveLength(0);
  });

  it("validates: a reason, at least one and at most 100 users, a known action, a clean tag", async () => {
    const cases: Array<[unknown, RegExp]> = [
      [{ action: "suspend", userIds: ["u1"] }, /reason/],
      [{ action: "suspend", userIds: ["u1"], reason: "  " }, /Say why/],
      [{ action: "suspend", userIds: [], reason: "spam" }, /at least one/],
      [{ action: "suspend", userIds: Array.from({ length: 101 }, (_, i) => `u${i}`), reason: "spam" }, /At most 100/],
      [{ action: "delete", userIds: ["u1"], reason: "spam" }, /action/],
      [{ action: "tag", userIds: ["u1"], tag: "<b>vip</b>" }, /Letters, numbers/],
      [{ action: "grant", userIds: ["u1"], reason: "beta", duration: "forever" }, /duration/],
    ];
    for (const [body, error] of cases) {
      const res = await bulk(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error).toMatch(error);
    }
    expect((await bulk({ action: "suspend", userIds: Array.from({ length: 100 }, (_, i) => `n${i}`), reason: "spam" })).status).toBe(200);
  });

  it("pauses each user once, audited per user as bulk; skips those already paused, yourself, and unknown or deleted users", async () => {
    state.controls.set("u2", { suspendedAt: at("2026-09-30T00:00:00Z") });
    const res = await bulk({ action: "suspend", userIds: ["u1", "u2", "u1", "admin1", "nobody", "gone", "u3"], reason: "Spam reports" });
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.done).toBe(2);
    expect(out.skipped).toEqual([
      { userId: "u2", why: "Already paused" },
      { userId: "admin1", why: "You can't pause your own access" },
      { userId: "nobody", why: "User not found" },
      { userId: "gone", why: "User not found" },
    ]);
    expect(state.controls.get("u1")?.suspendedAt).toBeInstanceOf(Date);
    expect(state.controls.get("u3")?.suspendedAt).toBeInstanceOf(Date);
    expect(state.controls.has("admin1")).toBe(false);
    expect(state.audit.map((a) => [a.action, a.targetEmail, a.details, a.reason])).toEqual([
      ["ENGAGE_SUSPEND", "ana@example.com", "Paused Engage access (bulk)", "Spam reports"],
      ["ENGAGE_SUSPEND", "cy@example.com", "Paused Engage access (bulk)", "Spam reports"],
    ]);
  });

  it("resumes only users who are paused", async () => {
    state.controls.set("u1", { suspendedAt: at("2026-09-30T00:00:00Z") });
    const out = await (await bulk({ action: "resume", userIds: ["u1", "u2"], reason: "Sorted out" })).json();
    expect(out).toEqual({ done: 1, skipped: [{ userId: "u2", why: "Not paused" }] });
    expect(state.controls.get("u1")?.suspendedAt).toBeNull();
    expect(state.audit).toEqual([expect.objectContaining({ action: "ENGAGE_REACTIVATE", targetUserId: "u1", details: "Resumed Engage access (bulk)", oldValue: { suspended: true }, newValue: { suspended: false } })]);
  });

  it("tags each user once; someone who already has the tag is skipped and not audited again", async () => {
    state.tags.add("u2:Beta tester");
    const out = await (await bulk({ action: "tag", userIds: ["u1", "u2"], tag: "  Beta tester " })).json();
    expect(out).toEqual({ done: 1, skipped: [{ userId: "u2", why: "Already tagged" }] });
    expect(state.tags.has("u1:Beta tester")).toBe(true);
    expect(state.audit).toEqual([expect.objectContaining({ action: "ENGAGE_ADD_TAG", targetUserId: "u1", details: 'Tagged "Beta tester" (bulk)' })]);
  });

  it("gives each user free access with the reason marked bulk, and sends no invitation emails", async () => {
    const out = await (await bulk({ action: "grant", userIds: ["u1", "u3"], reason: "Beta group", duration: "30d" })).json();
    expect(out).toEqual({ done: 2, skipped: [] });
    expect(state.grants.map((g) => [g.userId, g.reason, g.grantedBy])).toEqual([
      ["u1", "Beta group (bulk)", "owner@carouselabs.com"],
      ["u3", "Beta group (bulk)", "owner@carouselabs.com"],
    ]);
    expect((state.grants[0].endsAt as Date).getTime()).toBeGreaterThan(Date.now());
    expect(state.emails).toEqual([]);
    expect(state.audit.map((a) => a.action)).toEqual(["ENGAGE_GRANT_ACCESS", "ENGAGE_GRANT_ACCESS"]);
  });

  it("one user failing doesn't stop the rest; the failure is reported for that user", async () => {
    db.engageUserControl.upsert.mockImplementationOnce(async () => {
      throw new Error("Database hiccup");
    });
    const out = await (await bulk({ action: "suspend", userIds: ["u1", "u3"], reason: "Spam reports" })).json();
    expect(out).toEqual({ done: 1, skipped: [{ userId: "u1", why: "Database hiccup" }] });
    expect(state.controls.get("u3")?.suspendedAt).toBeInstanceOf(Date);
  });
});

// ── Exports ────────────────────────────────────────────────────────────

const userRow = (over: Record<string, unknown> = {}) => ({
  id: "u1",
  email: "ana@example.com",
  name: "Ana",
  createdAt: "2026-09-01T00:00:00.000Z",
  lastActiveAt: "2026-10-03T08:00:00.000Z",
  access: "paid",
  status: "active",
  subscriptionStatus: "active",
  grantEndsAt: null,
  grantLifetime: false,
  freeUsed: 3,
  freeLimit: 10,
  hasOverrides: false,
  monthByFeature: { comments: 12, x_replies: 4 },
  monthTotal: 16,
  extensionVersion: "1.3.0",
  xExtensionVersion: "1.0.0",
  extensions: ["linkedin", "x"],
  tags: ["VIP", "Beta"],
  ...over,
});

async function csvLines(res: Response): Promise<string[]> {
  const text = await res.text();
  return text.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
}

describe("CSV downloads", () => {
  it("only an admin may download; an unknown export is refused", async () => {
    state.admin = null;
    expect((await exportRoute(get("/api/admin/engage/export?type=users"))).status).toBe(403);
    expect(state.listUsers).not.toHaveBeenCalled();
    state.admin = { id: "admin1", email: "owner@carouselabs.com" };
    expect((await exportRoute(get("/api/admin/engage/export?type=passwords"))).status).toBe(400);
    expect((await exportRoute(get("/api/admin/engage/export?type=users&sort=hacked"))).status).toBe(400);
    expect((await exportRoute(get("/api/admin/engage/export?type=errors&platform=tiktok"))).status).toBe(400);
    expect(state.audit).toHaveLength(0);
  });

  it("users: the table's filters, every page, one row per user, and the download is audited", async () => {
    state.listUsers.mockImplementation(async ({ page }: { page: number }) => ({
      rows: page === 1 ? Array.from({ length: 100 }, (_, i) => userRow({ id: `p1-${i}` })) : [userRow({ id: "last", email: "=cmd|calc", tags: [] })],
      total: 101,
    }));
    const res = await exportRoute(get("/api/admin/engage/export?type=users&access=paid&platform=x&q=ana&sort=email&page=3"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="engage-users-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(state.listUsers).toHaveBeenCalledTimes(2);
    expect(state.listUsers.mock.calls[0][0]).toMatchObject({ access: "paid", platform: "x", q: "ana", sort: "email", activity: "any", page: 1, pageSize: 100 });
    const lines = await csvLines(res);
    expect(lines).toHaveLength(102);
    expect(lines[0]).toContain("User ID,Email,Name,Access,Status,Extensions,LinkedIn version,X version,Generated this month");
    expect(lines[1]).toContain("p1-0,ana@example.com,Ana,paid,active,linkedin x,1.3.0,1.0.0,16");
    expect(lines[1]).toContain("VIP; Beta");
    expect(lines[101]).toContain("last,'=cmd|calc,");
    expect(state.audit).toEqual([
      expect.objectContaining({ action: "ENGAGE_EXPORT", product: "engage", details: "Downloaded Engage users (101 rows)", newValue: expect.objectContaining({ type: "users", rows: 101 }) }),
    ]);
  });

  it("audit log: newest first, formulas defused, line breaks kept inside the cell", async () => {
    const res = await exportRoute(get("/api/admin/engage/export?type=audit&q=ana"));
    expect(db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { product: "engage", targetEmail: { contains: "ana", mode: "insensitive" } }, orderBy: { createdAt: "desc" } }));
    const text = (await res.text()).replace(/^\uFEFF/, "");
    expect(text).toContain("When,Admin,Action,User,What,Reason,Before,After\r\n");
    expect(text).toContain(`'=HYPERLINK(""x"")`);
    expect(text).toContain('"spam\nreports"');
    expect(text).toContain('"{""suspended"":false}"');
    expect(state.audit.at(-1)).toMatchObject({ action: "ENGAGE_EXPORT", details: "Downloaded the Engage audit log (1 row)" });
  });

  it("AI cost per user: for the range and extension, at the saved prices", async () => {
    state.aiCostByUser.mockResolvedValue([{ userId: "u1", email: "ana@example.com", calls: 40, inputTokens: 12000, outputTokens: 3000, cost: 0.0271234 }]);
    const res = await exportRoute(get("/api/admin/engage/export?type=ai-users&range=7d&platform=linkedin"));
    const [, , platform, prices, limit] = state.aiCostByUser.mock.calls[0];
    expect(platform).toBe("linkedin");
    expect(prices).toBeTypeOf("object");
    expect(limit).toBe(10_000);
    expect(res.headers.get("content-disposition")).toMatch(/engage-ai-cost-7d-/);
    expect(await csvLines(res)).toEqual(["User ID,Email,AI calls,Tokens in,Tokens out,Cost ($)", "u1,ana@example.com,40,12000,3000,0.0271"]);
  });

  it("errors: only the chosen extension's; before the SQL is run, an empty file; any other failure is an error", async () => {
    state.clientErrors = [
      { createdAt: at("2026-10-02T00:00:00Z"), feature: "comments", code: "insert.box_not_found", message: "Insert couldn't find LinkedIn's text box.", extensionVersion: "1.3.0", user: { email: "ana@example.com" } },
      { createdAt: at("2026-10-02T01:00:00Z"), feature: "x_replies", code: "tab_timeout", message: "The tab didn't answer.", extensionVersion: "1.0.0", user: null },
    ];
    const x = await csvLines(await exportRoute(get("/api/admin/engage/export?type=errors&range=7d&platform=x")));
    expect(x).toEqual(["When,User,Feature,Code,Message,Version", "2026-10-02T01:00:00.000Z,,x_replies,tab_timeout,The tab didn't answer.,1.0.0"]);
    const li = await csvLines(await exportRoute(get("/api/admin/engage/export?type=errors&range=7d&platform=linkedin")));
    expect(li).toHaveLength(2);
    expect(li[1]).toContain("insert.box_not_found");

    state.clientErrorsError = missing("EngageClientError");
    expect(await csvLines(await exportRoute(get("/api/admin/engage/export?type=errors&range=7d")))).toEqual(["When,User,Feature,Code,Message,Version"]);
    state.clientErrorsError = new Error("connection reset");
    await expect(exportRoute(get("/api/admin/engage/export?type=errors&range=7d"))).rejects.toThrow("connection reset");
  });
});

// ── Errors ─────────────────────────────────────────────────────────────

const FROM = at("2026-09-30T00:00:00Z");
const TO = at("2026-10-03T00:00:00Z");

function errorsSql() {
  state.sql = {
    "ext:groups": [
      { feature: "comments", code: "insert.box_not_found", message: "Insert couldn't find LinkedIn's text box.", count: 7n, people: 3n, versions: ["1.9.0", "1.10.0", "1.3.0"], lastAt: at("2026-10-02T12:00:00Z") },
      { feature: "x_replies", code: "tab_timeout", message: "The tab didn't answer.", count: 2n, people: 2n, versions: null, lastAt: "2026-10-01T09:00:00Z" },
    ],
    "ext:recent": [{ id: "e1", at: at("2026-10-02T12:00:00Z"), userId: "u1", email: "ana@example.com", feature: "comments", what: "insert.box_not_found", version: "1.3.0" }],
    "ext:days": [{ day: "2026-09-30", count: 4n }, { day: "2026-10-02", count: 5n }, { day: "2026-08-01", count: 99n }],
    "ext:users": [{ userId: "u1" }, { userId: "u2" }],
    "ai:groups": [{ feature: "replies", model: "gpt-6-luna", outcome: "timeout", count: 3n, people: 2n, lastAt: at("2026-10-02T11:00:00Z") }],
    "ai:recent": [
      { id: "c1", at: at("2026-10-02T11:00:00Z"), userId: "u2", email: "ben@example.com", feature: "replies", model: "gpt-6-luna", outcome: "timeout", version: null },
      { id: "c2", at: at("2026-10-02T10:00:00Z"), userId: null, email: null, feature: "comments", model: "claude-haiku-4-5-20251001", outcome: "error", version: null },
    ],
    "ai:days": [{ day: "2026-10-02", count: 3n }],
    "ai:users": [{ userId: "u2" }, { userId: "u3" }],
  };
}

describe("errors", () => {
  it("groups extension errors and AI failures, versions in version order, a day for every day in the range", async () => {
    errorsSql();
    const e = await engageErrors(FROM, TO, "all");
    expect(e.extension.recording).toBe(true);
    expect(e.extension.groups[0]).toEqual({
      feature: "comments",
      code: "insert.box_not_found",
      message: "Insert couldn't find LinkedIn's text box.",
      count: 7,
      people: 3,
      versions: ["1.3.0", "1.9.0", "1.10.0"],
      lastAt: "2026-10-02T12:00:00.000Z",
    });
    expect(e.extension.groups[1].versions).toEqual([]);
    expect(e.series).toEqual([
      { date: "2026-09-30", extension: 4, ai: 0 },
      { date: "2026-10-01", extension: 0, ai: 0 },
      { date: "2026-10-02", extension: 5, ai: 3 },
    ]);
    expect(e.extension.total).toBe(9);
    expect(e.ai.total).toBe(3);
    expect(e.ai.groups).toEqual([{ feature: "replies", model: "gpt-6-luna", outcome: "timeout", count: 3, people: 2, lastAt: "2026-10-02T11:00:00.000Z" }]);
    // Someone hit by both kinds counts once.
    expect(e.people).toBe(3);
  });

  it("the latest failures say who, and name the AI model in words", async () => {
    errorsSql();
    const e = await engageErrors(FROM, TO, "all");
    expect(e.extension.recent).toEqual([{ id: "e1", at: "2026-10-02T12:00:00.000Z", userId: "u1", email: "ana@example.com", feature: "comments", what: "insert.box_not_found", version: "1.3.0" }]);
    expect(e.ai.recent.map((r) => [r.userId, r.what])).toEqual([
      ["u2", "GPT Luna timed out"],
      [null, "Claude Haiku 4.5 failed"],
    ]);
  });

  it("filters by extension through the feature, and only counts AI calls that failed", async () => {
    const seen: Array<{ text: string; values: unknown[] }> = [];
    state.sql = { ext: (q: Prisma.Sql) => (seen.push({ text: q.sql, values: q.values }), []), ai: (q: Prisma.Sql) => (seen.push({ text: q.sql, values: q.values }), []) };
    await engageErrors(FROM, TO, "x");
    expect(seen).toHaveLength(8);
    for (const q of seen) {
      expect(q.text).toMatch(/feature IN \(/);
      expect(q.values).toEqual(expect.arrayContaining(["x_replies", "x_messages"]));
    }
    expect(seen.filter((q) => q.text.includes('"EngageAiCall"')).every((q) => q.text.includes("c.outcome IN ('error', 'timeout')"))).toBe(true);
    seen.length = 0;
    await engageErrors(FROM, TO, "linkedin");
    expect(seen.every((q) => /feature NOT IN \(/.test(q.text))).toBe(true);
    seen.length = 0;
    await engageErrors(FROM, TO, "all");
    expect(seen.some((q) => /feature (NOT )?IN \(/.test(q.text))).toBe(false);
  });

  it("before the AI usage SQL is run, AI failures say so and extension errors still show; other failures aren't hidden", async () => {
    errorsSql();
    state.sql.ai = new Error('relation "EngageAiCall" does not exist');
    for (const k of ["ai:groups", "ai:recent", "ai:days", "ai:users"]) delete state.sql[k];
    const e = await engageErrors(FROM, TO, "all");
    expect(e.ai).toEqual({ recording: false, total: 0, groups: [], recent: [] });
    expect(e.extension.groups).toHaveLength(2);
    expect(e.people).toBe(2);

    state.sql.ai = missing("EngageAiCall");
    expect((await engageErrors(FROM, TO, "all")).ai.recording).toBe(false);
    state.sql.ext = new Error("connection reset");
    for (const k of ["ext:groups", "ext:recent", "ext:days", "ext:users"]) delete state.sql[k];
    await expect(engageErrors(FROM, TO, "all")).rejects.toThrow("connection reset");
  });

  it("the route: admins only, a valid range and extension", async () => {
    errorsSql();
    state.admin = null;
    expect((await errorsRoute(get("/api/admin/engage/errors?range=7d"))).status).toBe(403);
    state.admin = { id: "admin1", email: "owner@carouselabs.com" };
    expect((await errorsRoute(get("/api/admin/engage/errors?range=custom&from=2026-10-05&to=2026-10-01"))).status).toBe(400);
    expect((await errorsRoute(get("/api/admin/engage/errors?range=7d&platform=tiktok"))).status).toBe(400);
    const ok = await errorsRoute(get("/api/admin/engage/errors?range=7d&platform=x"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ rangeKey: "7d", extension: { recording: true }, ai: { recording: true } });
  });
});

// ── Health ─────────────────────────────────────────────────────────────

function healthySql() {
  state.sql = {
    ping: [{ "?column?": 1 }],
    tables: [
      { name: "EngageUserControl", present: true },
      { name: "EngageSetting", present: true },
      { name: "EngageAiCall", present: true },
      { name: "XProfile", present: true },
    ],
    "ai:models": [{ model: "gpt-6-luna", calls: 20n, failed: 1n, avgMs: 2400 }],
    "history:count": [{ count: 14n }],
    "ext:count": [{ count: 2n }],
  };
}

const check = (h: { checks: Array<{ id: string }> }, id: string) => h.checks.find((c) => c.id === id);

describe("health", () => {
  it("thresholds: AI failing over a fifth needs a look, over half is a problem; a slow database too", () => {
    expect(aiStatus(0, 0)).toBe("idle");
    expect(aiStatus(10, 2)).toBe("ok");
    expect(aiStatus(10, 3)).toBe("warn");
    expect(aiStatus(10, 5)).toBe("warn");
    expect(aiStatus(10, 6)).toBe("bad");
    expect(dbStatus(299)).toBe("ok");
    expect(dbStatus(300)).toBe("warn");
    expect(dbStatus(999)).toBe("warn");
    expect(dbStatus(1000)).toBe("bad");
    const c = (status: "ok" | "warn" | "bad" | "idle") => ({ id: status, label: "", detail: "", status });
    expect(overallStatus([c("ok"), c("idle")])).toBe("ok");
    expect(overallStatus([c("ok"), c("warn"), c("idle")])).toBe("warn");
    expect(overallStatus([c("warn"), c("bad")])).toBe("bad");
  });

  it("all well: every setup step done, both keys set, the models' last hour, activity, Controls all on", async () => {
    healthySql();
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    const h = await engageHealth(at("2026-10-03T12:00:00Z"));
    expect(h.overall).toBe("ok");
    expect(h.checkedAt).toBe("2026-10-03T12:00:00.000Z");
    expect(h.checks.filter((c) => c.id.startsWith("setup:")).every((c) => c.status === "ok" && c.detail === "Done")).toBe(true);
    expect(check(h, "key:openai")).toMatchObject({ status: "ok", detail: "Set" });
    expect(check(h, "ai:luna")).toMatchObject({ status: "ok", label: "GPT Luna, last hour", detail: "20 calls, 1 failed, 2.4s on average" });
    expect(check(h, "ai:haiku")).toMatchObject({ status: "idle", detail: "No calls" });
    expect(check(h, "generations")).toMatchObject({ status: "ok", detail: "14" });
    expect(check(h, "extension-errors")).toMatchObject({ status: "ok", detail: "2" });
    expect(check(h, "controls")).toMatchObject({ status: "ok", detail: "Everything on" });
  });

  it("never shows a key, only whether it is set", async () => {
    healthySql();
    vi.stubEnv("OPENAI_API_KEY", "sk-secret-value-123");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const h = await engageHealth();
    expect(JSON.stringify(h)).not.toContain("sk-secret-value-123");
    expect(check(h, "key:anthropic")).toMatchObject({ status: "bad", detail: "Missing on the server" });
    expect(h.overall).toBe("bad");
  });

  it("names the SQL still to run, skips what needs a missing table, and shows what's switched off", async () => {
    healthySql();
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    state.sql.tables = [
      { name: "EngageUserControl", present: true },
      { name: "EngageSetting", present: true },
      { name: "EngageAiCall", present: false },
      { name: "XProfile", present: true },
    ];
    state.settings = [
      { key: "features", value: { x_replies: { enabled: false, message: null } }, updatedAt: new Date(), updatedBy: "owner@carouselabs.com" },
      { key: "minVersion", value: { linkedin: "1.3.0", x: null }, updatedAt: new Date(), updatedBy: "owner@carouselabs.com" },
    ];
    const h = await engageHealth();
    expect(check(h, "setup:EngageAiCall")).toMatchObject({ status: "warn", detail: "Run scripts/engage-admin-phase-c.sql in Supabase" });
    expect(check(h, "ai:luna")).toBeUndefined();
    expect(state.sqlLog).not.toContain("ai:models");
    expect(check(h, "controls")).toMatchObject({ status: "warn", detail: "X replies paused · LinkedIn minimum version 1.3.0" });
    expect(h.overall).toBe("warn");
  });

  it("a database that doesn't answer is the only check, and a problem", async () => {
    state.sql.ping = new Error("connection refused");
    const h = await engageHealth();
    expect(h).toMatchObject({ overall: "bad", checks: [{ id: "database", status: "bad", detail: "Not answering" }] });
  });

  it("many extension errors or AI failing in the last hour need a look", async () => {
    healthySql();
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    state.sql["ext:count"] = [{ count: 10n }];
    state.sql["ai:models"] = [{ model: "claude-haiku-4-5-20251001", calls: 4n, failed: 3n, avgMs: null }];
    state.sql["history:count"] = new Error("timeout");
    const h = await engageHealth();
    expect(check(h, "extension-errors")?.status).toBe("warn");
    expect(check(h, "ai:haiku")).toMatchObject({ status: "bad", detail: "4 calls, 3 failed, 0.0s on average" });
    expect(check(h, "generations")).toMatchObject({ status: "warn", detail: "Couldn't count" });
    expect(h.overall).toBe("bad");
  });

  it("the route: admins only, never cached", async () => {
    healthySql();
    state.admin = null;
    expect((await healthRoute(get("/api/admin/engage/health"))).status).toBe(403);
    state.admin = { id: "admin1", email: "owner@carouselabs.com" };
    const res = await healthRoute(get("/api/admin/engage/health"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

// ── Sessions ───────────────────────────────────────────────────────────

describe("sessions", () => {
  it("signed in by default, most recently used first, with each browser's extension and version", async () => {
    const s = await listSessions({ status: "active", platform: "any", page: 1, pageSize: 50 });
    expect(s.total).toBe(3);
    expect(s.rows.map((r) => [r.id, r.platform, r.version, r.email])).toEqual([
      ["t2", "x", "1.0.0", "ana@example.com"],
      ["t1", "linkedin", "1.3.0", "ana@example.com"],
      ["t4", "x", null, "cy@example.com"],
    ]);
    expect(s.rows[0]).toMatchObject({ device: "X extension · Chrome on Windows", createdAt: "2026-09-20T00:00:00.000Z", lastUsedAt: "2026-10-03T09:00:00.000Z", revokedAt: null });
  });

  it("filters: signed out, one extension (a browser with no label is LinkedIn's), an email", async () => {
    expect((await listSessions({ status: "signed_out", platform: "any", page: 1, pageSize: 50 })).rows.map((r) => r.id)).toEqual(["t3"]);
    expect((await listSessions({ status: "all", platform: "x", page: 1, pageSize: 50 })).rows.map((r) => r.id)).toEqual(["t2", "t4"]);
    expect((await listSessions({ status: "all", platform: "linkedin", page: 1, pageSize: 50 })).rows.map((r) => r.id)).toEqual(["t1", "t3"]);
    expect((await listSessions({ status: "all", platform: "any", q: " CY@ ", page: 1, pageSize: 50 })).rows.map((r) => r.id)).toEqual(["t4"]);
  });

  it("pages, with the page size kept between 1 and 100", async () => {
    const p2 = await listSessions({ status: "all", platform: "any", page: 2, pageSize: 3 });
    expect(p2).toMatchObject({ total: 4, page: 2, pageSize: 3 });
    expect(p2.rows.map((r) => r.id)).toEqual(["t3"]);
    expect((await listSessions({ status: "all", platform: "any", page: 0, pageSize: 500 })).pageSize).toBe(100);
    expect((await listSessions({ status: "all", platform: "any", page: 1, pageSize: 0 })).rows).toHaveLength(1);
  });

  it("before the admin SQL, no versions; any other failure isn't hidden", async () => {
    state.clientInfoError = missing("EngageClientInfo");
    expect((await listSessions({ status: "active", platform: "any", page: 1, pageSize: 50 })).rows.every((r) => r.version === null)).toBe(true);
    state.clientInfoError = new Error("connection reset");
    await expect(listSessions({ status: "active", platform: "any", page: 1, pageSize: 50 })).rejects.toThrow("connection reset");
  });

  it("the list route: admins only, known filters only", async () => {
    state.admin = null;
    expect((await sessionsRoute(get("/api/admin/engage/sessions"))).status).toBe(403);
    state.admin = { id: "admin1", email: "owner@carouselabs.com" };
    expect((await sessionsRoute(get("/api/admin/engage/sessions?status=deleted"))).status).toBe(400);
    expect((await sessionsRoute(get("/api/admin/engage/sessions?pageSize=1000"))).status).toBe(400);
    const res = await sessionsRoute(get("/api/admin/engage/sessions?platform=x&status=all"));
    expect((await res.json()).rows.map((r: { id: string }) => r.id)).toEqual(["t2", "t4"]);
  });

  it("signs one browser out with a reason, audited with the extension and browser; the others stay signed in", async () => {
    const res = await revoke("t2", { reason: "Lost laptop" });
    expect(res.status).toBe(200);
    expect(state.tokens.find((t) => t.id === "t2")?.revokedAt).toBeInstanceOf(Date);
    expect(state.tokens.find((t) => t.id === "t1")?.revokedAt).toBeNull();
    expect(state.audit).toEqual([
      expect.objectContaining({
        action: "ENGAGE_REVOKE_SESSIONS",
        product: "engage",
        targetUserId: "u1",
        targetEmail: "ana@example.com",
        details: "Signed the X extension out of one browser (X extension · Chrome on Windows)",
        newValue: { tokenId: "t2", revoked: 1 },
        reason: "Lost laptop",
      }),
    ]);
  });

  it("refuses: no reason, an unknown or already signed-out browser, a non-admin, another site; nothing audited", async () => {
    expect((await revoke("t1", { reason: "" })).status).toBe(400);
    expect((await revoke("nope", { reason: "Lost laptop" })).status).toBe(404);
    expect((await revoke("t3", { reason: "Lost laptop" })).status).toBe(400);
    expect((await revoke("t1", { reason: "Lost laptop" }, "https://evil.example")).status).toBe(403);
    state.admin = null;
    expect((await revoke("t1", { reason: "Lost laptop" })).status).toBe(403);
    expect(state.tokens.find((t) => t.id === "t1")?.revokedAt).toBeNull();
    expect(state.audit).toHaveLength(0);
  });

  it("two admins signing the same browser out at once: done and audited once", async () => {
    const [a, b] = await Promise.all([revoke("t1", { reason: "Lost laptop" }), revoke("t1", { reason: "Lost laptop" })]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect(state.audit).toHaveLength(1);
  });
});
