// @vitest-environment node
// The extension settings that moved from one browser to the account
// (lib/extensionPreferences.ts, app/api/ext/settings, app/api/ext/contacts),
// against an in-memory stand-in for Prisma.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sessionUser: null as null | Record<string, unknown>,
  contacts: [] as Record<string, unknown>[],
  lastUserUpdate: null as null | Record<string, unknown>,
}));

const db = vi.hoisted(() => ({
  user: { update: vi.fn() },
  contactContext: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  commentProfile: { findFirst: vi.fn() },
  connectionProfile: { findFirst: vi.fn() },
  messageProfile: { findFirst: vi.fn() },
  subscription: { findUnique: vi.fn(async () => null) },
  commentHistory: { count: vi.fn(async () => 0) },
}));

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/auth", () => ({ getCurrentUser: vi.fn(async () => state.sessionUser) }));
vi.mock("../../../lib/extAccess", () => ({ extAccessSummary: vi.fn(async () => null) }));

import {
  isContactUrl,
  parseConnectNoteContext,
  parseConnectNoteLength,
  parseContactContext,
  parseLinkedinProfile,
} from "../../../lib/extensionPreferences";
import { GET as settingsGET, PATCH as settingsPATCH } from "../../../app/api/ext/settings/route";
import { GET as meGET } from "../../../app/api/ext/me/route";
import { GET as contactsGET, PUT as contactsPUT } from "../../../app/api/ext/contacts/route";
import { DELETE as contactDELETE } from "../../../app/api/ext/contacts/[id]/route";

// Prisma semantics: a field left out of `where` doesn't filter. Faking it any
// stricter would let a route that forgets its userId scope pass.
const matches = (row: Record<string, unknown>, where: Record<string, unknown>) =>
  Object.entries(where).every(([key, value]) => value === undefined || row[key] === value);

const BASE = "https://carouselabs.com";
// A browser's request from our own page: same-origin, with Clerk's cookie.
const req = (path: string, init: RequestInit = {}) =>
  new Request(`${BASE}${path}`, {
    ...init,
    headers: { origin: BASE, cookie: "__client_uat=1700000000; __session=eyFake", ...(init.headers ?? {}) },
  });

beforeEach(() => {
  vi.clearAllMocks();
  state.sessionUser = {
    id: "u1",
    email: "u1@example.com",
    defaultCommentProfileId: null,
    defaultConnectionProfileId: null,
    defaultMessageProfileId: null,
    defaultLanguage: null,
    insertWarningHidden: false,
    connectNoteContext: { choice: "custom", purpose: "I help founders" },
    connectNoteLength: null,
    linkedinProfile: null,
    insertButtonHidden: null,
  };
  state.contacts = [
    { id: "k1", userId: "u1", contactUrl: "/in/sam", contactName: "Sam", choice: "flow", profileId: null, purpose: "", tone: "Natural", updatedAt: new Date() },
    { id: "k2", userId: "u2", contactUrl: "/in/sam", contactName: "Sam", choice: "flow", profileId: null, purpose: "", tone: "Natural", updatedAt: new Date() },
  ];
  db.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    state.lastUserUpdate = data;
    return { ...state.sessionUser, ...data };
  });
  db.contactContext.findUnique.mockImplementation(
    async ({ where }: { where: { userId_contactUrl: { userId: string; contactUrl: string } } }) =>
      state.contacts.find(
        (c) => c.userId === where.userId_contactUrl.userId && c.contactUrl === where.userId_contactUrl.contactUrl,
      ) ?? null,
  );
  db.contactContext.findMany.mockImplementation(async ({ where }: { where: { userId: string } }) =>
    state.contacts.filter((c) => matches(c, where)),
  );
  db.contactContext.upsert.mockImplementation(
    async ({ where, create, update }: { where: { userId_contactUrl: { userId: string; contactUrl: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const existing = state.contacts.find(
        (c) => c.userId === where.userId_contactUrl.userId && c.contactUrl === where.userId_contactUrl.contactUrl,
      );
      if (existing) Object.assign(existing, update, { updatedAt: new Date() });
      else state.contacts.push({ id: `k${state.contacts.length + 1}`, ...create, updatedAt: new Date() });
      return existing ?? state.contacts[state.contacts.length - 1];
    },
  );
  db.contactContext.deleteMany.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) => {
    const before = state.contacts.length;
    state.contacts = state.contacts.filter((c) => !matches(c, where));
    return { count: before - state.contacts.length };
  });
});

