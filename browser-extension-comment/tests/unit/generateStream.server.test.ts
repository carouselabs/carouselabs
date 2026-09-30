// @vitest-environment node
// POST /api/ext/generate with the model clients scripted: what streams, in
// what order, and that streaming never weakens the guardrails — an invented
// figure is never shown, a discarded draft is announced, the final event is
// what the non-streaming JSON response would have returned, and every check
// before the model keeps its JSON status code. Prisma, the token lookup, the
// daily limit and the free-use gate are stood in for in memory; see
// extensionPaywall.server.test.ts for how the backend's "@/…" imports resolve.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

type Step = { chunks?: string[]; error?: { status: number; message: string }; failAfter?: number };

const script = vi.hoisted(() => ({
  luna: [] as Step[],
  haiku: [] as Step[],
  lunaCalls: [] as { body: Record<string, unknown>; consumed: number }[],
  haikuCalls: [] as { body: Record<string, unknown>; consumed: number }[],
}));

// Plays one scripted step as a streaming SDK response: chunk by chunk,
// honouring the abort signal the way the real SDKs do.
function play(
  step: Step | undefined,
  record: { consumed: number },
  signal: AbortSignal | undefined,
  wrap: (text: string) => unknown,
) {
  if (!step) throw new Error("test script ran out of model responses");
  if (step.error && step.failAfter === undefined) {
    throw Object.assign(new Error(step.error.message), { status: step.error.status });
  }
  return (async function* () {
    for (const [i, text] of (step.chunks ?? []).entries()) {
      if (signal?.aborted) throw Object.assign(new Error("Request was aborted."), { name: "AbortError" });
      if (step.failAfter !== undefined && i === step.failAfter) throw new Error("connection reset");
      record.consumed = i + 1;
      yield wrap(text);
      await Promise.resolve();
    }
  })();
}

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (body: Record<string, unknown>, opts?: { signal?: AbortSignal }) => {
          const record = { body, consumed: 0 };
          script.lunaCalls.push(record);
          return play(script.luna.shift(), record, opts?.signal, (content) => ({ choices: [{ delta: { content } }] }));
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async (body: Record<string, unknown>, opts?: { signal?: AbortSignal }) => {
        const record = { body, consumed: 0 };
        script.haikuCalls.push(record);
        return play(script.haiku.shift(), record, opts?.signal, (text) => ({
          type: "content_block_delta",
          delta: { type: "text_delta", text },
        }));
      },
    };
  },
}));

const state = vi.hoisted(() => ({
  user: { id: "u1", email: "u1@example.com" } as null | { id: string; email: string },
  profile: null as null | Record<string, unknown>,
  gate: "ok" as "ok" | "paywall",
  history: [] as Record<string, unknown>[],
  release: vi.fn(async () => {}),
}));

vi.mock("../../../lib/db", () => ({
  db: {
    commentProfile: { findFirst: vi.fn(async () => state.profile) },
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
}));
vi.mock("../../../lib/extDailyLimit", () => ({ extDailyLimitResponse: vi.fn(async () => null) }));
vi.mock("../../../lib/extAccess", () => ({
  reserveExtGeneration: vi.fn(async () =>
    state.gate === "ok"
      ? { ok: true, freeRemaining: 7, release: state.release }
      : { ok: false, response: NextResponse.json({ error: "Used up", requiresSubscription: true }, { status: 402 }) },
  ),
}));

import { POST } from "../../../app/api/ext/generate/route";
import { ANTI_FABRICATION_REMINDER } from "../../../lib/ai/prompts/commentPrompt";

const POST_TEXT = "We cut our onboarding from 14 steps to 5. Activation went from 31% to 48%.";

// Short (1-2 lines): 40-220 characters.
const PROFILE = {
  id: "p1",
  name: "Supportive Peer",
  whoIAm: "A peer",
  goal: "agrees",
  tone: "friendly",
  length: "Short (1-2 lines)",
  emoji: "None",
  language: "English",
  samples: [],
};

// A model response as it streams: the JSON the model writes, in small pieces.
const tokens = (comment: string, size = 5) => {
  const raw = JSON.stringify({ comment });
  return Array.from({ length: Math.ceil(raw.length / size) }, (_, i) => raw.slice(i * size, (i + 1) * size));
};

const GOOD = "Moving from 14 steps to 5 is the real story. Order beats count when people need a first win.";
const GOOD_2 = "The invite prompt after the first result is the detail worth copying here.";

function request(stream: boolean) {
  return new Request("https://carouselabs.com/api/ext/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer cl_cmt_test",
      ...(stream ? { Accept: "text/event-stream" } : {}),
    },
    body: JSON.stringify({ profileId: "p1", post: { author: "Priya", headline: "Growth", text: POST_TEXT } }),
  });
}

async function events(res: Response) {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((frame) => ({
      event: /^event: (.*)$/m.exec(frame)![1],
      data: JSON.parse(/^data: (.*)$/m.exec(frame)![1]) as Record<string, unknown>,
    }));
}

const texts = (list: { event: string; data: Record<string, unknown> }[]) =>
  list.filter((e) => e.event === "text").map((e) => e.data.text as string);

