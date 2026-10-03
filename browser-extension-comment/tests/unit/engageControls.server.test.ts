// @vitest-environment node
// Engage admin phase B: settings for everyone (admin → Engage → Controls).
// The rules (defaults, bad stored values, version order), the gate that every
// writing route passes (an outdated extension gets "please update", a paused
// feature gets the admin's message, the other extension is unaffected), the
// Insert switch per extension, the settings cache, and the Controls API
// (who may change what, validation, the audit trail).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const state = vi.hoisted(() => ({
  settings: [] as Array<{ key: string; value: unknown; updatedAt: Date; updatedBy: string | null }>,
  settingsMissing: false,
  settingsReads: 0,
  audit: [] as Array<Record<string, unknown>>,
  versions: [] as Array<{ platform: "linkedin" | "x"; version: string | null; browsers: number; people: number; lastSeenAt: string }>,
  admin: { id: "admin1", email: "owner@carouselabs.com" } as null | { id: string; email: string },
  control: null as null | Record<string, unknown>,
}));

const db = vi.hoisted(() => ({
  engageSetting: {
    findMany: vi.fn(async () => {
      state.settingsReads += 1;
      if (state.settingsMissing) throw missing();
      return state.settings;
    }),
    upsert: vi.fn(async ({ where, create, update }: { where: { key: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      if (state.settingsMissing) throw missing();
      const existing = state.settings.find((s) => s.key === where.key);
      if (existing) Object.assign(existing, update, { updatedAt: new Date() });
      else state.settings.push({ ...(create as { key: string; value: unknown; updatedBy: string }), updatedAt: new Date() });
      return {};
    }),
  },
  user: {
    findUnique: vi.fn(async () => ({
      email: "sam@example.com",
      suspendedAt: null,
      deletedAt: null,
      extensionTrialUsed: 0,
      engageControl: state.control,
      extensionSubscription: { status: "active", endsAt: null },
    })),
  },
  extensionSubscription: { findUnique: vi.fn(async () => null) },
  engageAccessGrant: { findMany: vi.fn(async () => []), updateMany: vi.fn(async () => ({ count: 0 })) },
  auditLog: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { state.audit.push(data); return {}; }) },
}));

// A Prisma "table does not exist" error, as the real client throws it.
function missing() {
  return new Prisma.PrismaClientKnownRequestError("The table `EngageSetting` does not exist", { code: "P2021", clientVersion: "test" });
}

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/adminAuth", () => ({ getAdminUser: vi.fn(async () => state.admin) }));
vi.mock("../../../lib/extDailyLimit", () => ({ extDailyLimitResponse: vi.fn(async () => null) }));
vi.mock("../../../lib/engage/versions", () => ({ extensionVersions: vi.fn(async () => state.versions), VERSIONS_WINDOW_DAYS: 30 }));

import {
  compareVersions,
  defaultGlobalSettings,
  globalSettingsFrom,
  isOutdated,
  requestPlatform,
} from "../../../lib/engage/settingsRules";
import { blockedReason, computeEngageAccess } from "../../../lib/engage/accessRules";
import { clearGlobalSettingsCache, loadGlobalSettings, SETTINGS_CACHE_MS } from "../../../lib/engage/settings";
import { engagePreflight } from "../../../lib/engage/gate";
import { GET as configGET } from "../../../app/api/ext/config/route";
import { extAccessSummary } from "../../../lib/extAccess";
import { GET as controlsGET, PATCH as controlsPATCH } from "../../../app/api/admin/engage/controls/route";

const setting = (key: string, value: unknown) => state.settings.push({ key, value, updatedAt: new Date("2026-10-03T10:00:00Z"), updatedBy: "owner@carouselabs.com" });
const extReq = (path: string, version?: string) =>
  new Request(`https://carouselabs.com${path}`, { method: "POST", headers: version ? { "x-engage-version": version } : {} });
const ADMIN = "https://admin.carouselabs.com";
const patch = (body: unknown) =>
  controlsPATCH(new Request(`${ADMIN}/api/admin/engage/controls`, { method: "PATCH", headers: { "content-type": "application/json", origin: ADMIN }, body: JSON.stringify(body) }));
