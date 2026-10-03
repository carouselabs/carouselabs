// @vitest-environment node
// The X extension's profile tools and Shorter/Longer on the server: editing
// and deleting only your own X profiles (a deleted default falls back), the
// builder's Test (X's prompt, "x_tests", the per-profile cap), and Shorter /
// Longer for X ("x_rewrites", X's count, never past the account's limit)
// next to LinkedIn's, which must not change.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  replies: [] as string[],
  prompts: [] as string[],
  gate: [] as string[],
  profiles: [] as Record<string, unknown>[],
  settings: null as null | Record<string, unknown>,
  history: [] as { where: Record<string, unknown>; data: Record<string, unknown> }[],
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (body: { messages: { content: string }[] }) => {
          state.prompts.push(body.messages[0].content);
          return { choices: [{ message: { content: JSON.stringify({ comment: state.replies.shift() ?? "" }) } }] };
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: async () => ({ content: [] }) }; } }));

const matches = (row: Record<string, unknown>, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => v === undefined || row[k] === v);

vi.mock("../../../lib/db", () => ({
  db: {
    xProfile: {
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const rows = state.profiles.filter((p) => matches(p, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      }),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const before = state.profiles.length;
        state.profiles = state.profiles.filter((p) => !matches(p, where));
        return { count: before - state.profiles.length };
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.profiles.find((p) => p.id === where.id) ?? null),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.profiles.find((p) => matches(p, where)) ?? null),
    },
    xUserSettings: {
      findUnique: vi.fn(async () => state.settings),
      upsert: vi.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        state.settings = state.settings ? { ...state.settings, ...update } : create;
        return state.settings;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (state.settings && matches(state.settings, where)) {
          Object.assign(state.settings, data);
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    commentHistory: {
      updateMany: vi.fn(async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        state.history.push(args);
        return { count: 1 };
      }),
    },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => ({ id: "u1" })),
  getExtensionUser: vi.fn(async () => ({ id: "u1" })),
}));
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async (_u: string, kind: string) => {
    state.gate.push(`preflight:${kind}`);
    return { response: null, loaded: null };
  }),
  reserveEngageGeneration: vi.fn(async (_u: string, kind: string) => {
    state.gate.push(`reserve:${kind}`);
    return { ok: true, freeRemaining: null, release: vi.fn() };
  }),
}));

import { PUT as profilePUT, DELETE as profileDELETE } from "../../../app/api/ext/x/profiles/[id]/route";
import { POST as testPOST } from "../../../app/api/ext/x/profiles/test/route";
import { POST as xRewritePOST } from "../../../app/api/ext/x/rewrite/route";
import { POST as rewritePOST } from "../../../app/api/ext/rewrite/route";

