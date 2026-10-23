// @vitest-environment node
// CarouseLabs Engage for Reddit on the server: the comment route (streamed,
// Reddit profiles, "reddit_comments" against Reddit's own plan, the
// subreddit's rules in the prompt, the Reddit-only AI tells retried, history
// as reddit_comment) and the Reddit profiles and settings routes. The models
// are scripted and Prisma, the token lookup and the gate are stood in for in
// memory, as in xServer.server.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    redditProfile: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.profiles.find((p) => matches(p, where)) ?? null),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.profiles.filter((p) => matches(p, where))),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `rp${state.profiles.length + 1}`, ...data };
        state.profiles.push(row);
        return row;
      }),
    },
    redditUserSettings: {
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
      findMany: vi.fn(async ({ where, take }: { where: Record<string, unknown>; take: number }) =>
        state.history
          .filter((row) => row.userId === where.userId && row.kind === where.kind)
          .reverse()
          .slice(0, take)
          .map((row) => ({ comment: row.comment })),
      ),
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
    return { ok: true, freeRemaining: 4, release: state.release };
  }),
}));

import { POST as commentPOST } from "../../../app/api/ext/reddit/comment/route";
import { GET as profilesGET, POST as profilesPOST } from "../../../app/api/ext/reddit/profiles/route";
import { GET as settingsGET, PATCH as settingsPATCH } from "../../../app/api/ext/reddit/settings/route";

const PRESET = {
  id: "sys-reddit-helpful", userId: null, name: "CarouseLabs — Reddit Helpful", whoIAm: "A regular Redditor who wants to help",
  goal: "Actually help", tone: "Friendly", length: "60-400 characters", emoji: "None", language: "English",
  alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true,
};
const COMMENT_URL = "https://www.reddit.com/r/startups/comments/p001/comment/c002/";
const BODY = {
  profileId: PRESET.id,
  subreddit: "r/startups",
  rules: [{ title: "No self-promotion", text: "Don't link your own product." }],
  post: { title: "How do you price a first product?", author: "founder_jane", text: "We have ten users.", url: "https://www.reddit.com/r/startups/comments/p001/how_do_you_price/", flair: "Question", kind: "text" },
  replyTo: { author: "asker", text: "What did you charge at first?", url: COMMENT_URL },
  chain: [{ author: "top_user", text: "Charge more than you think.", url: "" }],
  isOwnPost: false,
}
const GOOD = "We started higher than felt comfortable and almost nobody pushed back. The ones who did weren't going to stay anyway.";
const raw = (comment: string) => {
  const json = JSON.stringify({ comment });
  return Array.from({ length: Math.ceil(json.length / 8) }, (_, i) => json.slice(i * 8, (i + 1) * 8));
};

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://carouselabs.com${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_r", Accept: "text/event-stream", ...(init.headers ?? {}) },
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
  state.gateKinds = [];
  state.release.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Reddit comment route", () => {
  it("streams the comment, counts it as a Reddit comment, and saves it as reddit_comment", async () => {
    script.luna = [raw(GOOD)];
    const res = await commentPOST(request("/api/ext/reddit/comment", { method: "POST", body: JSON.stringify(BODY) }));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const list = await events(res);
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD, freeRemaining: 4, historyId: "h1", maxLength: 400 } });
    expect(state.gateKinds).toEqual(["preflight:reddit_comments", "reserve:reddit_comments"]);
    expect(state.history[0]).toMatchObject({
      kind: "reddit_comment",
      profileName: PRESET.name,
      postAuthor: "u/asker",
      postUrl: COMMENT_URL,
      postSnippet: "What did you charge at first?",
    });
  });

  it("writes for Reddit, with the subreddit's rules, the post and the thread as data", async () => {
    script.luna = [raw(GOOD)];
    await events(await commentPOST(request("/api/ext/reddit/comment", { method: "POST", body: JSON.stringify(BODY) })));
    const { system, user } = script.prompts[0];
    expect(system).toMatch(/^You write Reddit comments for this person:/);
    expect(system).toMatch(/at most 400 characters/);
    expect(user).toContain('<rule title="No self-promotion">');
    expect(user).toMatch(/<comment author="u\/asker" target="true">/);
    expect(user).toContain("<title>How do you price a first product?</title>");
  });

  it("writes again a comment that sounds like AI on Reddit", async () => {
    script.luna = [raw(`Great question! ${GOOD}`), raw(GOOD)];
    const list = await events(await commentPOST(request("/api/ext/reddit/comment", { method: "POST", body: JSON.stringify(BODY) })));
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD } });
    expect(script.prompts).toHaveLength(2);
  });

  it("refuses someone else's profile and a request with no post, before using a generation", async () => {
    const theirs = await commentPOST(request("/api/ext/reddit/comment", { method: "POST", body: JSON.stringify({ ...BODY, profileId: "theirs" }) }));
    expect(theirs.status).toBe(404);
    const noPost = await commentPOST(request("/api/ext/reddit/comment", { method: "POST", body: JSON.stringify({ ...BODY, post: null }) }));
    expect(noPost.status).toBe(400);
    expect(state.gateKinds).not.toContain("reserve:reddit_comments");
  });

  it("needs a signed-in extension", async () => {
    state.user = null;
    const res = await commentPOST(request("/api/ext/reddit/comment", { method: "POST", body: JSON.stringify(BODY) }));
    expect(res.status).toBe(401);
  });
});

describe("Reddit profiles and settings", () => {
  it("lists the presets and the user's own, never someone else's", async () => {
    const res = await profilesGET(request("/api/ext/reddit/profiles"));
    const body = (await res.json()) as { profiles: { id: string }[]; defaultProfileId: string | null };
    expect(body.profiles.map((p) => p.id)).toEqual([PRESET.id]);
    expect(body.defaultProfileId).toBeNull();
  });

  it("creates a profile, within Reddit's length, and can make it the default", async () => {
    const tooLong = await profilesPOST(
      request("/api/ext/reddit/profiles", { method: "POST", body: JSON.stringify({ ...PRESET, id: undefined, length: "100-3000 characters" }) }),
    );
    expect(tooLong.status).toBe(400);
    const res = await profilesPOST(
      request("/api/ext/reddit/profiles", {
        method: "POST",
        body: JSON.stringify({ name: "Mine", whoIAm: "A founder", goal: "Help", tone: "Plain", length: "50-300 characters", setAsDefault: true }),
      }),
    );
    expect(res.status).toBe(201);
    expect(state.settings).toMatchObject({ userId: "u1", defaultProfileId: "rp3" });
  });

  it("saves the default and the Insert button setting, and refuses a profile that isn't theirs", async () => {
    expect(await (await settingsGET(request("/api/ext/reddit/settings"))).json()).toEqual({ defaultProfileId: null, insertButtonHidden: false });
    const ok = await settingsPATCH(request("/api/ext/reddit/settings", { method: "PATCH", body: JSON.stringify({ defaultProfileId: PRESET.id, insertButtonHidden: true }) }));
    expect(await ok.json()).toEqual({ defaultProfileId: PRESET.id, insertButtonHidden: true });
    const theirs = await settingsPATCH(request("/api/ext/reddit/settings", { method: "PATCH", body: JSON.stringify({ defaultProfileId: "theirs" }) }));
    expect(theirs.status).toBe(404);
  });
});
