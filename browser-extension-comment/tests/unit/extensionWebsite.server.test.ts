// @vitest-environment node
// The backend half of the website's Extension section: the shared routes
// accept the extension's token OR the website session (getExtensionUser),
// and History now spans every kind of generation. Prisma and Clerk are
// stood in for in memory; see extensionPaywall.server.test.ts for how the
// backend's "@/…" imports resolve here.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sessionUser: null as null | { id: string; email: string },
  tokens: [] as { id: string; userId: string; tokenHash: string; revokedAt: Date | null; device: string | null; lastUsedAt: Date; createdAt: Date }[],
  history: [] as Record<string, unknown>[],
}));

const db = vi.hoisted(() => ({
  extensionToken: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  commentHistory: { findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  commentProfile: { findMany: vi.fn() },
}));

vi.mock("../../../lib/db", () => ({ db }));
const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("../../../lib/auth", () => auth);

import { getExtensionUser, hashCommentExtensionToken } from "../../../lib/extensionCommentAuth";
import { GET as historyGET } from "../../../app/api/ext/history/route";
import { DELETE as historyDELETE } from "../../../app/api/ext/history/[id]/route";
import { DELETE as deviceDELETE } from "../../../app/api/ext/devices/[id]/route";
import { linkedInUrl } from "../../../lib/extensionHistory";

// Prisma semantics: a field left out of `where` doesn't filter. Faking it any
// stricter would let a route that forgets its userId scope pass.
const matches = (row: Record<string, unknown>, where: Record<string, unknown>) =>
  Object.entries(where).every(([key, value]) =>
    value === undefined || (value !== null && typeof value === "object") || row[key] === value,
  );

const TOKEN = "cl_cmt_abc123";
const BASE = "https://carouselabs.com";

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockImplementation(async () => state.sessionUser);
  state.sessionUser = null;
  state.tokens = [
    { id: "t1", userId: "u1", tokenHash: hashCommentExtensionToken(TOKEN), revokedAt: null, device: "Chrome", lastUsedAt: new Date(), createdAt: new Date() },
    { id: "t2", userId: "u2", tokenHash: "other", revokedAt: null, device: "Chrome", lastUsedAt: new Date(), createdAt: new Date() },
  ];
  state.history = [
    { id: "h1", userId: "u1", kind: "comment", profileId: "p1", profileName: null, postAuthor: "Jane", postUrl: "", postSnippet: "", comment: "c", action: "NONE", createdAt: new Date("2026-09-01") },
    { id: "h2", userId: "u1", kind: "message", profileId: null, profileName: "Just continue", postAuthor: "Sam", postUrl: "", postSnippet: "", comment: "m", action: "COPIED", createdAt: new Date("2026-09-02") },
    { id: "h3", userId: "u2", kind: "comment", profileId: "p9", profileName: "Theirs", postAuthor: "X", postUrl: "", postSnippet: "", comment: "x", action: "NONE", createdAt: new Date("2026-09-03") },
  ];

  db.extensionToken.findFirst.mockImplementation(async ({ where }: { where: { tokenHash: string } }) => {
    const t = state.tokens.find((x) => x.tokenHash === where.tokenHash && !x.revokedAt);
    return t ? { ...t, user: { id: t.userId, email: `${t.userId}@example.com` } } : null;
  });
  db.extensionToken.update.mockResolvedValue({});
  db.extensionToken.updateMany.mockImplementation(async ({ where, data }: { where: { id: string; userId: string }; data: { revokedAt: Date } }) => {
    const t = state.tokens.find((x) => matches(x, where) && !x.revokedAt);
    if (!t) return { count: 0 };
    t.revokedAt = data.revokedAt;
    return { count: 1 };
  });
  db.commentHistory.findMany.mockImplementation(async ({ where }: { where: { userId: string; kind?: string } }) =>
    state.history
      .filter((h) => h.userId === where.userId && (!where.kind || h.kind === where.kind))
      .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()),
  );
  db.commentHistory.deleteMany.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) => {
    const before = state.history.length;
    state.history = state.history.filter((h) => !matches(h, where));
    return { count: before - state.history.length };
  });
  db.commentProfile.findMany.mockResolvedValue([{ id: "p1", name: "Founder voice" }]);
});

