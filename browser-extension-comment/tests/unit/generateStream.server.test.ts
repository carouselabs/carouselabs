// @vitest-environment node
// POST /api/ext/generate with the model clients scripted: what streams, in
// what order, and that streaming never weakens the guardrails — an invented
// figure is never shown, a discarded draft is announced, the final event is
// what the non-streaming JSON response would have returned, and every check
// before the model keeps its JSON status code. Prisma, the token lookup, the
// daily limit and the free-use gate are stood in for in memory; see
// extensionPaywall.server.test.ts for how the backend's "@/…" imports resolve.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// stallAfter: after that many chunks the stream goes quiet until aborted, as
// a stalled connection does. dripMs: a stream that never finishes, sending a
// space every dripMs (alive, but getting nowhere).
type Step = {
  chunks?: string[];
  error?: { status: number; message: string };
  failAfter?: number;
  stallAfter?: number;
  dripMs?: number;
  // Runs just after the last piece is sent: something happening at the very
  // moment the model finishes.
  afterLast?: () => void;
};

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
  const abortError = () => Object.assign(new Error("Request was aborted."), { name: "AbortError" });
  const stall = () =>
    new Promise<never>((_, reject) => {
      if (signal?.aborted) reject(abortError());
      signal?.addEventListener("abort", () => reject(abortError()), { once: true });
    });
  if (step.dripMs !== undefined) {
    const every = step.dripMs;
    return (async function* () {
      for (;;) {
        if (signal?.aborted) throw abortError();
        yield wrap(" ");
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, every);
          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(abortError());
            },
            { once: true },
          );
        });
      }
    })();
  }
  return (async function* () {
    const chunks = step.chunks ?? [];
    for (const [i, text] of chunks.entries()) {
      if (step.stallAfter === i) await stall();
      if (signal?.aborted) throw abortError();
      if (step.failAfter !== undefined && i === step.failAfter) throw new Error("connection reset");
      record.consumed = i + 1;
      yield wrap(text);
      await Promise.resolve();
    }
    if (step.stallAfter !== undefined && step.stallAfter >= chunks.length) await stall();
    step.afterLast?.();
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
// The access gate (lib/engage/gate.ts) has its own tests; here it either lets
// the request through or answers with the paywall's 402.
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async () => ({ response: null, loaded: null })),
  reserveEngageGeneration: vi.fn(async () =>
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

function request(stream: boolean, signal?: AbortSignal) {
  return new Request("https://carouselabs.com/api/ext/generate", {
    method: "POST",
    signal,
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
  return parseEvents(text);
}

// The stream's events, without its keep-alive comment lines.
function parseEvents(text: string) {
  return text
    .split("\n\n")
    .filter((frame) => frame && !frame.startsWith(":"))
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

describe("streaming Generate when a model stalls", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Reads the whole response while fake time moves on in 1s steps.
  async function readStalled(res: Response) {
    let text: string | null = null;
    const start = Date.now();
    void res.text().then((t) => (text = t));
    while (text === null && Date.now() - start < 120_000) await vi.advanceTimersByTimeAsync(1_000);
    return { text: text ?? "", ms: Date.now() - start };
  }

  it("drops a Luna stream that goes quiet and finishes with Haiku", async () => {
    vi.useFakeTimers();
    script.luna = [{ chunks: tokens(GOOD), stallAfter: 6 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const { text, ms } = await readStalled(await POST(request(true)));
    const list = parseEvents(text);
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD } });
    expect(list.at(-1)!.data.timing).toMatchObject({ model: "claude-haiku-4-5-20251001" });
    // What Luna showed was cleared before Haiku's text.
    expect(texts(list)).toContain("");
    expect(ms).toBeLessThanOrEqual(12_000);
  });

  it("hands a Luna that hasn't written a word in 4s to Haiku, instead of waiting 10s", async () => {
    vi.useFakeTimers();
    script.luna = [{ stallAfter: 0 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const { text, ms } = await readStalled(await POST(request(true)));
    expect(parseEvents(text).at(-1)).toMatchObject({ event: "final", data: { comment: GOOD } });
    expect(parseEvents(text).at(-1)!.data.timing).toMatchObject({ model: "claude-haiku-4-5-20251001" });
    expect(ms).toBeLessThanOrEqual(6_000);
  });

  it("controlled comparison: a Luna that says nothing costs over 10s under the old rule, under 6s now", async () => {
    vi.useFakeTimers();
    const silentLuna = async () => {
      script.luna = [{ stallAfter: 0 }];
      script.haiku = [{ chunks: tokens(GOOD) }];
      return readStalled(await POST(request(true)));
    };
    vi.stubEnv("ENGAGE_FIRST_TEXT_MS", "10000"); // the old 10s stream-idle hand-over
    const before = await silentLuna();
    vi.unstubAllEnvs();
    const after = await silentLuna();
    for (const run of [before, after]) {
      expect(parseEvents(run.text).at(-1)).toMatchObject({ event: "final", data: { comment: GOOD } });
    }
    expect(before.ms).toBeGreaterThanOrEqual(10_000);
    expect(after.ms).toBeGreaterThanOrEqual(4_000);
    expect(after.ms).toBeLessThan(6_000);
    process.stdout.write(`[controlled] silent Luna -> Haiku: old rule ${before.ms} ms, now ${after.ms} ms (simulated clock, 1s steps)
`);
  });

  it("the hand-over time can be set (ENGAGE_FIRST_TEXT_MS); a value out of range is ignored", async () => {
    vi.useFakeTimers();
    vi.stubEnv("ENGAGE_FIRST_TEXT_MS", "6000");
    script.luna = [{ stallAfter: 0 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const slower = await readStalled(await POST(request(true)));
    expect(parseEvents(slower.text).at(-1)!.data.timing).toMatchObject({ model: "claude-haiku-4-5-20251001" });
    expect(slower.ms).toBeGreaterThanOrEqual(6_000);
    expect(slower.ms).toBeLessThanOrEqual(8_000);

    vi.stubEnv("ENGAGE_FIRST_TEXT_MS", "50");
    script.luna = [{ stallAfter: 0 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const ignored = await readStalled(await POST(request(true)));
    expect(ignored.ms).toBeGreaterThanOrEqual(4_000);
    expect(ignored.ms).toBeLessThanOrEqual(6_000);
    vi.unstubAllEnvs();
  });

  it("an empty first piece (no words yet) doesn't count as Luna having started", async () => {
    vi.useFakeTimers();
    script.luna = [{ chunks: ["", ...tokens(GOOD)], stallAfter: 1 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const { text, ms } = await readStalled(await POST(request(true)));
    expect(parseEvents(text).at(-1)!.data.timing).toMatchObject({ model: "claude-haiku-4-5-20251001" });
    expect(ms).toBeLessThanOrEqual(6_000);
  });

  it("keeps the connection alive while the models are quiet, then ends with an error, not silence", async () => {
    vi.useFakeTimers();
    script.luna = [{ stallAfter: 0 }, { stallAfter: 0 }];
    script.haiku = [{ stallAfter: 0 }, { stallAfter: 0 }];
    const { text, ms } = await readStalled(await POST(request(true)));

    // A keep-alive at least every 8s, so the panel knows the server is there.
    const keepAlives = text.split("\n\n").filter((frame) => frame.startsWith(":")).length;
    expect(keepAlives).toBeGreaterThanOrEqual(Math.floor(ms / 8_000) - 1);
    const list = parseEvents(text);
    expect(list.at(-1)).toMatchObject({ event: "error", data: { status: 502 } });
    // Within the 40s budget (plus the last call's own limit), never minutes.
    expect(ms).toBeLessThanOrEqual(42_000);
    expect(state.history).toHaveLength(0);
    expect(state.release).toHaveBeenCalled();
  });

  it("stops models that keep trickling without finishing once the 40s budget is spent", async () => {
    vi.useFakeTimers();
    script.luna = [{ dripMs: 5_000 }, { dripMs: 5_000 }];
    script.haiku = [{ dripMs: 5_000 }, { dripMs: 5_000 }];
    const { text, ms } = await readStalled(await POST(request(true)));
    expect(parseEvents(text).at(-1)).toMatchObject({ event: "error", data: { status: 502 } });
    // Each call alone is allowed 15-20s; together they must stop at the budget.
    expect(ms).toBeLessThanOrEqual(42_000);
  });
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

// A clean comment of about `n` characters, sourced from the post (no figures
// of its own), for the length checks.
function commentOf(n: number) {
  const words = "Putting the invite step after the first real win is the part most teams skip when they rebuild onboarding ";
  return `${words.repeat(Math.ceil(n / words.length)).slice(0, n - 1).trimEnd()}.`;
}

describe("comments a little off the profile's length", () => {
  it("keeps one a few characters past a rough length bucket instead of writing it again", async () => {
    const near = commentOf(228); // "Short (1-2 lines)" is 40-220
    expect(near.length).toBeGreaterThan(220);
    script.luna = [{ chunks: tokens(near) }];
    const list = await events(await POST(request(true)));
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: near } });
    expect(script.lunaCalls).toHaveLength(1);
  });

  it("still writes again one that is far off the bucket", async () => {
    script.luna = [{ chunks: tokens(commentOf(300)) }, { chunks: tokens(GOOD) }];
    const list = await events(await POST(request(true)));
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD } });
    expect(script.lunaCalls).toHaveLength(2);
  });

  it("holds an explicit character range exactly: the profile states it as a limit", async () => {
    state.profile = { ...PROFILE, length: "100-220 characters" };
    const inRange = commentOf(160);
    script.luna = [{ chunks: tokens(commentOf(228)) }, { chunks: tokens(inRange) }];
    const list = await events(await POST(request(true)));
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: inRange } });
    expect(script.lunaCalls).toHaveLength(2);
  });
});

describe("when the panel stops listening (Stop, Regenerate, a new post, panel closed)", () => {
  it("stops the model, saves nothing and gives the free use back, instead of finishing a comment nobody sees", async () => {
    script.luna = [{ chunks: tokens(GOOD), stallAfter: 6 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const res = await POST(request(true));
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let seen = "";
    // Until the first words arrive, then the panel goes away.
    while (!seen.includes("event: text")) seen += decoder.decode((await reader.read()).value);
    await reader.cancel();

    await vi.waitFor(() => expect(state.release).toHaveBeenCalledOnce());
    expect(state.history).toHaveLength(0);
    // Luna was cut off, and no second model or attempt was started.
    expect(script.haikuCalls).toHaveLength(0);
    expect(script.lunaCalls).toHaveLength(1);
  });

  it("logs the panel's request id with the timing, so the two sides can be matched", async () => {
    script.luna = [{ chunks: tokens(GOOD) }];
    const req = request(true);
    req.headers.set("X-Engage-Request-Id", "5d1f3c2a-9b7e-4c1d-8f00-123456789abc");
    const list = await events(await POST(req));
    expect(list.at(-1)!.data.timing).toMatchObject({ requestId: "5d1f3c2a-9b7e-4c1d-8f00-123456789abc" });
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\[ext\/generate\] timing req=5d1f3c2a-9b7e-4c1d-8f00-123456789abc /));
  });

  it("ignores a request id that isn't one (anything could be sent in that header)", async () => {
    script.luna = [{ chunks: tokens(GOOD) }];
    const req = request(true);
    req.headers.set("X-Engage-Request-Id", "<script>alert(1)</script>");
    const list = await events(await POST(req));
    expect(list.at(-1)!.data.timing).toMatchObject({ requestId: null });
  });
});

// The panel leaving, as the server sees it: the request's signal aborts (what
// Vercel does with supportsCancellation, and Next's own server), and/or the
// response stream is cancelled. Charged only when the final comment reached
// a client still listening; given back (once) otherwise.
describe("cancellation and free-use accounting", () => {
  async function readAll(res: Response) {
    return parseEvents(await res.text());
  }

  it("Stop before any output: the model call is stopped, nothing saved, the free use given back once", async () => {
    script.luna = [{ stallAfter: 0 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const client = new AbortController();
    const res = await POST(request(true, client.signal));
    client.abort();
    await res.text().catch(() => "");
    await vi.waitFor(() => expect(state.release).toHaveBeenCalledOnce());
    expect(state.history).toHaveLength(0);
    expect(script.haikuCalls).toHaveLength(0);
  });

  it("Stop during streaming, reported twice (the request's abort and the stream's cancel): given back once", async () => {
    script.luna = [{ chunks: tokens(GOOD), stallAfter: 6 }];
    const client = new AbortController();
    const res = await POST(request(true, client.signal));
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let seen = "";
    while (!seen.includes("event: text")) seen += decoder.decode((await reader.read()).value);
    client.abort();
    await reader.cancel();
    client.abort();
    await vi.waitFor(() => expect(state.release).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.release).toHaveBeenCalledOnce();
    expect(state.history).toHaveLength(0);
  });

  it("Regenerate right after Stop: the stopped one is given back, the new one is saved and charged", async () => {
    script.luna = [{ chunks: tokens(GOOD), stallAfter: 3 }, { chunks: tokens(GOOD_2) }];
    const first = new AbortController();
    const stopped = POST(request(true, first.signal)).then((res) => res.text().catch(() => ""));
    await vi.waitFor(() => expect(script.lunaCalls).toHaveLength(1));
    first.abort();
    const list = await readAll(await POST(request(true)));
    await stopped;
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD_2 } });
    expect(state.release).toHaveBeenCalledOnce();
    expect(state.history.map((h) => h.comment)).toEqual([GOOD_2]);
  });

  it("the client leaving at the moment the comment finishes: not delivered, so not saved and given back", async () => {
    const client = new AbortController();
    script.luna = [{ chunks: tokens(GOOD), afterLast: () => client.abort() }];
    const res = await POST(request(true, client.signal));
    await res.text().catch(() => "");
    await vi.waitFor(() => expect(state.release).toHaveBeenCalledOnce());
    expect(state.history).toHaveLength(0);
  });

  it("closing the panel after the comment arrived changes nothing: saved, charged, never given back", async () => {
    script.luna = [{ chunks: tokens(GOOD) }];
    const client = new AbortController();
    const list = await readAll(await POST(request(true, client.signal)));
    expect(list.at(-1)).toMatchObject({ event: "final", data: { comment: GOOD } });
    client.abort();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.release).not.toHaveBeenCalled();
    expect(state.history).toHaveLength(1);
  });

  it("1.2.x's JSON request: leaving mid-generation stops the model and gives the free use back", async () => {
    script.luna = [{ chunks: tokens(GOOD), stallAfter: 3 }];
    script.haiku = [{ chunks: tokens(GOOD) }];
    const client = new AbortController();
    const pending = POST(request(false, client.signal));
    await vi.waitFor(() => expect(script.lunaCalls).toHaveLength(1));
    client.abort();
    expect((await pending).status).toBe(502);
    expect(state.release).toHaveBeenCalledOnce();
    expect(state.history).toHaveLength(0);
    expect(script.haikuCalls).toHaveLength(0);
  });
});
