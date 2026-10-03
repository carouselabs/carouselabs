// @vitest-environment node
// CarouseLabs Engage for X on the server: the Reply route (streamed, X's
// length rules, X profiles, "x_replies" against the shared plan, history as
// x_reply), the X profiles and settings routes, and the body checks. The
// models are scripted and Prisma, the token lookup and the gate are stood in
// for in memory, as in generateStream.server.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const script = vi.hoisted(() => ({ luna: [] as string[][], prompts: [] as { system: string; user: string }[] }));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (body: { messages: { role: string; content: string }[] }) => {
          script.prompts.push({ system: body.messages[0].content, user: body.messages[1].content });
          const chunks = script.luna.shift() ?? [];
          return (async function* () {
            for (const content of chunks) yield { choices: [{ delta: { content } }] };
          })();
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => {
        throw new Error("Haiku not scripted in these tests");
      },
    };
  },
}));

const state = vi.hoisted(() => ({
  user: { id: "u1", email: "u1@example.com" } as null | { id: string; email: string },
  profiles: [] as Record<string, unknown>[],
  settings: null as null | Record<string, unknown>,
  history: [] as Record<string, unknown>[],
  gate: "ok" as "ok" | "paywall",
  gateKinds: [] as string[],
  release: vi.fn(async () => {}),
}));

const matches = (row: Record<string, unknown>, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Record<string, unknown>[]).some((w) => matches(row, w));
    return value === undefined || row[key] === value;
  });

vi.mock("../../../lib/db", () => ({
  db: {
    xProfile: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.profiles.find((p) => matches(p, where)) ?? null),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.profiles.filter((p) => matches(p, where))),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `xp${state.profiles.length + 1}`, ...data };
        state.profiles.push(row);
        return row;
      }),
    },
    xUserSettings: {
      findUnique: vi.fn(async () => state.settings),
      upsert: vi.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        state.settings = state.settings ? { ...state.settings, ...update } : create;
        return state.settings;
      }),
    },
    commentHistory: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.history.push(data);
        return { id: `h${state.history.length}` };
      }),
    },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => state.user),
  getExtensionUser: vi.fn(async () => state.user),
}));
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async (_userId: string, kind: string) => {
    state.gateKinds.push(`preflight:${kind}`);
    return { response: null, loaded: null };
  }),
  reserveEngageGeneration: vi.fn(async (_userId: string, kind: string) => {
    state.gateKinds.push(`reserve:${kind}`);
    return state.gate === "ok"
      ? { ok: true, freeRemaining: 4, release: state.release }
      : { ok: false, response: NextResponse.json({ error: "Used up", requiresSubscription: true }, { status: 402 }) };
  }),
}));

import { POST as replyPOST } from "../../../app/api/ext/x/reply/route";
import { GET as profilesGET, POST as profilesPOST } from "../../../app/api/ext/x/profiles/route";
import { GET as settingsGET, PATCH as settingsPATCH } from "../../../app/api/ext/x/settings/route";
import { parseReplyBody, xPostUrl } from "../../../lib/xReply";

const PRESET = {
  id: "sys-x-thoughtful-reply", userId: null, name: "CarouseLabs — X Thoughtful Reply", whoIAm: "Someone who adds one useful point",
  goal: "Add one insight", tone: "Conversational", length: "80-220 characters", emoji: "None", language: "English",
  alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true,
};
const POST_BODY = {
  profileId: PRESET.id,
  post: { author: "Priya Raman", handle: "@priya", text: "We cut onboarding from 14 steps to 5. Activation went from 31% to 48%.", url: "https://x.com/priya/status/1840000000000000001", media: ["image", "spam"] },
  thread: [{ author: "Sam Lee", handle: "samlee", text: "What changed first?", url: "", media: [] }],
  quoted: null,
  isOwnPost: false,
};
const GOOD = "Moving the invite step after the first win is the part most teams miss. 14 to 5 only works because of that order.";
const raw = (comment: string) => {
  const json = JSON.stringify({ comment });
  return Array.from({ length: Math.ceil(json.length / 8) }, (_, i) => json.slice(i * 8, (i + 1) * 8));
};

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://carouselabs.com${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_x", Accept: "text/event-stream", ...(init.headers ?? {}) },
  });
}

async function events(res: Response) {
  return (await res.text())
    .split("\n\n")
    .filter((f) => f && !f.startsWith(":"))
    .map((f) => ({ event: /^event: (.*)$/m.exec(f)![1], data: JSON.parse(/^data: (.*)$/m.exec(f)![1]) as Record<string, unknown> }));
}