// Website requests carry Clerk's session cookie, as a browser's would; the
// extension's carry only its token.
const SESSION_COOKIE = "__client_uat=1700000000; __session=eyFake";
const req = (path: string, init: RequestInit = {}) =>
  new Request(`${BASE}${path}`, { ...init, headers: { cookie: SESSION_COOKIE, ...(init.headers ?? {}) } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("who is calling", () => {
  it("accepts the extension's token", async () => {
    const user = await getExtensionUser(req("/api/ext/history", { headers: { authorization: `Bearer ${TOKEN}` } }));
    expect(user?.id).toBe("u1");
  });

  it("accepts the website session when there's no token", async () => {
    state.sessionUser = { id: "u1", email: "u1@example.com" };
    expect((await getExtensionUser(req("/api/ext/history")))?.id).toBe("u1");
  });

  it("never falls back to the session when a token was sent but is bad", async () => {
    state.sessionUser = { id: "u1", email: "u1@example.com" };
    expect(await getExtensionUser(req("/api/ext/history", { headers: { authorization: "Bearer cl_cmt_wrong" } }))).toBeNull();
  });

  it("treats a request with no session cookie as signed out, without asking Clerk", async () => {
    state.sessionUser = { id: "u1", email: "u1@example.com" };
    const bare = new Request(`${BASE}/api/ext/history`);
    expect(await getExtensionUser(bare)).toBeNull();
    expect(auth.getCurrentUser).not.toHaveBeenCalled();
  });

  it("answers signed out, not a crash, if the session lookup fails", async () => {
    auth.getCurrentUser.mockRejectedValueOnce(new Error("Clerk: auth() was called without clerkMiddleware"));
    expect(await getExtensionUser(req("/api/ext/history"))).toBeNull();
    expect((await historyGET(req("/api/ext/history"))).status).toBe(401);
  });

  it("refuses a session-authenticated write from another site", async () => {
    state.sessionUser = { id: "u1", email: "u1@example.com" };
    const fromElsewhere = req("/api/ext/history/h1", { method: "DELETE", headers: { origin: "https://evil.example" } });
    expect(await getExtensionUser(fromElsewhere)).toBeNull();
    const noOrigin = req("/api/ext/history/h1", { method: "DELETE" });
    expect(await getExtensionUser(noOrigin)).toBeNull();
    const fromUs = req("/api/ext/history/h1", { method: "DELETE", headers: { origin: BASE } });
    expect((await getExtensionUser(fromUs))?.id).toBe("u1");
  });
});

describe("history across every kind", () => {
  beforeEach(() => {
    state.sessionUser = { id: "u1", email: "u1@example.com" };
  });

  it("lists only this account's entries, with a kind and a profile name on each", async () => {
    const res = await historyGET(req("/api/ext/history"));
    const body = (await res.json()) as { entries: { id: string; kind: string; profileName: string }[] };
    expect(body.entries.map((e) => [e.id, e.kind, e.profileName])).toEqual([
      ["h2", "message", "Just continue"],
      ["h1", "comment", "Founder voice"],
    ]);
  });

  it("filters by kind, and rejects a kind that doesn't exist", async () => {
    const res = await historyGET(req("/api/ext/history?kind=message"));
    expect(((await res.json()) as { entries: unknown[] }).entries).toHaveLength(1);
    expect((await historyGET(req("/api/ext/history?kind=tweets"))).status).toBe(400);
  });

  it("deletes one of your own entries, but never someone else's", async () => {
    const own = await historyDELETE(req("/api/ext/history/h1", { method: "DELETE", headers: { origin: BASE } }), params("h1"));
    expect(own.status).toBe(200);
    const theirs = await historyDELETE(req("/api/ext/history/h3", { method: "DELETE", headers: { origin: BASE } }), params("h3"));
    expect(theirs.status).toBe(404);
    expect(state.history.map((h) => h.id)).toEqual(["h2", "h3"]);
  });

  it("is closed to a signed-out visitor", async () => {
    state.sessionUser = null;
    expect((await historyGET(req("/api/ext/history"))).status).toBe(401);
  });
});

describe("signing a browser out from the website", () => {
  it("revokes that browser's token, which then stops working", async () => {
    state.sessionUser = { id: "u1", email: "u1@example.com" };
    const res = await deviceDELETE(req("/api/ext/devices/t1", { method: "DELETE", headers: { origin: BASE } }), params("t1"));
    expect(res.status).toBe(200);
    expect(await getExtensionUser(req("/api/ext/me", { headers: { authorization: `Bearer ${TOKEN}` } }))).toBeNull();
  });

  it("can't sign out another account's browser", async () => {
    state.sessionUser = { id: "u1", email: "u1@example.com" };
    const res = await deviceDELETE(req("/api/ext/devices/t2", { method: "DELETE", headers: { origin: BASE } }), params("t2"));
    expect(res.status).toBe(404);
    expect(state.tokens.find((t) => t.id === "t2")?.revokedAt).toBeNull();
  });
});

describe("history links", () => {
  it("keeps only LinkedIn links", () => {
    expect(linkedInUrl("https://www.linkedin.com/in/jane/")).toBe("https://www.linkedin.com/in/jane/");
    expect(linkedInUrl("https://www.linkedin.com/messaging/thread/2-abc/")).toBe("https://www.linkedin.com/messaging/thread/2-abc/");
    expect(linkedInUrl("javascript:alert(1)")).toBe("");
    expect(linkedInUrl("https://evil.example/www.linkedin.com")).toBe("");
    expect(linkedInUrl("http://www.linkedin.com/in/jane")).toBe("");
    expect(linkedInUrl(42)).toBe("");
  });
});

describe("which requests carry a website session", () => {
  it("recognises Clerk's cookies, including the suffixed ones", async () => {
    const { hasClerkSessionCookie, cookieNamesFromHeader } = await import("../../../lib/clerkSessionCookie");
    expect(hasClerkSessionCookie(cookieNamesFromHeader("__session=abc; theme=dark"))).toBe(true);
    expect(hasClerkSessionCookie(cookieNamesFromHeader("__client_uat_Xy12=1700000000"))).toBe(true);
    expect(hasClerkSessionCookie(cookieNamesFromHeader("theme=dark; li_at=zzz"))).toBe(false);
    expect(hasClerkSessionCookie(cookieNamesFromHeader(null))).toBe(false);
  });
});