const get = () => controlsGET(new Request(`${ADMIN}/api/admin/engage/controls`));

beforeEach(() => {
  state.settings = [];
  state.settingsMissing = false;
  state.settingsReads = 0;
  state.audit = [];
  state.admin = { id: "admin1", email: "owner@carouselabs.com" };
  state.control = null;
  state.versions = [
    { platform: "linkedin", version: "1.3.0", browsers: 8, people: 7, lastSeenAt: "2026-10-03T09:00:00Z" },
    { platform: "linkedin", version: "1.2.0", browsers: 3, people: 3, lastSeenAt: "2026-10-01T09:00:00Z" },
    { platform: "linkedin", version: null, browsers: 2, people: 2, lastSeenAt: "2026-09-20T09:00:00Z" },
    { platform: "x", version: "1.0.0", browsers: 4, people: 4, lastSeenAt: "2026-10-03T09:00:00Z" },
  ];
  clearGlobalSettingsCache();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("rules", () => {
  it("everything on and no minimum until something is saved; bad stored values are ignored per key", () => {
    expect(globalSettingsFrom([])).toEqual(defaultGlobalSettings());
    const s = globalSettingsFrom([
      { key: "features", value: { x_replies: { enabled: false, message: "Back soon" } } },
      { key: "insert", value: { x: "nope" } },
      { key: "minVersion", value: { linkedin: "1.3.0", x: "one" } },
      { key: "unknown", value: 1 },
    ]);
    expect(s.features.x_replies).toEqual({ enabled: false, message: "Back soon" });
    expect(s.features.comments.enabled).toBe(true);
    expect(s.insert).toEqual({ linkedin: true, x: true });
    expect(s.minVersion).toEqual({ linkedin: null, x: null });
  });

  it("compares versions part by part, and treats a missing version as older than any minimum", () => {
    expect(compareVersions("1.10.0", "1.9.2")).toBe(1);
    expect(compareVersions("1.3", "1.3.0")).toBe(0);
    expect(compareVersions("1.2.9", "1.3.0")).toBe(-1);
    expect(isOutdated("1.2.0", null)).toBe(false);
    expect(isOutdated("1.2.0", "1.3.0")).toBe(true);
    expect(isOutdated("1.3.0", "1.3.0")).toBe(false);
    expect(isOutdated("1.4.1", "1.3.0")).toBe(false);
    expect(isOutdated(null, "1.3.0")).toBe(true);
    expect(isOutdated("banana", "1.3.0")).toBe(true);
  });

  it("knows the X extension by its routes", () => {
    expect(requestPlatform("/api/ext/x/reply")).toBe("x");
    expect(requestPlatform("/api/ext/generate")).toBe("linkedin");
    expect(requestPlatform("/api/ext/xyz")).toBe("linkedin");
  });

  it("a paused feature is off for everyone, with the admin's message (or a standard one)", () => {
    const global = globalSettingsFrom([{ key: "features", value: { comments: { enabled: false, message: "Back at 5pm" }, x_replies: { enabled: false, message: null } } }]);
    const access = computeEngageAccess({
      now: new Date(), paywallEnforced: true, accountSuspendedAt: null, control: { features: { messages: "off" }, limits: {}, freeGenerations: null, suspendedAt: null, suspendReason: null },
      subscription: { status: "active", endsAt: null }, grants: [], freeUsed: 0, global,
    });
    expect(access.features.comments).toMatchObject({ paused: true, enabled: false });
    expect(blockedReason(access, "comments")).toEqual({ status: 403, code: "feature_paused", error: "Back at 5pm" });
    expect(blockedReason(access, "x_replies")?.error).toBe("X replies: paused for a little while. Please try again later.");
    expect(blockedReason(access, "x_rewrites")?.code).toBe("feature_paused");
    // Shorter / Longer needs comments OR replies: replies are still on.
    expect(blockedReason(access, "rewrites")).toBeNull();
    // Off for this one user is still "not on your account".
    expect(blockedReason(access, "messages")?.code).toBe("feature_disabled");

    // A blank message (a hand edit) gets the standard wording, not nothing.
    const blank = computeEngageAccess({
      now: new Date(), paywallEnforced: true, accountSuspendedAt: null, control: null, subscription: null, grants: [], freeUsed: 0,
      global: globalSettingsFrom([{ key: "features", value: { comments: { enabled: false, message: "" } } }]),
    });
    expect(blockedReason(blank, "comments")?.error).toBe("AI comments: paused for a little while. Please try again later.");
  });
});

describe("the gate on every writing route", () => {
  it("asks an extension older than its minimum to update, and only that extension", async () => {
    setting("minVersion", { x: "1.1.0" });
    const old = await engagePreflight("u1", "x_replies", extReq("/api/ext/x/reply", "1.0.0"));
    expect(old.response?.status).toBe(426);
    expect(await old.response!.json()).toMatchObject({ code: "update_required", error: expect.stringContaining("CarouseLabs Engage for X is out of date") });
    expect((await engagePreflight("u1", "x_replies", extReq("/api/ext/x/reply", "1.1.0"))).response).toBeNull();
    // LinkedIn has no minimum: even a browser that sends no version may write.
    expect((await engagePreflight("u1", "comments", extReq("/api/ext/generate"))).response).toBeNull();
  });

  it("asks LinkedIn browsers that send no version to update once a LinkedIn minimum is set", async () => {
    setting("minVersion", { linkedin: "1.3.0" });
    expect((await engagePreflight("u1", null, extReq("/api/ext/generate"))).response?.status).toBe(426);
    expect((await engagePreflight("u1", null, extReq("/api/ext/generate", "1.3.0"))).response).toBeNull();
  });

  it("refuses a paused feature with the admin's message", async () => {
    setting("features", { x_messages: { enabled: false, message: "X chat help is paused while X fixes their chat." } });
    const res = (await engagePreflight("u1", "x_messages", extReq("/api/ext/x/message", "1.0.0"))).response!;
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "X chat help is paused while X fixes their chat.", code: "feature_paused" });
    expect((await engagePreflight("u1", "x_replies", extReq("/api/ext/x/reply", "1.0.0"))).response).toBeNull();
  });

  it("doesn't tell the extension a paused feature is off for this account", async () => {
    setting("features", { x_replies: { enabled: false, message: null } });
    state.control = { features: { x_messages: "off" }, limits: {}, freeGenerations: null, suspendedAt: null, suspendReason: null };
    const summary = await extAccessSummary("u1");
    expect(summary.features.x_replies).toBe(true);
    expect(summary.features.x_messages).toBe(false);
  });

  it("works as today before the phase B SQL has run", async () => {
    state.settingsMissing = true;
    expect((await engagePreflight("u1", "comments", extReq("/api/ext/generate"))).response).toBeNull();
  });
});