const DRAFT = { name: "Punchy", whoIAm: "A founder", goal: "One sharp point", tone: "Direct", length: "20-120 characters" };
const req = (path: string, method: string, body?: unknown) =>
  new Request(`https://carouselabs.com${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_x" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  state.replies = [];
  state.prompts = [];
  state.gate = [];
  state.history = [];
  state.settings = null;
  state.profiles = [
    { id: "mine", userId: "u1", isSystem: false, ...DRAFT, testsUsed: 0 },
    { id: "theirs", userId: "u2", isSystem: false, ...DRAFT, testsUsed: 0 },
    { id: "sys-x-quick-reply", userId: null, isSystem: true, ...DRAFT, testsUsed: 0 },
  ];
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("X profiles: edit and delete", () => {
  it("edits your own, never someone else's or a preset", async () => {
    expect((await profilePUT(req("/x", "PUT", { ...DRAFT, name: "Renamed", setAsDefault: true }), params("mine"))).status).toBe(200);
    expect(state.profiles[0].name).toBe("Renamed");
    expect(state.settings).toMatchObject({ defaultProfileId: "mine" });
    expect((await profilePUT(req("/x", "PUT", DRAFT), params("theirs"))).status).toBe(404);
    expect((await profilePUT(req("/x", "PUT", DRAFT), params("sys-x-quick-reply"))).status).toBe(404);
    expect((await profilePUT(req("/x", "PUT", { ...DRAFT, length: "100-1500 characters" }), params("mine"))).status).toBe(400);
  });

  it("deletes your own, and a deleted default falls back to the preset", async () => {
    state.settings = { userId: "u1", defaultProfileId: "mine" };
    expect((await profileDELETE(req("/x", "DELETE"), params("mine"))).status).toBe(200);
    expect(state.settings.defaultProfileId).toBeNull();
    expect((await profileDELETE(req("/x", "DELETE"), params("theirs"))).status).toBe(404);
    expect(state.profiles.map((p) => p.id)).toEqual(["theirs", "sys-x-quick-reply"]);
  });
});

describe("X profiles: Test", () => {
  it("previews with X's prompt, counts an X test, and uses one of the profile's tests", async () => {
    state.replies = ["the onboarding order point is underrated"];
    const res = await testPOST(req("/x", "POST", { profileDraft: DRAFT, pastedPost: "We cut onboarding from 14 steps to 5.", profileId: "mine" }));
    expect(await res.json()).toMatchObject({ comment: "the onboarding order point is underrated", testsUsed: 1, testLimit: 3 });
    expect(state.gate).toEqual(["preflight:x_tests", "reserve:x_tests"]);
    expect(state.prompts[0]).toMatch(/^You write replies on X/);
    expect(state.profiles[0].testsUsed).toBe(1);
  });

  it("stops at the cap, and never tests someone else's profile", async () => {
    state.profiles[0].testsUsed = 3;
    expect((await testPOST(req("/x", "POST", { profileDraft: DRAFT, pastedPost: "A post", profileId: "mine" }))).status).toBe(403);
    expect((await testPOST(req("/x", "POST", { profileDraft: DRAFT, pastedPost: "A post", profileId: "theirs" }))).status).toBe(404);
    expect(state.gate.filter((g) => g.startsWith("reserve"))).toEqual([]);
  });
});

describe("Shorter / Longer", () => {
  it("X: counts an X rewrite, writes for X, and keeps the history row in step", async () => {
    state.replies = ["Order beats count, every time."];
    const res = await xRewritePOST(
      req("/x", "POST", { currentComment: "Order beats count. Most teams cut steps but keep the order, and that is the real mistake here.", direction: "shorter", historyId: "h1" }),
    );
    expect(await res.json()).toMatchObject({ comment: "Order beats count, every time." });
    expect(state.gate).toEqual(["preflight:x_rewrites", "reserve:x_rewrites"]);
    expect(state.prompts[0]).toMatch(/existing reply on X/);
    expect(state.prompts[0]).toMatch(/at most 280 characters as X\s+counts them/);
    expect(state.history[0]).toEqual({ where: { id: "h1", userId: "u1" }, data: { comment: "Order beats count, every time." } });
  });

  it("X: a Longer that would pass the account's limit is thrown away", async () => {
    const near = "a".repeat(250);
    state.replies = ["b".repeat(300), "c".repeat(270)];
    const res = await xRewritePOST(req("/x", "POST", { currentComment: near, direction: "longer" }));
    // The 300-character try is over 280; the 270 one is kept (longer than 250, within 280).
    expect(((await res.json()) as { comment: string }).comment).toBe("c".repeat(270));
  });

  it("X: counts a link as 23 when judging Shorter", async () => {
    // 60 letters + a 70-character link = 60 + 1 + 23 = 84 as X counts it.
    const current = `${"a".repeat(60)} https://example.com/${"z".repeat(50)}`;
    // 40 as X counts it: shorter than 84 * 0.75 = 63, though not by raw length.
    state.replies = [`${"b".repeat(16)} https://example.com/${"y".repeat(60)}`];
    const res = await xRewritePOST(req("/x", "POST", { currentComment: current, direction: "shorter" }));
    expect(res.status).toBe(200);
    expect(state.prompts).toHaveLength(1);
  });

  it("LinkedIn: unchanged", async () => {
    state.replies = ["Order beats count."];
    const res = await rewritePOST(req("/x", "POST", { currentComment: "Order beats count. Most teams cut steps and keep the order, which is the mistake.", direction: "shorter" }));
    expect(res.status).toBe(200);
    expect(state.gate).toEqual(["preflight:rewrites", "reserve:rewrites"]);
    expect(state.prompts[0]).toMatch(/existing LinkedIn comment/);
    expect(state.prompts[0]).not.toMatch(/as X\s+counts/);
  });
});