beforeEach(() => {
  script.luna = [];
  script.haiku = [];
  script.lunaCalls = [];
  script.haikuCalls = [];
  state.user = { id: "u1", email: "u1@example.com" };
  state.profile = PROFILE;
  state.gate = "ok";
  state.history = [];
  state.release.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("streaming Generate", () => {
  it("streams the comment as it is written, then a final event matching the JSON response", async () => {
    script.luna = [{ chunks: tokens(GOOD) }];
    const res = await POST(request(true));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const list = await events(res);

    expect(list[0].event).toBe("start");
    expect(list.at(-1)!.event).toBe("final");
    const shown = texts(list);
    expect(shown.length).toBeGreaterThan(5);
    // Only ever grows, word by word, into the final comment.
    shown.forEach((text, i) => {
      expect(GOOD.startsWith(text)).toBe(true);
      if (i > 0) expect(text.length).toBeGreaterThanOrEqual(shown[i - 1].length);
    });
    expect(list.at(-1)!.data).toMatchObject({ comment: GOOD, freeRemaining: 7, historyId: "h1" });
    expect(list.at(-1)!.data.timing).toMatchObject({ attempts: 1, model: "gpt-6-luna" });

    script.luna = [{ chunks: tokens(GOOD) }];
    const json = await (await POST(request(false))).json();
    expect(json).toEqual({ comment: GOOD, freeRemaining: 7, historyId: "h2" });
  });

  it("calls Luna with max_completion_tokens — max_tokens made every call fail over to Haiku", async () => {
    script.luna = [{ chunks: tokens(GOOD) }];
    await events(await POST(request(true)));
    expect(script.lunaCalls[0].body).toMatchObject({ model: "gpt-6-luna", max_completion_tokens: 1024, stream: true });
    expect(script.lunaCalls[0].body).not.toHaveProperty("max_tokens");
    expect(script.haikuCalls).toHaveLength(0);
    expect(state.history[0].model).toBe("gpt-6-luna");
  });

  it("never shows an invented figure: stops that attempt early and retries with the reminder", async () => {
    const invented = "Moving from 14 steps to 5 is huge, most teams see 40% more signups from exactly this change. Order matters.";
    script.luna = [{ chunks: tokens(invented, 3) }, { chunks: tokens(GOOD_2) }];

    const list = await events(await POST(request(true)));

    for (const text of texts(list)) expect(text).not.toContain("40");
    expect(list.map((e) => e.event)).toContain("retry");
    // Aborted at the figure, well before the model finished the sentence.
    expect(script.lunaCalls[0].consumed).toBeLessThan(tokens(invented, 3).length);
    const secondUser = (script.lunaCalls[1].body.messages as { content: string }[])[1].content;
    expect(secondUser).toContain(ANTI_FABRICATION_REMINDER);
    expect(list.at(-1)!.data.comment).toBe(GOOD_2);
  });

  it("announces a discarded draft, and the final event is authoritative when the guardrails fall back", async () => {
    const tooLong = `${GOOD} ${GOOD} ${GOOD}`; // over the 220-character Short limit
    const alsoTooLong = `${GOOD_2} ${GOOD_2} ${GOOD_2} ${GOOD_2}`;
    script.luna = [{ chunks: tokens(tooLong) }, { chunks: tokens(alsoTooLong) }];

    const list = await events(await POST(request(true)));
    const order = list.map((e) => e.event);

    expect(order.indexOf("retry")).toBeGreaterThan(order.indexOf("text"));
    expect(order.lastIndexOf("text")).toBeGreaterThan(order.indexOf("retry"));
    // Both drafts failed on length, so the first (held as the fallback) wins,
    // even though the second is what was on screen last.
    expect(list.at(-1)!.data.comment).toBe(tooLong);
  });

  it("falls back to Haiku when Luna errors, and records the model that actually wrote it", async () => {
    script.luna = [{ error: { status: 400, message: "Unsupported parameter" } }];
    script.haiku = [{ chunks: tokens(GOOD) }];

    const list = await events(await POST(request(true)));

    expect(list.at(-1)!.data).toMatchObject({ comment: GOOD });
    expect(list.at(-1)!.data.timing).toMatchObject({ model: "claude-haiku-4-5-20251001" });
    expect(state.history[0].model).toBe("claude-haiku-4-5-20251001");
  });

  it("clears Luna's partial text if it dies mid-stream, before Haiku starts over", async () => {
    script.luna = [{ chunks: tokens(GOOD), failAfter: 12 }];
    script.haiku = [{ chunks: tokens(GOOD_2) }];

    const shown = texts(await events(await POST(request(true))));
    const cleared = shown.indexOf("");

    expect(cleared).toBeGreaterThan(0);
    expect(shown.slice(0, cleared).every((t) => GOOD.startsWith(t))).toBe(true);
    expect(shown.slice(cleared + 1).every((t) => GOOD_2.startsWith(t))).toBe(true);
  });

  it("reports a failure as an error event, gives the free use back and saves nothing", async () => {
    script.luna = [{ chunks: tokens("") }, { chunks: tokens("") }];
    script.haiku = [{ chunks: [""] }, { chunks: [""] }];

    const list = await events(await POST(request(true)));

    expect(list.at(-1)).toMatchObject({ event: "error", data: { status: 502 } });
    expect(state.release).toHaveBeenCalledOnce();
    expect(state.history).toHaveLength(0);
  });

  it("answers every pre-model failure as JSON with its status code, stream requested or not", async () => {
    state.user = null;
    expect((await POST(request(true))).status).toBe(401);

    state.user = { id: "u1", email: "u1@example.com" };
    state.profile = null;
    expect((await POST(request(true))).status).toBe(404);

    state.profile = PROFILE;
    state.gate = "paywall";
    const paywalled = await POST(request(true));
    expect(paywalled.status).toBe(402);
    expect(await paywalled.json()).toMatchObject({ requiresSubscription: true });
    expect(script.lunaCalls).toHaveLength(0);
  });

  it("puts stage timings on the JSON response's Server-Timing header", async () => {
    script.luna = [{ chunks: tokens(GOOD) }];
    const res = await POST(request(false));
    expect(res.headers.get("server-timing")).toMatch(/auth;dur=\d+.*ai-ttft;dur=\d+.*ai;dur=\d+.*total;dur=\d+/);
  });
});