describe("Insert, per extension", () => {
  const config = async (url: string, origin?: string) =>
    ((await (await configGET(new Request(url, { headers: origin ? { origin } : {} }))).json()) as { insertEnabled: boolean }).insertEnabled;

  it("each extension reads its own switch: X by its page or ?platform=x, everything else LinkedIn's", async () => {
    setting("insert", { x: false });
    expect(await config("https://carouselabs.com/api/ext/config", "https://x.com")).toBe(false);
    expect(await config("https://carouselabs.com/api/ext/config?platform=x")).toBe(false);
    expect(await config("https://carouselabs.com/api/ext/config", "https://www.linkedin.com")).toBe(true);
    expect(await config("https://carouselabs.com/api/ext/config")).toBe(true);
  });
});

describe("settings cache", () => {
  it("reads the database at most once per few seconds, and keeps the last good settings if a read fails", async () => {
    setting("insert", { x: false });
    const t = 1_000_000;
    expect((await loadGlobalSettings(t)).insert.x).toBe(false);
    await loadGlobalSettings(t + SETTINGS_CACHE_MS - 1);
    expect(state.settingsReads).toBe(1);
    db.engageSetting.findMany.mockRejectedValueOnce(new Error("connection reset"));
    expect((await loadGlobalSettings(t + SETTINGS_CACHE_MS + 1)).insert.x).toBe(false);
  });
});