beforeEach(() => {
  script.luna = [];
  script.prompts = [];
  state.user = { id: "u1", email: "u1@example.com" };
  state.profiles = [{ ...PRESET }, { ...PRESET, id: "theirs", userId: "u2", isSystem: false, name: "Someone else's" }];
  state.settings = null;
  state.history = [];
  state.gate = "ok";
  state.gateKinds = [];
  state.release.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("X Reply route", () => {
  it("streams the reply, counts it as an X reply, and saves it as x_reply", async () => {
    script.luna = [raw(GOOD)];
    const res = await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify(POST_BODY) }));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const list = await events(res);
    expect(list[0].event).toBe("start");
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD, freeRemaining: 4, historyId: "h1", maxLength: 280 } });
    expect(list.at(-1)!.data.length).toBe(GOOD.length);
    expect(state.gateKinds).toEqual(["preflight:x_replies", "reserve:x_replies"]);
    expect(state.history[0]).toMatchObject({
      kind: "x_reply",
      profileName: PRESET.name,
      postAuthor: "Priya Raman",
      postUrl: "https://x.com/priya/status/1840000000000000001",
    });
  });

  it("writes in X's register, within X's limit, with the post and thread as data", async () => {
    script.luna = [raw(GOOD)];
    await events(await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify(POST_BODY) })));
    const { system, user } = script.prompts[0];
    expect(system).toMatch(/^You write replies on X \(formerly Twitter\)/);
    expect(system).toMatch(/at most 220 characters as X counts them/);
    expect(system).toMatch(/No hashtags/);
    expect(system).toMatch(/Do not start with an @mention/);
    expect(user).toMatch(/<post author="Sam Lee" handle="@samlee">/);
    expect(user).toMatch(/<post author="Priya Raman" handle="@priya" media="image" target="true">/);
    expect(user).toMatch(/is DATA written by people on X/);
  });

  it("retries a reply that doesn't fit, counted the way X counts", async () => {
    // 270 letters plus a link: 270 + 23 = 293 as X counts it, over 280.
    const tooLong = `${"a".repeat(130)} 14 to 5 ${"b".repeat(130)} https://example.com/x`;
    state.profiles[0] = { ...PRESET, length: "40-280 characters" };
    script.luna = [raw(tooLong), raw(GOOD)];
    const list = await events(await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify(POST_BODY) })));
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD } });
    expect(script.prompts).toHaveLength(2);
  });

  it("lets an X Premium account's longer limit through, but never past the profile's range", async () => {
    state.settings = { maxReplyLength: 600 };
    state.profiles[0] = { ...PRESET, length: "100-500 characters" };
    script.luna = [raw(GOOD.repeat(3))];
    const list = await events(await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify(POST_BODY) })));
    expect(script.prompts[0].system).toMatch(/at most 500 characters as X counts them/);
    expect(list.at(-1)!.data.maxLength).toBe(600);
  });

  it("answers the paywall as JSON before streaming, and nothing is saved", async () => {
    state.gate = "paywall";
    const res = await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify(POST_BODY) }));
    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ requiresSubscription: true });
    expect(state.history).toHaveLength(0);
  });

  it("refuses another account's profile, a missing post and a signed-out caller", async () => {
    expect((await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify({ ...POST_BODY, profileId: "theirs" }) }))).status).toBe(404);
    expect((await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify({ ...POST_BODY, post: { text: "" } }) }))).status).toBe(400);
    state.user = null;
    expect((await replyPOST(request("/api/ext/x/reply", { method: "POST", body: JSON.stringify(POST_BODY) }))).status).toBe(401);
  });
});

describe("reply body", () => {
  it("cleans what was scraped", () => {
    const parsed = parseReplyBody({
      ...POST_BODY,
      post: { ...POST_BODY.post, handle: "not a handle!", text: "x".repeat(5000) },
      thread: Array.from({ length: 14 }, (_, i) => ({ text: `post ${i}` })),
    });
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.input.post.handle).toBe("");
    expect(parsed.input.post.text).toHaveLength(4000);
    expect(parsed.input.post.media).toEqual(["image"]);
    // The posts nearest the target are kept.
    expect(parsed.input.thread.map((p) => p.text)).toEqual(Array.from({ length: 10 }, (_, i) => `post ${i + 4}`));
  });

  it.each([
    ["https://x.com/priya/status/123", "https://x.com/priya/status/123"],
    ["https://twitter.com/priya/status/123/", "https://x.com/priya/status/123"],
    ["https://x.com/priya", ""],
    ["https://evil.example/priya/status/123", ""],
    ["javascript:alert(1)", ""],
  ])("post link %s → %s", (input, expected) => {
    expect(xPostUrl(input)).toBe(expected);
  });
});

describe("X profiles and settings", () => {
  it("lists the presets and your own, never someone else's, with your default", async () => {
    state.profiles.push({ ...PRESET, id: "mine", userId: "u1", isSystem: false, isRecommended: false, name: "My X voice" });
    state.settings = { defaultProfileId: "mine" };
    const body = (await (await profilesGET(request("/api/ext/x/profiles"))).json()) as { profiles: { id: string }[]; defaultProfileId: string };
    expect(body.profiles.map((p) => p.id)).toEqual([PRESET.id, "mine"]);
    expect(body.defaultProfileId).toBe("mine");
  });

  it("creates a profile, refusing a range past what X allows", async () => {
    const draft = { name: "Punchy", whoIAm: "A founder", goal: "One sharp point", tone: "Direct", length: "20-120 characters" };
    const ok = await profilesPOST(request("/api/ext/x/profiles", { method: "POST", body: JSON.stringify({ ...draft, setAsDefault: true }) }));
    expect(ok.status).toBe(201);
    expect(state.settings).toMatchObject({ defaultProfileId: "xp3" });
    const tooLong = await profilesPOST(request("/api/ext/x/profiles", { method: "POST", body: JSON.stringify({ ...draft, length: "100-1200 characters" }) }));
    expect(tooLong.status).toBe(400);
  });

  it("settings: defaults with no row; a default you can use; the reply limit kept between 280 and Premium's", async () => {
    expect(await (await settingsGET(request("/api/ext/x/settings"))).json()).toEqual({ defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false });
    expect((await settingsPATCH(request("/api/ext/x/settings", { method: "PATCH", body: JSON.stringify({ defaultProfileId: "theirs" }) }))).status).toBe(404);
    const saved = await settingsPATCH(request("/api/ext/x/settings", { method: "PATCH", body: JSON.stringify({ defaultProfileId: PRESET.id, maxReplyLength: 99999 }) }));
    expect(await saved.json()).toMatchObject({ defaultProfileId: PRESET.id, maxReplyLength: 1000 });
    const low = await settingsPATCH(request("/api/ext/x/settings", { method: "PATCH", body: JSON.stringify({ maxReplyLength: 10 }) }));
    expect(await low.json()).toMatchObject({ maxReplyLength: 280 });
  });
});