describe("validation", () => {
  it("accepts the shapes the extension stores, and clears with null", () => {
    expect(parseConnectNoteContext({ choice: "custom", purpose: "  I help founders " })).toEqual({
      ok: true,
      value: { choice: "custom", purpose: "I help founders" },
    });
    expect(parseConnectNoteContext(null)).toEqual({ ok: true, value: null });
    expect(parseConnectNoteContext({ choice: "sometimes" }).ok).toBe(false);
  });

  it("fixes a preset's range, and bounds a custom one to LinkedIn's limit", () => {
    expect(parseConnectNoteLength({ preset: "short", min: 5, max: 999 })).toEqual({
      ok: true,
      value: { preset: "short", min: 80, max: 150 },
    });
    expect(parseConnectNoteLength({ preset: "custom", min: 100, max: 220 }).ok).toBe(true);
    expect(parseConnectNoteLength({ preset: "custom", min: 100, max: 300 }).ok).toBe(false);
    expect(parseConnectNoteLength({ preset: "custom", min: 200, max: 100 }).ok).toBe(false);
  });

  it("needs a name on your LinkedIn profile, and only keeps a LinkedIn link", () => {
    expect(parseLinkedinProfile({ headline: "Founder" }).ok).toBe(false);
    const parsed = parseLinkedinProfile({ name: "Anant", url: "javascript:alert(1)", capturedAt: 7 });
    expect(parsed).toMatchObject({ ok: true, value: { name: "Anant", url: "", capturedAt: 7 } });
  });

  it("keys a conversation by the contact's /in/ path only", () => {
    expect(isContactUrl("/in/sam-lee")).toBe(true);
    expect(isContactUrl("/in/acoaab%c3%a9")).toBe(true);
    expect(isContactUrl("https://evil.example/in/x")).toBe(false);
    expect(isContactUrl("/company/acme")).toBe(false);
    expect(parseContactContext({ contactUrl: "/in/sam", choice: "chat" }).ok).toBe(false);
  });
});

describe("settings route", () => {
  it("returns the moved settings alongside the old ones", async () => {
    const body = (await (await settingsGET(req("/api/ext/settings"))).json()) as Record<string, unknown>;
    expect(body).toMatchObject({ connectNoteContext: { choice: "custom", purpose: "I help founders" }, insertButtonHidden: null });
  });

  it("tells extensions before 1.3.0 the Insert warning is off, whatever was stored", async () => {
    // The stored value is false (never dismissed); there is no warning any more.
    const body = (await (await settingsGET(req("/api/ext/settings"))).json()) as Record<string, unknown>;
    expect(body.insertWarningHidden).toBe(true);
    const saved = await settingsPATCH(
      req("/api/ext/settings", { method: "PATCH", body: JSON.stringify({ insertWarningHidden: false }) }),
    );
    expect(((await saved.json()) as Record<string, unknown>).insertWarningHidden).toBe(true);
    // The account call is what an older panel checks before each Insert.
    const me = (await (await meGET(req("/api/ext/me"))).json()) as Record<string, unknown>;
    expect(me.insertWarningHidden).toBe(true);
  });

  it("stores valid values, a database NULL when cleared, and rejects bad ones", async () => {
    const ok = await settingsPATCH(
      req("/api/ext/settings", {
        method: "PATCH",
        body: JSON.stringify({ connectNoteLength: { preset: "medium" }, insertButtonHidden: true, linkedinProfile: null }),
      }),
    );
    expect(ok.status).toBe(200);
    expect(state.lastUserUpdate).toMatchObject({ connectNoteLength: { preset: "medium", min: 150, max: 280 }, insertButtonHidden: true });
    // Prisma's DbNull, not a JSON "null" value.
    expect(String(state.lastUserUpdate?.linkedinProfile)).toMatch(/DbNull/);

    const bad = await settingsPATCH(
      req("/api/ext/settings", { method: "PATCH", body: JSON.stringify({ connectNoteLength: { preset: "custom", min: 10, max: 20 } }) }),
    );
    expect(bad.status).toBe(400);
  });
});

describe("contacts route", () => {
  it("reads one person's setting by profile path, only from this account", async () => {
    const res = await contactsGET(req("/api/ext/contacts?url=%2Fin%2Fsam"));
    expect(((await res.json()) as { contact: { id: string } }).contact.id).toBe("k1");
    const list = (await (await contactsGET(req("/api/ext/contacts"))).json()) as { contacts: unknown[] };
    expect(list.contacts).toHaveLength(1);
  });

  it("saves a change, keeping the stored name when none is sent", async () => {
    const res = await contactsPUT(
      req("/api/ext/contacts", {
        method: "PUT",
        body: JSON.stringify({ contactUrl: "/in/sam", contactName: "", choice: "custom", purpose: "Lead", tone: "Warm" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(state.contacts.find((c) => c.id === "k1")).toMatchObject({ contactName: "Sam", choice: "custom", purpose: "Lead", tone: "Warm" });
    // The other account's row with the same contact is untouched.
    expect(state.contacts.find((c) => c.id === "k2")).toMatchObject({ choice: "flow" });
  });

  it("can't forget another account's conversation", async () => {
    const res = await contactDELETE(req("/api/ext/contacts/k2", { method: "DELETE" }), { params: Promise.resolve({ id: "k2" }) });
    expect(res.status).toBe(404);
    expect(state.contacts).toHaveLength(2);
  });

  it("is closed to a signed-out visitor", async () => {
    state.sessionUser = null;
    expect((await contactsGET(req("/api/ext/contacts"))).status).toBe(401);
  });
});