describe("Controls API", () => {
  it("shows the settings and the versions in use, and says when the SQL hasn't run", async () => {
    setting("insert", { x: false });
    const body = (await (await get()).json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ready: true, settings: { insert: { linkedin: true, x: false } }, versions: state.versions });
    expect((body.saved as Record<string, unknown>).insert).toMatchObject({ updatedBy: "owner@carouselabs.com" });
    state.settingsMissing = true;
    expect(await (await get()).json()).toMatchObject({ ready: false, settings: { insert: { x: true } } });
  });

  it("pauses a feature for everyone with a message, logs who, why and what changed, and turns it back on", async () => {
    const res = await patch({ feature: { key: "x_replies", enabled: false, message: "  Back soon  " }, reason: "X changed its reply box" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { settings: { features: Record<string, unknown> } }).settings.features.x_replies).toEqual({ enabled: false, message: "Back soon" });
    expect(state.audit[0]).toMatchObject({
      adminEmail: "owner@carouselabs.com",
      action: "ENGAGE_PAUSE_FEATURE",
      product: "engage",
      details: 'Paused X replies for everyone: "Back soon"',
      oldValue: { x_replies: { enabled: true, message: null } },
      newValue: { x_replies: { enabled: false, message: "Back soon" } },
      reason: "X changed its reply box",
    });
    // The generation path sees it at once on this server.
    expect((await loadGlobalSettings()).features.x_replies.enabled).toBe(false);

    // Back on: the old message goes, even if one is sent along.
    await patch({ feature: { key: "x_replies", enabled: true, message: "ignored" } });
    expect(state.audit[1]).toMatchObject({ action: "ENGAGE_RESUME_FEATURE", newValue: { x_replies: { enabled: true, message: null } } });
    expect((await loadGlobalSettings()).features.x_replies).toEqual({ enabled: true, message: null });
    // Other features untouched.
    expect((await loadGlobalSettings()).features.comments.enabled).toBe(true);
  });

  it("switches Insert per extension", async () => {
    await patch({ insert: { platform: "x", enabled: false } });
    expect((await loadGlobalSettings()).insert).toEqual({ linkedin: true, x: false });
    expect(state.audit[0]).toMatchObject({ action: "ENGAGE_SET_INSERT", details: "Insert off for everyone in the X extension" });
  });

  it("sets a minimum version only if someone already has it, and removes it", async () => {
    expect((await patch({ minVersion: { platform: "x", version: "1.1.0" } })).status).toBe(400);
    expect((await patch({ minVersion: { platform: "linkedin", version: "v1.3" } })).status).toBe(400);
    expect(state.settings).toEqual([]);

    expect((await patch({ minVersion: { platform: "linkedin", version: "1.3.0" } })).status).toBe(200);
    expect((await loadGlobalSettings()).minVersion).toEqual({ linkedin: "1.3.0", x: null });
    expect(state.audit[0]).toMatchObject({ action: "ENGAGE_SET_MIN_VERSION", details: "Minimum LinkedIn extension version set to 1.3.0" });

    await patch({ minVersion: { platform: "linkedin", version: null } });
    expect((await loadGlobalSettings()).minVersion.linkedin).toBeNull();
  });

  it("refuses nonsense, a cross-site write, a non-admin, and saving before the SQL has run", async () => {
    expect((await patch({ feature: { key: "nope", enabled: false } })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect((await controlsPATCH(new Request(`${ADMIN}/api/admin/engage/controls`, { method: "PATCH", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ insert: { platform: "x", enabled: false } }) }))).status).toBe(403);
    state.admin = null;
    expect((await patch({ insert: { platform: "x", enabled: false } })).status).toBe(403);
    expect((await get()).status).toBe(403);
    state.admin = { id: "admin1", email: "owner@carouselabs.com" };
    state.settingsMissing = true;
    expect((await patch({ insert: { platform: "x", enabled: false } })).status).toBe(409);
    expect(state.audit).toEqual([]);
  });
});
